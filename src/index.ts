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
import { buildVariables, applySnapshotToVariables } from './variables'
import { buildPresets } from './presets'

export interface LivefireConfig {
  host: string
  cmdPort: number
  feedbackPort: number
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

  /** Last-seen transport snapshot — drives Companion variables + feedbacks. */
  public state = {
    playhead: 0,
    playheadTotal: 0,
    playheadName: '',
    active: 0,
    remaining: 0,
    remainingLabel: '',
    countdownActive: false,
    cueStates: new Map<string, string>(),
    cueNames: new Map<string, string>(),
    cueTypes: new Map<string, string>(),
    cueCount: 0,
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
    await this.configUpdated(config)
  }

  async destroy(): Promise<void> {
    if (this.heartbeatTimer !== undefined) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = undefined
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
    } else if (address === '/livefire/cuecount') {
      this.state.cueCount = Number(args[0] ?? 0)
    } else if (address.startsWith('/livefire/cue/')) {
      // /livefire/cue/<number>/state | /name | /type
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
        // Een naam-update kan een cue_<n>_name én een fire_bank_<i>_name
        // raken (als deze cue binnen de huidige bank-range valt). De
        // `applySnapshotToVariables` hieronder herberekent beide series.
      } else if (field === 'type') {
        this.state.cueTypes.set(cueNumber, value)
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
