/**
 * Companion actions — these become Stream Deck button bindings. Each
 * action sends an OSC command to liveFire (or, for set_fire_bank_offset,
 * mutates a local module variable that drives the bank-fire presets).
 */
import type { CompanionActionDefinitions } from '@companion-module/base'
import { spawn } from 'child_process'
import * as path from 'path'

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
    launch_livefire: {
      name: 'Launch liveFire (start the app)',
      description:
        "Spawn the liveFire Python process. Uses the 'liveFire launch " +
        "command' field from the connection config. detached + unref() " +
        "zorgen dat liveFire blijft leven als Companion sluit, en de " +
        "singleton-lock vangt 'n dubbele start netjes op met een prompt.",
      options: [],
      callback: () => {
        const raw = String(self.cfg?.launchCommand ?? '').trim()
        if (!raw) {
          self.log('warn', 'launch_livefire: no command configured')
          return
        }
        // Simpele tokenizer die quoted segmenten respecteert. Genoeg voor
        // typische Windows-paden zoals "C:\\livefire\\.venv\\Scripts\\
        // python.exe" -m livefire.
        const tokens: string[] = []
        const re = /"([^"]+)"|(\S+)/g
        let m: RegExpExecArray | null
        while ((m = re.exec(raw)) !== null) {
          tokens.push(m[1] ?? m[2])
        }
        if (tokens.length === 0) return
        const program = tokens[0]
        const args = tokens.slice(1)
        // Werkdirectory afleiden: bij een venv-layout (..\.venv\Scripts\
        // python.exe) zetten we cwd op de project-root zodat `python -m
        // livefire` het livefire-package vindt in sys.path. Companion
        // anders draait z'n cwd op z'n eigen install-dir, en dan crasht
        // Python met ModuleNotFoundError direct na 't openen.
        let cwd: string | undefined
        const programDir = path.dirname(program)
        const venvDir = path.dirname(programDir)
        if (
          /python(\.exe)?$/i.test(path.basename(program))
          && path.basename(programDir).toLowerCase() === 'scripts'
          && path.basename(venvDir).toLowerCase().includes('venv')
        ) {
          cwd = path.dirname(venvDir)
        }
        try {
          const child = spawn(program, args, {
            cwd,
            detached: true,
            stdio: 'ignore',
            windowsHide: false,
          })
          child.unref()
          self.log(
            'info',
            `launch_livefire spawned: ${program} ${args.join(' ')}` +
            (cwd ? ` (cwd=${cwd})` : ''),
          )
        } catch (e) {
          self.log('error', `launch_livefire failed: ${e}`)
        }
      },
    },
    save_workspace: {
      name: 'Save workspace',
      description:
        "Save liveFire's open workspace. If the workspace has no path " +
        '(never saved), liveFire will open its Save-As dialog. Triggers ' +
        'a 1.5 s "SAVED" flash on this Stream Deck button.',
      options: [],
      callback: () => {
        self.osc?.send('/livefire/save')
        // Optimistische UI-flash: we zetten de feedback-state lokaal aan,
        // dwingen 'n re-render, en clearen 'm na 1.5 s. liveFire's eigen
        // dirty=0-push komt 100 ms later vanzelf, dus de tile gaat netjes
        // van amber → groen-flash → grijs-clean.
        self.state.lastSaveActionMs = Date.now()
        self.checkFeedbacks('recently_saved')
        setTimeout(() => self.checkFeedbacks('recently_saved'), 1600)
      },
    },
    toggle_showtime: {
      name: 'Toggle showtime-lock',
      description:
        "Flip liveFire's showtime-lock on/off. When on, destructive UI " +
        'edits (drag-reorder, paste, delete, undo/redo) are blocked but ' +
        'GO and Stop All keep working.',
      options: [],
      callback: () => self.osc?.send('/livefire/showtime/toggle'),
    },
    set_showtime: {
      name: 'Set showtime-lock to value',
      description:
        "Force liveFire's showtime-lock to a specific state. Use this " +
        'in scripted scenarios where you always want the lock on (or off) ' +
        'rather than relying on its current state.',
      options: [
        {
          type: 'dropdown',
          id: 'value',
          label: 'Value',
          default: '1',
          choices: [
            { id: '1', label: 'On (lock the cuelist)' },
            { id: '0', label: 'Off (unlock)' },
          ],
        },
      ],
      callback: (event) => {
        const v = Number(event.options.value ?? 0)
        self.osc?.send('/livefire/showtime/set', [v])
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
