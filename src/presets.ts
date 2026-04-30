/**
 * Companion presets — kant-en-klare button-layouts.
 *
 * Categorieen:
 *  - Transport      — GO / Stop All / Playhead next/prev
 *  - Status         — countdown, active count, playhead, NOW PLAYING,
 *                     connection-status indicator
 *  - Fire by number — vaste 1..16 quick-fire (cue-naam op de knop,
 *                     groen als die speelt)
 *  - Fire by bank   — 1..16 bank-aware quick-fire die meeschuift met
 *                     `fire_bank_offset`; plus drie bank-switch-knoppen
 */
import {
  combineRgb,
  type CompanionPresetDefinitions,
} from '@companion-module/base'

const COLORS = {
  go: { bg: combineRgb(60, 160, 60), fg: combineRgb(255, 255, 255) },
  stop: { bg: combineRgb(200, 60, 60), fg: combineRgb(255, 255, 255) },
  nav: { bg: combineRgb(60, 60, 60), fg: combineRgb(255, 255, 255) },
  info: { bg: combineRgb(35, 35, 35), fg: combineRgb(225, 225, 225) },
  fire: { bg: combineRgb(60, 162, 230), fg: combineRgb(255, 255, 255) },
  fireRunning: { bg: combineRgb(60, 160, 60), fg: combineRgb(255, 255, 255) },
  bank: { bg: combineRgb(80, 50, 130), fg: combineRgb(255, 255, 255) },
  bankActive: { bg: combineRgb(220, 130, 30), fg: combineRgb(0, 0, 0) },
  connected: { bg: combineRgb(40, 120, 40), fg: combineRgb(255, 255, 255) },
  disconnected: { bg: combineRgb(160, 40, 40), fg: combineRgb(255, 255, 255) },
}

export function buildPresets(): CompanionPresetDefinitions {
  const presets: CompanionPresetDefinitions = {}

  // ---- Transport --------------------------------------------------------

  presets['go'] = {
    type: 'button',
    category: 'Transport',
    name: 'GO',
    style: { text: 'GO', size: '24', bgcolor: COLORS.go.bg, color: COLORS.go.fg },
    steps: [{ down: [{ actionId: 'go', options: {} }], up: [] }],
    feedbacks: [],
  }

  presets['stop_all'] = {
    type: 'button',
    category: 'Transport',
    name: 'Stop All',
    style: { text: 'STOP\\nALL', size: '14', bgcolor: COLORS.stop.bg, color: COLORS.stop.fg },
    steps: [{ down: [{ actionId: 'stop_all', options: {} }], up: [] }],
    feedbacks: [],
  }

  presets['playhead_next'] = {
    type: 'button',
    category: 'Transport',
    name: 'Playhead next',
    style: { text: 'NEXT\\n▼', size: '14', bgcolor: COLORS.nav.bg, color: COLORS.nav.fg },
    steps: [{ down: [{ actionId: 'playhead_next', options: {} }], up: [] }],
    feedbacks: [],
  }

  presets['playhead_prev'] = {
    type: 'button',
    category: 'Transport',
    name: 'Playhead prev',
    style: { text: 'PREV\\n▲', size: '14', bgcolor: COLORS.nav.bg, color: COLORS.nav.fg },
    steps: [{ down: [{ actionId: 'playhead_prev', options: {} }], up: [] }],
    feedbacks: [],
  }

  // ---- Status -----------------------------------------------------------

  presets['now_playing'] = {
    type: 'button',
    category: 'Status',
    name: 'Now playing (name + countdown)',
    style: {
      // Twee regels: naam van de cue die de countdown drijft + de
      // resterende tijd. has_active-feedback laat hem groen lichten als
      // er iets speelt.
      text: '$(livefire:remaining_label)\\n$(livefire:remaining_formatted)',
      size: '14',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [
      {
        feedbackId: 'has_active',
        options: {},
        style: {
          bgcolor: combineRgb(40, 100, 60),
          color: combineRgb(255, 255, 255),
        },
      },
    ],
  }

  presets['remaining'] = {
    type: 'button',
    category: 'Status',
    name: 'Remaining time only',
    style: {
      text: '$(livefire:remaining_formatted)',
      size: '24',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [
      {
        feedbackId: 'countdown_active',
        options: {},
        style: {
          bgcolor: combineRgb(60, 60, 30),
          color: combineRgb(220, 130, 30),
        },
      },
    ],
  }

  // Drie-knops split-countdown: minutes | seconds | tenths. Sleep deze
  // drie naast elkaar voor een grote leesbare timer (size 'auto' = elk
  // getal vult de hele button) — handig tijdens shows waar de operator
  // vanaf 2-3m moet kunnen aflezen. Tenths telt vloeiend mee dankzij
  // de 100 ms feedback-tick van liveFire.
  const splitCountdownFeedback = [
    {
      feedbackId: 'countdown_active',
      options: {},
      style: {
        bgcolor: combineRgb(60, 60, 30),
        color: combineRgb(220, 130, 30),
      },
    },
  ]
  presets['remaining_split_min'] = {
    type: 'button',
    category: 'Status',
    name: 'Countdown — minutes (split tile 1/3)',
    style: {
      text: '$(livefire:remaining_min)',
      size: 'auto',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: splitCountdownFeedback,
  }
  presets['remaining_split_sec'] = {
    type: 'button',
    category: 'Status',
    name: 'Countdown — seconds (split tile 2/3)',
    style: {
      text: '$(livefire:remaining_sec)',
      size: 'auto',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: splitCountdownFeedback,
  }
  presets['remaining_split_tenths'] = {
    type: 'button',
    category: 'Status',
    name: 'Countdown — tenths (split tile 3/3)',
    style: {
      text: '$(livefire:remaining_tenths)',
      size: 'auto',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: splitCountdownFeedback,
  }

  // Elapsed-zijde: drie tegels die de oplopende tijd van de spelende
  // cue tonen. Zelfde structuur als remaining maar dan groen-getint
  // bij has_active (in plaats van oranje countdown_active) — visueel
  // onderscheid tussen "wat is gepasseerd" en "wat resteert".
  const splitElapsedFeedback = [
    {
      feedbackId: 'has_active',
      options: {},
      style: {
        bgcolor: combineRgb(40, 80, 50),
        color: combineRgb(180, 220, 180),
      },
    },
  ]
  presets['elapsed_split_min'] = {
    type: 'button',
    category: 'Status',
    name: 'Elapsed — minutes (split tile 1/3)',
    style: {
      text: '$(livefire:elapsed_min)',
      size: 'auto',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: splitElapsedFeedback,
  }
  presets['elapsed_split_sec'] = {
    type: 'button',
    category: 'Status',
    name: 'Elapsed — seconds (split tile 2/3)',
    style: {
      text: '$(livefire:elapsed_sec)',
      size: 'auto',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: splitElapsedFeedback,
  }
  presets['elapsed_split_tenths'] = {
    type: 'button',
    category: 'Status',
    name: 'Elapsed — tenths (split tile 3/3)',
    style: {
      text: '$(livefire:elapsed_tenths)',
      size: 'auto',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: splitElapsedFeedback,
  }

  presets['active_count'] = {
    type: 'button',
    category: 'Status',
    name: 'Active cue count',
    style: {
      text: 'Active\\n$(livefire:active)',
      size: '14',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [
      {
        feedbackId: 'has_active',
        options: {},
        style: {
          bgcolor: combineRgb(40, 100, 140),
          color: combineRgb(255, 255, 255),
        },
      },
    ],
  }

  presets['playhead_label'] = {
    type: 'button',
    category: 'Status',
    name: 'Playhead label',
    style: {
      text: '►$(livefire:playhead)\\n$(livefire:playhead_name)',
      size: '14',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [],
  }

  presets['standby'] = {
    type: 'button',
    category: 'Status',
    name: 'Standby (cue queued for next GO)',
    style: {
      // Toont de cue die op het playhead staat — d.w.z. de eerstvolgende
      // die met GO gaat starten. cue_color-feedback hieronder kleurt 'm
      // met de tag-kleur uit liveFire zodat de operator visueel ziet
      // wat er klaarstaat. STANDBY-tekst boven, cue-naam eronder.
      text: 'STANDBY\\n$(livefire:playhead_name)',
      size: '14',
      bgcolor: COLORS.info.bg,
      color: COLORS.info.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [
      {
        feedbackId: 'cue_color',
        options: { cue_number: '$(livefire:playhead_number)' },
      },
    ],
  }

  presets['launch_livefire'] = {
    type: 'button',
    category: 'Status',
    name: 'Launch liveFire',
    style: {
      // Default = paars-grijs "LAUNCH liveFire"; wanneer connected omgaat
      // naar groen 'LIVE'. Klikken terwijl liveFire al draait triggert
      // de singleton-lock prompt — geen schade aan de show.
      text: 'LAUNCH\\nliveFire',
      size: '14',
      bgcolor: combineRgb(80, 50, 130),
      color: combineRgb(255, 255, 255),
    },
    steps: [
      { down: [{ actionId: 'launch_livefire', options: {} }], up: [] },
    ],
    feedbacks: [
      {
        feedbackId: 'is_connected',
        options: {},
        style: {
          text: 'liveFire\\nLIVE',
          bgcolor: COLORS.connected.bg,
          color: COLORS.connected.fg,
        },
      },
    ],
  }

  presets['connection_status'] = {
    type: 'button',
    category: 'Status',
    name: 'liveFire connection status',
    style: {
      // Default = disconnected; is_connected-feedback overrides naar
      // connected-styling. Zo zie je in een oogopslag of de OSC-link
      // staat — onmisbaar bij showstart.
      text: 'liveFire\\nOFFLINE',
      size: '14',
      bgcolor: COLORS.disconnected.bg,
      color: COLORS.disconnected.fg,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [
      {
        feedbackId: 'is_connected',
        options: {},
        style: {
          text: 'liveFire\\nLIVE',
          bgcolor: COLORS.connected.bg,
          color: COLORS.connected.fg,
        },
      },
    ],
  }

  // ---- Homescreen status tiles -----------------------------------------

  presets['workspace_name'] = {
    type: 'button',
    category: 'Status',
    name: 'Workspace name + save-on-press',
    style: {
      // Naam staat boven, "*UNSAVED*" verschijnt eronder zodra dirty.
      // workspace_dirty-feedback overrided naar amber zodat de operator
      // 't ook visueel oppikt zonder de tekst te lezen. Drukken triggert
      // save_workspace en flash't 1.5 s "SAVED" via recently_saved.
      text: '$(livefire:workspace_name)',
      size: '14',
      bgcolor: combineRgb(35, 35, 35),
      color: combineRgb(225, 225, 225),
    },
    steps: [
      { down: [{ actionId: 'save_workspace', options: {} }], up: [] },
    ],
    feedbacks: [
      // Eerst dirty (amber UNSAVED), daarna recently_saved als laatste
      // override (groene SAVED-flash). Volgorde matters: latere feedback
      // wint visueel.
      {
        feedbackId: 'workspace_dirty',
        options: {},
        style: {
          text: '$(livefire:workspace_name)\\n*UNSAVED*',
          bgcolor: combineRgb(170, 110, 30),
          color: combineRgb(255, 255, 255),
        },
      },
      {
        feedbackId: 'recently_saved',
        options: {},
        style: {
          text: '$(livefire:workspace_name)\\nSAVED',
          bgcolor: combineRgb(40, 130, 60),
          color: combineRgb(255, 255, 255),
        },
      },
    ],
  }

  presets['showtime_indicator'] = {
    type: 'button',
    category: 'Status',
    name: 'Showtime-lock toggle / indicator',
    style: {
      // Default = grijs "EDIT MODE" (niet locked). Feedback overrided naar
      // groen + SHOW LOCK wanneer de operator showtime aanzet. Druk =
      // toggle (in liveFire's transport-bar zit ook een knop voor 't
      // zelfde, deze is z'n Stream Deck-zus).
      text: 'EDIT\\nMODE',
      size: '14',
      bgcolor: combineRgb(35, 35, 35),
      color: combineRgb(160, 160, 160),
    },
    steps: [
      { down: [{ actionId: 'toggle_showtime', options: {} }], up: [] },
    ],
    feedbacks: [
      {
        feedbackId: 'showtime_locked',
        options: {},
        style: {
          text: 'SHOW\\nLOCK',
          bgcolor: combineRgb(30, 110, 60),
          color: combineRgb(255, 255, 255),
        },
      },
    ],
  }

  presets['version_banner'] = {
    type: 'button',
    category: 'Status',
    name: 'Build / version banner',
    style: {
      // Twee regels: app + module-versie. Geen "lF"-prefix want kleine
      // l vs hoofdletter I is op het Stream Deck-LCD niet te onderscheiden.
      // Size 14 zodat beide regels los leesbaar zijn op 72px hoog.
      text: 'liveFire\\n$(livefire:livefire_version)\\n\\nmod $(livefire:module_version)',
      size: '7',
      bgcolor: combineRgb(20, 20, 20),
      color: combineRgb(180, 180, 180),
      alignment: 'center:center' as const,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [],
  }

  presets['surfaces_count'] = {
    type: 'button',
    category: 'Status',
    name: 'Surfaces connected (Companion internal)',
    style: {
      // Pakt Companion's eigen internal-variabele die het aantal
      // verbonden Stream Decks / Loupedecks / etc. bijhoudt. Werkt
      // dus ook als liveFire down is.
      text: 'SURF\\n$(internal:surfaces_connected)',
      size: '14',
      bgcolor: combineRgb(35, 35, 35),
      color: combineRgb(225, 225, 225),
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [],
  }

  presets['date'] = {
    type: 'button',
    category: 'Status',
    name: 'System date (matches the clock)',
    style: {
      // Companion internal: time_hms format. Voor datum gebruiken we
      // dow + day + maand-naam — operator-vriendelijke pijler.
      text: '$(internal:date_dow_str_short)\\n$(internal:date_day) $(internal:date_month_str_short)',
      size: '14',
      bgcolor: combineRgb(20, 20, 20),
      color: combineRgb(225, 225, 225),
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [],
  }

  // ---- Clock (HH : MM : SS over 8 knoppen) -----------------------------
  // Bedoeld voor de homescreen — zes digit-tiles + twee dubbele-punt-tiles.
  // Sleep ze in deze volgorde naast elkaar: H1 H2 : M1 M2 : S1 S2.
  // Variabelen worden door de module zelf gevoed op 2 Hz (zie index.ts);
  // geen liveFire-OSC nodig, dus draait ook als liveFire down is.
  const CLOCK_BG = combineRgb(20, 20, 20)
  const CLOCK_FG = combineRgb(255, 255, 255)
  const CLOCK_COLON_FG = combineRgb(160, 160, 160)
  const clockTile = (varName: string, label: string) => ({
    type: 'button' as const,
    category: 'Clock',
    name: label,
    style: {
      text: `$(livefire:${varName})`,
      size: 'auto' as const,
      bgcolor: CLOCK_BG,
      color: CLOCK_FG,
      alignment: 'center:center' as const,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [],
  })
  presets['clock_h1'] = clockTile('clock_h1', 'Clock — HH digit 1')
  presets['clock_h2'] = clockTile('clock_h2', 'Clock — HH digit 2')
  presets['clock_m1'] = clockTile('clock_m1', 'Clock — MM digit 1')
  presets['clock_m2'] = clockTile('clock_m2', 'Clock — MM digit 2')
  presets['clock_s1'] = clockTile('clock_s1', 'Clock — SS digit 1')
  presets['clock_s2'] = clockTile('clock_s2', 'Clock — SS digit 2')
  // De twee dubbele punten staan letterlijk in de tile-tekst (geen variabele).
  // Wat lichter qua kleur dan de digits zodat 't visueel scheidingsteken is.
  const clockColon = (key: string) => ({
    type: 'button' as const,
    category: 'Clock',
    name: 'Clock — colon separator',
    style: {
      text: ':',
      size: 'auto' as const,
      bgcolor: CLOCK_BG,
      color: CLOCK_COLON_FG,
      alignment: 'center:center' as const,
    },
    steps: [{ down: [], up: [] }],
    feedbacks: [],
  })
  presets['clock_colon_1'] = clockColon('clock_colon_1')
  presets['clock_colon_2'] = clockColon('clock_colon_2')

  // ---- Fire by number (vaste 1..16) ------------------------------------

  for (let n = 1; n <= 16; n++) {
    presets[`fire_${n}`] = {
      type: 'button',
      category: 'Fire by number',
      name: `Fire cue ${n}`,
      style: {
        // Volledige cue-naam, font auto-fit zodat 'ie de hele button
        // vult. Geen nummer-prefix — als de slot leeg is (cue bestaat
        // niet) blijft de button leeg, zichtbaar als ongebruikte slot.
        text: `$(livefire:cue_${n}_name)`,
        size: 'auto',
        bgcolor: COLORS.fire.bg,
        color: COLORS.fire.fg,
      },
      steps: [
        {
          down: [{ actionId: 'fire_by_number', options: { cue_number: String(n) } }],
          up: [],
        },
      ],
      feedbacks: [
        // Eerst cue_color (advanced feedback — callback returnt zelf de
        // style, geen `style`-key nodig op de preset-entry want anders
        // klaagt Companion's UI dat de override leeg is).
        {
          feedbackId: 'cue_color',
          options: { cue_number: String(n) },
        },
        {
          feedbackId: 'cue_state',
          options: { cue_number: String(n), state: 'running' },
          style: { bgcolor: COLORS.fireRunning.bg, color: COLORS.fireRunning.fg },
        },
      ],
    }
  }

  // ---- Fire by bank (scrollend 1..16, 17..32, 33..48, ...) -------------
  // Deze tiles vuren de cue waar `fire_bank_<i>` op dat moment naar
  // wijst — operator drukt op een vaste bank-knop, en die verandert
  // van betekenis als de bank-offset omgaat.

  for (let i = 1; i <= 16; i++) {
    presets[`bank_fire_${i}`] = {
      type: 'button',
      category: 'Fire by bank',
      name: `Bank slot ${i}`,
      style: {
        // Alleen de naam, auto-gefit op de button. Nummer haalt de
        // bank-positie uit fire_bank_${i} maar wordt niet getoond —
        // operator weet welke slot 'ie indrukt op basis van positie.
        text: `$(livefire:fire_bank_${i}_name)`,
        size: 'auto',
        bgcolor: COLORS.fire.bg,
        color: COLORS.fire.fg,
      },
      steps: [
        {
          down: [
            {
              actionId: 'fire_by_number',
              options: { cue_number: `$(livefire:fire_bank_${i})` },
            },
          ],
          up: [],
        },
      ],
      feedbacks: [
        // Per-cue color via de variable die de bank-positie naar 'n
        // cue-nummer resolved. Volgorde net als bij fire_${n}: kleur
        // eerst (advanced, returnt zelf de style), running-groen erna.
        {
          feedbackId: 'cue_color',
          options: { cue_number: `$(livefire:fire_bank_${i})` },
        },
        {
          feedbackId: 'cue_state',
          options: {
            cue_number: `$(livefire:fire_bank_${i})`,
            state: 'running',
          },
          style: { bgcolor: COLORS.fireRunning.bg, color: COLORS.fireRunning.fg },
        },
      ],
    }
  }

  // Bank-switch knoppen — vier standaard banks.
  const banks: Array<{ label: string; offset: number; key: string }> = [
    { label: 'Bank\\n1-16', offset: 0, key: 'bank_set_0' },
    { label: 'Bank\\n17-32', offset: 16, key: 'bank_set_16' },
    { label: 'Bank\\n33-48', offset: 32, key: 'bank_set_32' },
    { label: 'Bank\\n49-64', offset: 48, key: 'bank_set_48' },
  ]
  for (const { label, offset, key } of banks) {
    presets[key] = {
      type: 'button',
      category: 'Fire by bank',
      name: `Set bank to ${label.replace('\\n', ' ')}`,
      style: {
        text: label,
        size: '14',
        bgcolor: COLORS.bank.bg,
        color: COLORS.bank.fg,
      },
      steps: [
        {
          down: [{ actionId: 'set_fire_bank_offset', options: { offset } }],
          up: [],
        },
      ],
      feedbacks: [
        {
          feedbackId: 'fire_bank_at',
          options: { offset },
          style: {
            bgcolor: COLORS.bankActive.bg,
            color: COLORS.bankActive.fg,
          },
        },
      ],
    }
  }

  return presets
}
