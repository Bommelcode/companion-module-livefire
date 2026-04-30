/**
 * liveFire Companion module — main entry.
 *
 * Connects over OSC to a running liveFire app (host:port = liveFire's
 * OSC-input + a separate UDP listener for liveFire's feedback push).
 *
 * Architecture:
 *   - Outgoing commands → liveFire's OSC-input port (default 53000)
 *   - Incoming feedback ← liveFire's feedback push to a port we listen on
 *
 * The user configures both ports in the module's connection settings.
 */
import {
  InstanceBase,
  InstanceStatus,
  Regex,
  runEntrypoint,
  SomeCompanionConfigField,
} from '@companion-module/base'

import { LivefireOsc } from './osc'
import { buildActions } from './actions'
import { buildFeedbacks } from './feedbacks'
import {
  buildVariables, applySnapshotToVariables, updateClockVariables,
} from './variables'
import { buildPresets } from './presets'

export interface LivefireConfig {
  host: string
  cmdPort: number
  feedbackPort: number
  launchCommand: string
}

/** Hoe lang we wachten op een feedback-bericht voordat we besluiten dat
 *  liveFire weg is. liveFire pusht standaard 10×/s, dus 2 s is ruim
 *  buiten normale jitter — eerder triggeren geeft false positives, later
 *  triggeren laat de operator te lang in 't ongewisse. */
const HEARTBEAT_TIMEOUT_MS = 2000
const HEARTBEAT_CHECK_MS = 500

class LivefireInstance extends InstanceBase<LivefireConfig> {
  public osc: LivefireOsc | undefined
  private heartbeatTimer: ReturnType<typeof setInterval> | undefined
  /** 1 Hz tick die de clock_*-variabelen update voor de homescreen-klok
   *  (HH:MM:SS over 8 knoppen verdeeld). Geen relatie met liveFire — pure
   *  system-time, dus werkt ook als liveFire down is. */
  private clockTimer: ReturnType<typeof setInterval> | undefined
  /** Cached connection-config — InstanceBase exposeert this.config NIET
   *  als public property (in 1.10.0 tenminste), dus we cachen 'm zelf
   *  zodat action-callbacks (bv. launch_livefire) bij z'n velden kunnen.
   *  Wordt gevuld in configUpdated(). */
  public cfg: LivefireConfig | undefined

  /** Last-seen transport snapshot — drives Companion variables + feedbacks. */
  public state = {
    playhead: 0,
    playheadTotal: 0,
    playheadName: '',
    active: 0,
    remaining: 0,
    remainingLabel: '',
    countdownActive: false,
    elapsed: 0,
    cueStates: new Map<string, string>(),
    cueNames: new Map<string, string>(),
    cueTypes: new Map<string, string>(),
    cueColors: new Map<string, string>(),
    /** Cue-numbers in the order liveFire reports them. Reset on each
     *  /livefire/cuecount push (which marks the start of a full
     *  cuelist re-broadcast); appended-to as each /livefire/cue/<n>/name
     *  arrives. Used by the Standby tile to resolve playhead-index →
     *  cue-number → color. */
    cueListOrder: [] as string[],
    cueCount: 0,
    /** Workspace-meta — gevoed door /livefire/workspace_name + _dirty
     *  + showtime_locked + version. Bedoeld voor homescreen-status-tiles. */
    workspaceName: '',
    workspaceDirty: false,
    showtimeLocked: false,
    livefireVersion: '',
    /** Epoch-ms van de laatste save_workspace-actie. Drijft de
     *  recently_saved-feedback (1.5 s groene flash). 0 = nooit gesaved. */
    lastSaveActionMs: 0,
    /** True zodra we recent (binnen HEARTBEAT_TIMEOUT_MS) een feedback-
     *  push uit liveFire hebben gezien. UDP zelf is connectionless dus
     *  je kunt 't niet aan de socket zien — alleen aan de heartbeat. */
    connected: false,
    /** Epoch-ms van laatste binnenkomende OSC-message. 0 = nog nooit. */
    lastFeedbackMs: 0,
    /** Operator-controlled fire-bank offset. 0 = bank slots 1..16 mapping
     *  naar cues 1..16; 16 = slots → 17..32; etc. */
    fireBankOffset: 0,
  }

  async init(config: LivefireConfig): Promise<void> {
    this.updateStatus(InstanceStatus.Connecting)
    this.setActionDefinitions(buildActions(this))
    this.setFeedbackDefinitions(buildFeedbacks(this))
    this.setVariableDefinitions(buildVariables())
    this.setPresetDefinitions(buildPresets())
    // Heartbeat-watcher: detecteert wanneer liveFire weg is door langer
    // dan HEARTBEAT_TIMEOUT_MS niets te ontvangen. Wordt opgeruimd in
    // destroy().
    this.heartbeatTimer = setInterval(
      () => this.checkHeartbeat(),
      HEARTBEAT_CHECK_MS,
    )
    // Clock-tick: 500 ms zodat seconden visueel synchroon overspringen
    // (een 1000 ms-tick kan visueel een hele seconde achterlopen door
    // jitter in setInterval). updateClockVariables is idempotent.
    updateClockVariables(this)
    this.clockTimer = setInterval(() => updateClockVariables(this), 500)
    await this.configUpdated(config)
  }

  async destroy(): Promise<void> {
    if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
    }
    if (this.clockTimer !== undefined) {
      clearInterval(this.clockTimer)
      this.clockTimer = undefined
    }
    this.osc?.shutdown()
    this.osc = undefined
    this.state.connected = false
  }

  /** Wordt elke HEARTBEAT_CHECK_MS aangeroepen. Markeert de connectie
   *  als down zodra we te lang geen feedback-push meer hebben gezien. */
  private checkHeartbeat(): void {
    const last = this.state.lastFeedbackMs
    if (last === 0) return  // nog nooit feedback gehad — laat 'm OFFLINE
    const stale = Date.now() - last > HEARTBEAT_TIMEOUT_MS
    if (stale && this.state.connected) {
      this.state.connected = false
      this.checkFeedbacks('is_connected')
      applySnapshotToVariables(this)
    }
  }

  async configUpdated(config: LivefireConfig): Promise<void> {
    // Cache zelf — InstanceBase.config is niet publiekelijk leesbaar in
    // de huidige API-versie, dus action-callbacks moeten via self.cfg.
    this.cfg = config
    this.osc?.shutdown()
    this.osc = new LivefireOsc({
      host: config.host || '127.0.0.1',
      cmdPort: Number(config.cmdPort) || 53000,
      feedbackPort: Number(config.feedbackPort) || 12321,
      onMessage: (addr, args) => this.handleIncoming(addr, args),
      onStatus: (status, msg) => {
        this.updateStatus(status, msg)
        this.state.connected = status === InstanceStatus.Ok
        this.checkFeedbacks('is_connected')
        applySnapshotToVariables(this)
      },
      // Forward osc-level traces naar Companion's instance log zodat
      // operators in Settings → Log kunnen zien of buttons écht een
      // OSC-message versturen.
      log: (level, msg) => this.log(level, msg),
    })
    try {
      await this.osc.start()
      // Companion's instance-status mag al wel "Ok" — onze UDP-socket
      // is gebonden. Maar onze eigen state.connected blijft `false`
      // tot we daadwerkelijk een feedback-push uit liveFire krijgen.
      // Dat is wat de groene LIVE-indicator drijft.
      this.updateStatus(InstanceStatus.Ok)
      this.state.connected = false
      this.state.lastFeedbackMs = 0
    } catch (e) {
      this.updateStatus(InstanceStatus.ConnectionFailure, String(e))
      this.state.connected = false
    }
    this.checkFeedbacks('is_connected')
    applySnapshotToVariables(this)
  }

  /** Action-handler voor 'set_fire_bank_offset'. Direct in de instance
   *  zodat presets én custom triggers er gebruik van kunnen maken. */
  setFireBankOffset(offset: number): void {
    const clamped = Math.max(0, Math.floor(Number(offset) || 0))
    if (clamped === this.state.fireBankOffset) return
    this.state.fireBankOffset = clamped
    applySnapshotToVariables(this)
    this.checkFeedbacks('fire_bank_at', 'cue_state')
  }

  getConfigFields(): SomeCompanionConfigField[] {
    return [
      {
        type: 'static-text',
        id: 'info',
        width: 12,
        label: 'About',
        value:
          'Connect to a running liveFire instance. Enable ' +
          '"Push feedback to Companion" in liveFire ' +
          'Preferences → Companion and match the feedback port below.',
      },
      {
        type: 'textinput',
        id: 'host',
        label: 'liveFire host',
        width: 6,
        default: '127.0.0.1',
        regex: Regex.HOSTNAME,
      },
      {
        type: 'number',
        id: 'cmdPort',
        label: 'liveFire OSC-input port (commands)',
        tooltip: "Match liveFire's Preferences → OSC input → UDP port",
        width: 3,
        default: 53000,
        min: 1,
        max: 65535,
      },
      {
        type: 'number',
        id: 'feedbackPort',
        label: 'Feedback port (we listen here)',
        tooltip:
          "Match liveFire's Preferences → Companion → Port. " +
          'liveFire pushes its state to this port.',
        width: 3,
        default: 12321,
        min: 1,
        max: 65535,
      },
      {
        type: 'textinput',
        id: 'launchCommand',
        label: 'liveFire launch command',
        tooltip:
          'Used by the "Launch liveFire" action to start the app. ' +
          'Quoted paths met spaties zijn OK. Default = de standaard ' +
          'venv-path; pas aan als je elders hebt geïnstalleerd.',
        width: 12,
        default: 'C:\\livefire-0.4.1\\.venv\\Scripts\\python.exe -m livefire',
      },
    ]
  }

  // ---- incoming feedback handling -----------------------------------

  private handleIncoming(address: string, args: any[]): void {
    // Iedere binnenkomende OSC-message is een heartbeat. Markeer 'm
    // direct, en flip de connected-status naar true als we down waren —
    // dan licht de LIVE-indicator weer groen op zodra liveFire terug is.
    this.state.lastFeedbackMs = Date.now()
    if (!this.state.connected) {
      this.state.connected = true
      this.checkFeedbacks('is_connected')
      // Bij elke (re)connect vragen we liveFire om een verse cuelist-
      // snapshot. Dat fixt 'n re-import-scenario waarin de module geen
      // namen / kleuren heeft tot de operator een cue muteert. liveFire's
      // controller listent op /livefire/snapshot/please en trapt de
      // _broadcast_cuelist_snapshot af.
      this.osc?.send('/livefire/snapshot/please', [])
    }
    if (address === '/livefire/playhead') {
      this.state.playhead = Number(args[0] ?? 0)
      this.state.playheadTotal = Number(args[1] ?? 0)
      this.state.playheadName = String(args[2] ?? '')
    } else if (address === '/livefire/active') {
      this.state.active = Number(args[0] ?? 0)
    } else if (address === '/livefire/remaining') {
      this.state.remaining = Number(args[0] ?? 0)
    } else if (address === '/livefire/remaining/label') {
      this.state.remainingLabel = String(args[0] ?? '')
    } else if (address === '/livefire/countdown_active') {
      this.state.countdownActive = Number(args[0] ?? 0) !== 0
    } else if (address === '/livefire/elapsed') {
      this.state.elapsed = Number(args[0] ?? 0)
    } else if (address === '/livefire/workspace_name') {
      this.state.workspaceName = String(args[0] ?? '')
    } else if (address === '/livefire/workspace_dirty') {
      const dirty = Number(args[0] ?? 0) !== 0
      if (dirty !== this.state.workspaceDirty) {
        this.state.workspaceDirty = dirty
        this.checkFeedbacks('workspace_dirty')
      }
    } else if (address === '/livefire/showtime_locked') {
      const locked = Number(args[0] ?? 0) !== 0
      if (locked !== this.state.showtimeLocked) {
        this.state.showtimeLocked = locked
        this.checkFeedbacks('showtime_locked')
      }
    } else if (address === '/livefire/version') {
      this.state.livefireVersion = String(args[0] ?? '')
    } else if (address === '/livefire/cuecount') {
      this.state.cueCount = Number(args[0] ?? 0)
      // /cuecount markeert 't begin van een full cuelist-rebroadcast.
      // Alle per-cue maps wegen — verwijderde cues zouden anders met
      // hun oude naam/kleur/state op fire-buttons blijven staan, want
      // liveFire pusht alleen meta voor de ÓVERGEBLEVEN cues. Voor losse
      // inspector-updates wordt /cuecount NIET gepusht, dus dit pad
      // raakt 'm niet.
      this.state.cueListOrder = []
      this.state.cueNames.clear()
      this.state.cueTypes.clear()
      this.state.cueColors.clear()
      this.state.cueStates.clear()
      this.checkFeedbacks('cue_state', 'cue_color')
    } else if (address.startsWith('/livefire/cue/')) {
      // /livefire/cue/<number>/state | /name | /type | /color
      const rest = address.substring('/livefire/cue/'.length)
      const slash = rest.indexOf('/')
      if (slash <= 0) return
      const cueNumber = rest.substring(0, slash)
      const field = rest.substring(slash + 1)
      const value = String(args[0] ?? '')
      if (field === 'state') {
        this.state.cueStates.set(cueNumber, value)
        this.checkFeedbacks('cue_state')
      } else if (field === 'name') {
        this.state.cueNames.set(cueNumber, value)
        // Track de volgorde voor de Standby-tile (zie cueListOrder
        // commentaar). Append alleen als 'ie niet al voorkomt — voor
        // single-cue inspector-updates niet nodig om weer toe te voegen.
        if (!this.state.cueListOrder.includes(cueNumber)) {
          this.state.cueListOrder.push(cueNumber)
        }
        // Een naam-update kan een cue_<n>_name én een fire_bank_<i>_name
        // raken (als deze cue binnen de huidige bank-range valt). De
        // `applySnapshotToVariables` hieronder herberekent beide series.
      } else if (field === 'type') {
        this.state.cueTypes.set(cueNumber, value)
      } else if (field === 'color') {
        this.state.cueColors.set(cueNumber, value)
        // Color-update raakt cue_color feedback — repaint fire-buttons.
        this.checkFeedbacks('cue_color')
      }
    } else {
      return
    }
    applySnapshotToVariables(this)
    // Refresh feedbacks die afhangen van transport-level state.
    this.checkFeedbacks('countdown_active', 'has_active', 'playhead_at')
  }
}

runEntrypoint(LivefireInstance, [])

export default LivefireInstance
