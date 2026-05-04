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
export const CART_PAD_COUNT = 24
// Wordt mee-gebumpd met package.json bij elke release. Module gebruikt
// 'm voor de version-banner-tile op de homescreen.
const MODULE_VERSION = '0.3.1'

export function buildVariables(): CompanionVariableDefinition[] {
  const vars: CompanionVariableDefinition[] = [
    { variableId: 'playhead', name: 'Playhead index (0-based)' },
    { variableId: 'playhead_total', name: 'Total cue count' },
    { variableId: 'playhead_name', name: 'Name of the cue at the playhead' },
    {
      variableId: 'playhead_number',
      name: 'Cue-number (string) of the cue at the playhead — for Standby tile',
    },
    {
      variableId: 'playhead_color',
      name: 'Color tag (hex) of the cue at the playhead — for Standby tile',
    },
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
      name: 'Remaining seconds, zero-padded (for split-display tile 2 of 3)',
    },
    {
      variableId: 'remaining_tenths',
      name: 'Remaining tenths-of-a-second, single digit (split-display tile 3 of 3)',
    },
    { variableId: 'elapsed', name: 'Elapsed seconds of the playing cue (raw)' },
    {
      variableId: 'elapsed_formatted',
      name: 'Elapsed time formatted (m:ss / s.s)',
    },
    {
      variableId: 'elapsed_min',
      name: 'Elapsed minutes (split-display tile 1 of 3)',
    },
    {
      variableId: 'elapsed_sec',
      name: 'Elapsed seconds, zero-padded (split-display tile 2 of 3)',
    },
    {
      variableId: 'elapsed_tenths',
      name: 'Elapsed tenths-of-a-second, single digit (split-display tile 3 of 3)',
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
    // Workspace + showtime + version meta — voor homescreen-status-tiles.
    {
      variableId: 'workspace_name',
      name: 'Workspace name (basename, no extension)',
    },
    {
      variableId: 'workspace_dirty',
      name: 'Workspace has unsaved edits (1) or is clean (0)',
    },
    {
      variableId: 'showtime_locked',
      name: 'Showtime-lock is engaged in liveFire (1) or off (0)',
    },
    {
      variableId: 'livefire_version',
      name: 'liveFire APP_VERSION as reported on connect',
    },
    {
      variableId: 'module_version',
      name: 'This Companion module version (compile-time constant)',
    },
    // System-clock digits — gevoed door updateClockVariables() op 1 Hz.
    // Bedoeld voor de homescreen 'HH:MM:SS' weergave waar elke digit op
    // z'n eigen Stream Deck-knop staat (8 knoppen incl. twee dubbele punten).
    { variableId: 'clock_h1', name: 'System clock — first digit of hours (0..2)' },
    { variableId: 'clock_h2', name: 'System clock — second digit of hours (0..9)' },
    { variableId: 'clock_m1', name: 'System clock — first digit of minutes (0..5)' },
    { variableId: 'clock_m2', name: 'System clock — second digit of minutes (0..9)' },
    { variableId: 'clock_s1', name: 'System clock — first digit of seconds (0..5)' },
    { variableId: 'clock_s2', name: 'System clock — second digit of seconds (0..9)' },
    // Pause-state — voor de pause/resume-tile.
    {
      variableId: 'paused',
      name: 'Show is paused (1) or playing (0)',
    },
    // Cart Wall — actieve cart + pad-meta. liveFire pusht deze pas zodra
    // 't Cart Wall-venster ooit geopend is; voor die tijd zijn ze leeg.
    {
      variableId: 'cart_active_id',
      name: 'Active cart cue-id (uuid)',
    },
    {
      variableId: 'cart_active_name',
      name: 'Active cart name (e.g. "SFX Act 1")',
    },
    {
      variableId: 'cart_active_index',
      name: 'Active cart index in cart-list (0-based, -1 = none)',
    },
    {
      variableId: 'cart_count',
      name: 'Number of Cart cues in the workspace',
    },
    // Paging: voor carts met >24 pads.
    {
      variableId: 'cart_page_current',
      name: 'Active cart page (1-based)',
    },
    {
      variableId: 'cart_page_total',
      name: 'Total pages in active cart',
    },
  ]
  // Statische cue_<n>_name + cue_<n>_color serie — Companion vereist dat
  // we alle variabelen vooraf bekend maken; runtime values worden gezet
  // door index.ts handleIncoming op iedere /livefire/cue/<n>/name resp.
  // /color push. Color is een hex-string (b.v. "#c0392b") of leeg wanneer
  // de cue geen kleurtag heeft.
  for (let n = 1; n <= MAX_CUE_NAMES; n++) {
    vars.push(
      {
        variableId: `cue_${n}_name`,
        name: `Name of cue with number "${n}"`,
      },
      {
        variableId: `cue_${n}_color`,
        name: `Color tag (hex) of cue with number "${n}"`,
      },
    )
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
  // Cart-Wall pads: 24 slots × 4 velden (label / type / color / state).
  // Companion-tegels lezen deze direct via $(livefire:cart_pad_<n>_label)
  // etc. zodat 'n SFX-tegel automatisch z'n naam toont.
  for (let n = 1; n <= CART_PAD_COUNT; n++) {
    vars.push(
      {
        variableId: `cart_pad_${n}_label`,
        name: `Cart pad ${n} — label ("nr name")`,
      },
      {
        variableId: `cart_pad_${n}_type`,
        name: `Cart pad ${n} — cue type (Audio / Video / ...)`,
      },
      {
        variableId: `cart_pad_${n}_color`,
        name: `Cart pad ${n} — cue color (hex, e.g. "#3aa2e6")`,
      },
      {
        variableId: `cart_pad_${n}_state`,
        name: `Cart pad ${n} — runtime state (idle / running / finished)`,
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
  const tenths = Math.floor((absSec - Math.floor(absSec)) * 10) % 10
  // Elapsed-zijde — zelfde split-recept maar dan oplopend (geen sign).
  const elapsed = Number(self.state.elapsed ?? 0)
  const elapsedAbs = Math.abs(elapsed)
  const elMin = Math.floor(elapsedAbs / 60)
  const elSec = Math.floor(elapsedAbs % 60)
  const elTen = Math.floor((elapsedAbs - Math.floor(elapsedAbs)) * 10) % 10
  // Module-versie is een compile-time constant — gepakt uit
  // package.json zodat 't één plek is om te bumpen.
  const moduleVersion = MODULE_VERSION
  const values: Record<string, string | number> = {
    playhead: self.state.playhead,
    playhead_total: self.state.playheadTotal,
    playhead_name: self.state.playheadName,
    active: self.state.active,
    remaining: remaining.toFixed(1),
    remaining_formatted: formatRemaining(remaining),
    remaining_min: `${sign}${minutes}`,
    remaining_sec: seconds.toString().padStart(2, '0'),
    remaining_tenths: tenths.toString(),
    elapsed: elapsed.toFixed(1),
    elapsed_formatted: formatRemaining(elapsedAbs),  // hergebruikt format-fn
    elapsed_min: elMin.toString(),
    elapsed_sec: elSec.toString().padStart(2, '0'),
    elapsed_tenths: elTen.toString(),
    remaining_label: self.state.remainingLabel,
    cuecount: self.state.cueCount,
    connected: self.state.connected ? 1 : 0,
    fire_bank_offset: self.state.fireBankOffset,
    workspace_name: self.state.workspaceName ?? '',
    workspace_dirty: self.state.workspaceDirty ? 1 : 0,
    showtime_locked: self.state.showtimeLocked ? 1 : 0,
    livefire_version: self.state.livefireVersion ?? '',
    module_version: moduleVersion,
  }
  // Per-cue namen + kleur via de cueNames / cueColors-map. Niet-bekende
  // cues krijgen lege string zodat de preset-text netjes blijft i.p.v.
  // literal placeholder.
  for (let n = 1; n <= MAX_CUE_NAMES; n++) {
    values[`cue_${n}_name`] = self.state.cueNames.get(String(n)) ?? ''
    values[`cue_${n}_color`] = self.state.cueColors?.get(String(n)) ?? ''
  }
  // Standby-tile: cue-nummer + kleur die op het playhead staat. We
  // resolven via playhead-index → cuelist → cue_number, en dan via
  // cueColors-map. cueListOrder wordt door index.ts bijgehouden uit
  // de meta-pushes (zelfde volgorde als de cuelist in liveFire).
  const phIdx = Number(self.state.playhead ?? 0)
  const phNumber: string =
    self.state.cueListOrder?.[phIdx] ?? ''
  values['playhead_number'] = phNumber
  values['playhead_color'] = self.state.cueColors?.get(phNumber) ?? ''
  // Bank-resolutie — pure rekenkundig op offset + cueNames-map.
  const offset = Number(self.state.fireBankOffset ?? 0)
  for (let i = 1; i <= FIRE_BANK_SIZE; i++) {
    const target = offset + i
    values[`fire_bank_${i}`] = String(target)
    values[`fire_bank_${i}_name`] = self.state.cueNames.get(String(target)) ?? ''
  }
  // Pause-state + Cart Wall.
  values['paused'] = self.state.paused ? 1 : 0
  values['cart_active_id'] = self.state.cartActiveId ?? ''
  values['cart_active_name'] = self.state.cartActiveName ?? ''
  values['cart_active_index'] = String(
    self.state.cartActiveIndex ?? -1,
  )
  values['cart_count'] = String(self.state.cartCount ?? 0)
  values['cart_page_current'] = String(self.state.cartPageCurrent ?? 1)
  values['cart_page_total'] = String(self.state.cartPageTotal ?? 1)
  // Pad-meta — leeg slot blijft leeg, anders blijft 'n stale label
  // hangen wanneer de operator naar een cart switcht met minder pads.
  for (let n = 1; n <= CART_PAD_COUNT; n++) {
    values[`cart_pad_${n}_label`] = self.state.cartPadLabels?.get(n) ?? ''
    values[`cart_pad_${n}_type`] = self.state.cartPadTypes?.get(n) ?? ''
    values[`cart_pad_${n}_color`] = self.state.cartPadColors?.get(n) ?? ''
    values[`cart_pad_${n}_state`] = self.state.cartPadStates?.get(n) ?? 'idle'
  }
  self.setVariableValues(values)
}

/** Push de huidige systeemtijd-digits naar de clock_*-variabelen.
 *  Aangeroepen op 1 Hz vanuit index.ts. Gebruikt local time omdat de
 *  operator 'm in z'n eigen tijdzone afleest tijdens een show. */
export function updateClockVariables(self: any): void {
  const now = new Date()
  const hh = now.getHours().toString().padStart(2, '0')
  const mm = now.getMinutes().toString().padStart(2, '0')
  const ss = now.getSeconds().toString().padStart(2, '0')
  self.setVariableValues({
    clock_h1: hh[0],
    clock_h2: hh[1],
    clock_m1: mm[0],
    clock_m2: mm[1],
    clock_s1: ss[0],
    clock_s2: ss[1],
  })
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
