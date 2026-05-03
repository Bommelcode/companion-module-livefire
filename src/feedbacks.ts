/**
 * Companion feedbacks — visual states on Stream Deck buttons.
 */
import {
  combineRgb,
  type CompanionFeedbackDefinitions,
} from '@companion-module/base'

export function buildFeedbacks(self: any): CompanionFeedbackDefinitions {
  return {
    cue_state: {
      type: 'boolean',
      name: 'Cue is in state',
      description: 'Light up when a cue is in the chosen state.',
      defaultStyle: {
        bgcolor: combineRgb(50, 130, 50),
        color: combineRgb(255, 255, 255),
      },
      options: [
        {
          type: 'textinput',
          id: 'cue_number',
          label: 'Cue number',
          default: '1',
          useVariables: true,
        },
        {
          type: 'dropdown',
          id: 'state',
          label: 'State',
          default: 'running',
          choices: [
            { id: 'idle', label: 'idle' },
            { id: 'running', label: 'running' },
            { id: 'finished', label: 'finished' },
          ],
        },
      ],
      callback: async (feedback, ctx) => {
        const cueNumber = String(
          await ctx.parseVariablesInString(String(feedback.options.cue_number ?? '')),
        ).trim()
        const wantState = String(feedback.options.state ?? 'running')
        return self.state.cueStates.get(cueNumber) === wantState
      },
    },
    countdown_active: {
      type: 'boolean',
      name: 'Countdown is active',
      description: 'Light up while a cue with finite duration is counting down.',
      defaultStyle: {
        bgcolor: combineRgb(220, 130, 30),
        color: combineRgb(0, 0, 0),
      },
      options: [],
      callback: () => self.state.countdownActive === true,
    },
    has_active: {
      type: 'boolean',
      name: 'Any cue running',
      description: 'Light up when active cue count > 0.',
      defaultStyle: {
        bgcolor: combineRgb(60, 162, 230),
        color: combineRgb(255, 255, 255),
      },
      options: [],
      callback: () => Number(self.state.active) > 0,
    },
    playhead_at: {
      type: 'boolean',
      name: 'Playhead at index',
      description: 'Light up when the playhead is at the given 0-based index.',
      defaultStyle: {
        bgcolor: combineRgb(60, 162, 230),
        color: combineRgb(255, 255, 255),
      },
      options: [
        {
          type: 'number',
          id: 'index',
          label: 'Index (0-based)',
          default: 0,
          min: 0,
          max: 9999,
        },
      ],
      callback: (feedback) =>
        Number(self.state.playhead) === Number(feedback.options.index),
    },
    is_connected: {
      type: 'boolean',
      name: 'OSC link is up',
      description:
        'Light up when the module has an active OSC connection to liveFire. ' +
        'Use the inverted style (red) for a "disconnected" warning button.',
      defaultStyle: {
        bgcolor: combineRgb(40, 120, 40),
        color: combineRgb(255, 255, 255),
      },
      options: [],
      callback: () => self.state.connected === true,
    },
    recently_saved: {
      // Korte (1.5 s) flash na een save_workspace-actie. Werkt puur op
      // module-state — geen liveFire-push nodig — want de operator wil
      // direct visuele bevestiging dat de save is verzonden, ongeacht
      // of liveFire 'm al heeft verwerkt. checkFeedbacks na 1.6 s clear't.
      type: 'boolean',
      name: 'Recently saved (1.5 s flash)',
      description:
        'Light up green for 1.5 s after the save_workspace action fires. ' +
        'Add this as the LAST feedback on the workspace-tile so it ' +
        'briefly shows SAVED and then falls back to the dirty-state.',
      defaultStyle: {
        bgcolor: combineRgb(40, 130, 60),
        color: combineRgb(255, 255, 255),
      },
      options: [],
      callback: () => {
        const last = Number(self.state.lastSaveActionMs ?? 0)
        if (last === 0) return false
        return Date.now() - last < 1500
      },
    },
    workspace_dirty: {
      type: 'boolean',
      name: 'Workspace has unsaved edits',
      description:
        'Light up the button when liveFire has unsaved workspace edits. ' +
        'Default = amber so the operator notices but it doesn\'t alarm.',
      defaultStyle: {
        bgcolor: combineRgb(170, 110, 30),
        color: combineRgb(255, 255, 255),
      },
      options: [],
      callback: () => self.state.workspaceDirty === true,
    },
    showtime_locked: {
      type: 'boolean',
      name: 'Showtime-lock is engaged',
      description:
        'Light up green when liveFire\'s showtime-lock is on (destructive ' +
        'edits blocked). Default style = subtle green; pair with a 🔒 glyph.',
      defaultStyle: {
        bgcolor: combineRgb(30, 110, 60),
        color: combineRgb(255, 255, 255),
      },
      options: [],
      callback: () => self.state.showtimeLocked === true,
    },
    cue_color: {
      // Advanced feedback — kleurt de button-bg met de cue's color-tag uit
      // liveFire (hex). Leeg of geen match = geen override (defaultStyle).
      type: 'advanced',
      name: 'Apply cue color tag (live)',
      description:
        "Color the button background with the cue's color tag from " +
        "liveFire. Leave the cue-number empty to read it from the " +
        'preset variable text (e.g. $(livefire:fire_bank_1)).',
      options: [
        {
          type: 'textinput',
          id: 'cue_number',
          label: 'Cue number (supports variables)',
          default: '$(livefire:fire_bank_1)',
          useVariables: true,
        },
      ],
      callback: async (feedback, ctx) => {
        const cueNumber = String(
          await ctx.parseVariablesInString(
            String(feedback.options.cue_number ?? ''),
          ),
        ).trim()
        if (!cueNumber) return {}
        const hex = self.state.cueColors.get(cueNumber)
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) return {}
        // Parse #RRGGBB. Companion's combineRgb wants three ints.
        const m = hex.match(/^#([0-9a-fA-F]{6})$/)
        if (!m) return {}
        const num = parseInt(m[1], 16)
        const r = (num >> 16) & 0xff
        const g = (num >> 8) & 0xff
        const b = num & 0xff
        // Auto-pick text color: dark cues get white text, light cues
        // get black. Standard luma formula.
        const luma = 0.299 * r + 0.587 * g + 0.114 * b
        const txt = luma < 140 ? combineRgb(255, 255, 255) : combineRgb(0, 0, 0)
        return {
          bgcolor: combineRgb(r, g, b),
          color: txt,
        }
      },
    },
    fire_bank_at: {
      type: 'boolean',
      name: 'Fire bank offset is at value',
      description:
        'Light up when the fire-bank offset matches the given value. Use ' +
        'this on the bank-switch buttons to highlight the active bank.',
      defaultStyle: {
        bgcolor: combineRgb(220, 130, 30),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'number',
          id: 'offset',
          label: 'Offset value',
          default: 0,
          min: 0,
          max: 9999,
        },
      ],
      callback: (feedback) =>
        Number(self.state.fireBankOffset ?? 0) === Number(feedback.options.offset),
    },

    // ---- Pause / Cart Wall (liveFire 0.5.2+) -------------------------

    paused_state: {
      type: 'boolean',
      name: 'Show is paused',
      description:
        'Light up when liveFire is in paused state (any cue frozen via ' +
        'Ctrl+Space or /livefire/pause). Pair with the pause_toggle ' +
        'action so one button toggles + reflects state.',
      defaultStyle: {
        bgcolor: combineRgb(255, 140, 0),
        color: combineRgb(0, 0, 0),
      },
      options: [],
      callback: () => self.state.paused === true,
    },
    cart_pad_running: {
      type: 'boolean',
      name: 'Cart pad is running',
      description:
        'Light up when the cue assigned to this cart pad is currently ' +
        'playing. Use to pulse the SFX-tile while the sound fires.',
      defaultStyle: {
        bgcolor: combineRgb(255, 255, 255),
        color: combineRgb(0, 0, 0),
      },
      options: [
        {
          type: 'number',
          id: 'pad',
          label: 'Pad number (1-24)',
          default: 1,
          min: 1,
          max: 24,
        },
      ],
      callback: (feedback) => {
        const pad = Number(feedback.options.pad ?? 1)
        return self.state.cartPadStates.get(pad) === 'running'
      },
    },
    cart_pad_unbound: {
      type: 'boolean',
      name: 'Cart pad is unbound',
      description:
        'True when there is no cue assigned to this pad slot in the active ' +
        'cart. Use a dim style so the operator sees the slot is empty ' +
        'without it disappearing.',
      defaultStyle: {
        bgcolor: combineRgb(20, 20, 20),
        color: combineRgb(80, 80, 80),
      },
      options: [
        {
          type: 'number',
          id: 'pad',
          label: 'Pad number (1-24)',
          default: 1,
          min: 1,
          max: 24,
        },
      ],
      callback: (feedback) => {
        const pad = Number(feedback.options.pad ?? 1)
        const label = self.state.cartPadLabels.get(pad)
        return !label || label === ''
      },
    },
    cart_pad_color: {
      // Advanced — kleurt de tile met de cue.color uit liveFire. Reuse de
      // luma-text-pick van cue_color zodat 't kleurschema consistent voelt.
      type: 'advanced',
      name: 'Cart pad — apply cue color',
      description:
        "Color the tile background with the cue color of the pad. Falls " +
        'back to a neutral dark color if the cue has no color set.',
      options: [
        {
          type: 'number',
          id: 'pad',
          label: 'Pad number (1-24)',
          default: 1,
          min: 1,
          max: 24,
        },
      ],
      callback: (feedback) => {
        const pad = Number(feedback.options.pad ?? 1)
        const hex = self.state.cartPadColors.get(pad)
        if (!hex || typeof hex !== 'string' || !hex.startsWith('#')) {
          return { bgcolor: combineRgb(30, 30, 30) }
        }
        const m = hex.match(/^#([0-9a-fA-F]{6})$/)
        if (!m) return { bgcolor: combineRgb(30, 30, 30) }
        const num = parseInt(m[1], 16)
        const r = (num >> 16) & 0xff
        const g = (num >> 8) & 0xff
        const b = num & 0xff
        const luma = 0.299 * r + 0.587 * g + 0.114 * b
        const txt = luma < 140 ? combineRgb(255, 255, 255) : combineRgb(0, 0, 0)
        return { bgcolor: combineRgb(r, g, b), color: txt }
      },
    },
  }
}
