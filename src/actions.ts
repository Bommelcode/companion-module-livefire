/**
 * Companion actions — these become Stream Deck button bindings. Each
 * action sends an OSC command to liveFire (or, for set_fire_bank_offset,
 * mutates a local module variable that drives the bank-fire presets).
 */
import type { CompanionActionDefinitions } from '@companion-module/base'

export function buildActions(self: any): CompanionActionDefinitions {
  return {
    go: {
      name: 'GO',
      description: 'Fire the cue at the playhead and advance.',
      options: [],
      callback: () => self.osc?.send('/livefire/go'),
    },
    stop_all: {
      name: 'Stop All',
      description: 'Stop all currently running cues (panic).',
      options: [],
      callback: () => self.osc?.send('/livefire/stop_all'),
    },
    playhead_next: {
      name: 'Playhead: next',
      description: 'Move the playhead one cue down.',
      options: [],
      callback: () => self.osc?.send('/livefire/playhead/next'),
    },
    playhead_prev: {
      name: 'Playhead: previous',
      description: 'Move the playhead one cue up.',
      options: [],
      callback: () => self.osc?.send('/livefire/playhead/prev'),
    },
    playhead_goto: {
      name: 'Playhead: go to index',
      description: 'Set the playhead to a specific 0-based index.',
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
      callback: async (event) => {
        const idx = Number(event.options.index)
        self.osc?.send('/livefire/playhead/goto', [idx])
      },
    },
    fire_by_number: {
      name: 'Fire cue by number',
      description: "Fire any cue matching this cue_number (the cuelist's 'Nr' column).",
      options: [
        {
          type: 'textinput',
          id: 'cue_number',
          label: 'Cue number',
          default: '1',
          useVariables: true,
        },
      ],
      callback: async (event, ctx) => {
        const num = String(
          await ctx.parseVariablesInString(String(event.options.cue_number ?? '')),
        ).trim()
        if (!num) return
        self.osc?.send(`/livefire/fire/${num}`)
      },
    },
    set_fire_bank_offset: {
      name: 'Set fire-bank offset',
      description:
        'Shift the 16-button bank-fire grid to a different range. ' +
        'Use 0 for cues 1–16, 16 for 17–32, 32 for 33–48, etc.',
      options: [
        {
          type: 'number',
          id: 'offset',
          label: 'Offset',
          default: 0,
          min: 0,
          max: 9999,
        },
      ],
      callback: (event) => {
        const offset = Number(event.options.offset ?? 0)
        self.setFireBankOffset(offset)
      },
    },
  }
}
