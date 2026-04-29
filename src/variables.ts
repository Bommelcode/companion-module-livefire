/**
 * Companion variables — text values exposed for use in button text,
 * triggers, etc. liveFire's snapshot pushes drive these directly.
 *
 * MAX_CUE_NAMES bepaalt hoever de cue_<n>_name-serie loopt. We
 * declareren 'm statisch (Companion's variable-list moet bekend zijn
 * vóór runtime). 32 dekt typische Stream Deck XL setups (16-button
 * fire-grid + 1 bank scroll = max 32 zichtbaar tegelijk).
 */
import type { CompanionVariableDefinition } from '@companion-module/base'

export const MAX_CUE_NAMES = 32
export const FIRE_BANK_SIZE = 16

export function buildVariables(): CompanionVariableDefinition[] {
  const vars: CompanionVariableDefinition[] = [
    { variableId: 'playhead', name: 'Playhead index (0-based)' },
    { variableId: 'playhead_total', name: 'Total cue count' },
    { variableId: 'playhead_name', name: 'Name of the cue at the playhead' },
    { variableId: 'active', name: 'Number of currently running cues' },
    { variableId: 'remaining', name: 'Remaining seconds (raw)' },
    {
      variableId: 'remaining_formatted',
      name: 'Remaining time formatted (m:ss / s.s)',
    },
    {
      variableId: 'remaining_min',
      name: 'Remaining minutes (for split-display tile 1 of 3)',
    },
    {
      variableId: 'remaining_sec',
      name: 'Remaining seconds, zero-padded (for split-display tile 3 of 3)',
    },
    {
      variableId: 'remaining_label',
      name: 'Name of the cue driving the countdown (= now playing)',
    },
    { variableId: 'cuecount', name: 'Cuecount in the workspace' },
    {
      variableId: 'connected',
      name: 'OSC link to liveFire is up (1) or not (0)',
    },
    {
      variableId: 'fire_bank_offset',
      name: 'Current fire-bank offset (0 = cues 1..16, 16 = cues 17..32, ...)',
    },
  ]
  // Statische cue_<n>_name serie — Companion vereist dat we alle
  // variabelen vooraf bekend maken; runtime values worden gezet door
  // index.ts handleIncoming op iedere /livefire/cue/<n>/name push.
  for (let n = 1; n <= MAX_CUE_NAMES; n++) {
    vars.push({
      variableId: `cue_${n}_name`,
      name: `Name of cue with number "${n}"`,
    })
  }
  // Bank-derived: fire_bank_<i> (cue-nummer) + fire_bank_<i>_name (= naam
  // van die cue). i loopt 1..16, mapping = offset + i.
  for (let i = 1; i <= FIRE_BANK_SIZE; i++) {
    vars.push(
      {
        variableId: `fire_bank_${i}`,
        name: `Bank slot ${i} → resolves to cue number (offset+${i})`,
      },
      {
        variableId: `fire_bank_${i}_name`,
        name: `Bank slot ${i} → name of the cue it points at`,
      },
    )
  }
  return vars
}

export function applySnapshotToVariables(self: any): void {
  const remaining = Number(self.state.remaining ?? 0)
  // Split-display values voor de drie-knops countdown-tile. Bij count-up
  // (negatieve seconden, infinite-loop) zetten we een '+' op de min-tile
  // zodat de operator ziet dat 'ie optelt.
  const sign = remaining < 0 ? '+' : ''
  const absSec = Math.abs(remaining)
  const minutes = Math.floor(absSec / 60)
  const seconds = Math.floor(absSec % 60)
  const values: Record<string, string | number> = {
    playhead: self.state.playhead,
    playhead_total: self.state.playheadTotal,
    playhead_name: self.state.playheadName,
    active: self.state.active,
    remaining: remaining.toFixed(1),
    remaining_formatted: formatRemaining(remaining),
    remaining_min: `${sign}${minutes}`,
    remaining_sec: seconds.toString().padStart(2, '0'),
    remaining_label: self.state.remainingLabel,
    cuecount: self.state.cueCount,
    connected: self.state.connected ? 1 : 0,
    fire_bank_offset: self.state.fireBankOffset,
  }
  // Per-cue namen via de cueNames-map. Niet-bekende cues krijgen lege
  // string zodat de preset-text netjes blijft i.p.v. literal placeholder.
  for (let n = 1; n <= MAX_CUE_NAMES; n++) {
    values[`cue_${n}_name`] = self.state.cueNames.get(String(n)) ?? ''
  }
  // Bank-resolutie — pure rekenkundig op offset + cueNames-map.
  const offset = Number(self.state.fireBankOffset ?? 0)
  for (let i = 1; i <= FIRE_BANK_SIZE; i++) {
    const target = offset + i
    values[`fire_bank_${i}`] = String(target)
    values[`fire_bank_${i}_name`] = self.state.cueNames.get(String(target)) ?? ''
  }
  self.setVariableValues(values)
}

function formatRemaining(seconds: number): string {
  // liveFire pushes negative seconds for count-up (infinite-loop audio).
  // Use a leading '+' so operators can tell it apart on screen.
  const sign = seconds < 0 ? '+' : ''
  const s = Math.abs(seconds)
  if (s < 60) return `${sign}${s.toFixed(1)}s`
  const mins = Math.floor(s / 60)
  const secs = Math.floor(s % 60)
  return `${sign}${mins}:${secs.toString().padStart(2, '0')}`
}
