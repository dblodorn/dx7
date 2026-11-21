# Tasks

Depends on `scaffold-dx7-workspace`.

## 1. Format

- [x] 1.1 `packages/yamaha-dx7-engine/src/params.ts`: every VCED field (key, byte, range, source, `unverified`, `display` only where sourced), operator fields generated for OP1–OP6 from one block; `voiceField(key)` throws on unknown keys. Verify: a test checks 155 bytes are covered exactly once and every range matches the format sheet.
- [x] 1.2 `src/codec.ts` (`get`, `getName`, `readVoice`, `fieldOf`) and `src/sysex.ts` (`fromSyx`: VCED, VMEM, checksum, unpacking, other Yamaha formats reported as unsupported). Verify: `test/codec.test.ts` (nothing exported writes), `test/sysex.test.ts` (damaged checksum → no voice; a mixed `.syx` yields every message in order).
- [x] 1.3 `src/algorithms.ts`: the 32 algorithms from the owner's manual chart (carriers, edges, feedback operator). Verify: structural test (6 operators, ≥ 1 carrier, one feedback loop each) and a spot check of algorithms 1, 5, 22 and 32 against the chart.
- [x] 1.4 `apps/editor/lib/dx7/codec.ts` (`set`, `setMany`, `setName`, `initVoice`, `packVoice`/`unpackVoice`) and `sysex.ts` (`toSysex`, `toBankSysex`, `toParamChange`, `.syx` split/join, file names). Verify: `test/dx7.test.ts`: every field set alone changes only its bytes; VCED → VMEM → VCED identity for random valid voices; a bank made in the editor round-trips byte for byte; `toParamChange` for parameters 0, 127, 128 and 155.

## 2. Sources and hardware

- [x] 2.1 Read the DX7 owner's manual (algorithm chart, INIT VOICE, ratio/fixed frequency, MIDI and memory-protect pages, SYS INFO AVAIL, MIDI TRANSMIT); cite pages in `design.md`, `params.ts` and `lib/help.ts`; add `display` for the frequency rows only if the manual states the conversion. Add the manual's link to RESOURCES.
- [x] 2.2 Find a checksum reference: a known-good VCED or VMEM from a public source with clear terms, or a dump from hardware. Verify: its checksum matches ours; clear the `unverified` flag. Done from the manual: p.30 gives the rule (the data bytes summed, 2's complement), so the flag is cleared; a hardware dump re-checks it in issue #3.
- [x] 2.3 Hardware (DX7 needed): receive a voice and a bank; send a VCED, a VMEM and parameter changes (including 155); measure safe pacing. If no DX7 is available, move this to a GitHub issue like vz10m's #1. Moved to issue #3 (needs hardware).

## 3. MIDI

- [x] 3.1 `lib/midi.ts`: DX7 parsing on input (via `fromSyx`), VCED/VMEM/param-change sending, pacing, PANIC, TEST NOTE. Verify: stubbed-MIDI Playwright check: an incoming VCED replaces the voice; an incoming VMEM opens the import panel; SEND sends 163 bytes starting `F0 43 00 00 01 1B` on channel 1; an edit with SEND ON EDIT sends one 7-byte parameter change.

## 4. Editor

- [x] 4.1 Algorithm row and diagram (1-bit SVG from `algorithms.ts`), feedback, osc key sync. Verify: choosing ALGORITHM 32 redraws six carriers; selecting an operator in the diagram selects it in the grid.
- [x] 4.2 Operator grid (six columns on desktop, stacked at 390 px: on/off, output level, frequency, detune) and the selected operator's panel: 4-stage envelope editor (rates and levels, draggable), keyboard level scaling (break point as a note, depths, curves, with a drawn curve), rate scaling, sensitivities, osc mode, coarse, fine. Verify: dragging an envelope point changes only that rate or level byte.
- [x] 4.3 Voice panel: pitch envelope, LFO (wave names, speed, delay, PMD, AMD, sync, PMS), transpose (as a note), name (10 characters). Undo/redo, INIT, SEND, SEND ON EDIT, COPY/PASTE OPERATOR. Verify: undo after an incoming voice restores the previous bytes exactly; PASTE OPERATOR copies 21 bytes and nothing else.
- [x] 4.4 Help entries for every section (`lib/help.ts`), own words, manual pages cited.
- [x] 4.5 No hydration warnings; no horizontal scroll at 390 px. Verify: Playwright reports no console errors and no overflow.

## 5. Library

- [x] 5.1 LOCAL: save, open, send, delete (confirm), search, `.syx` import (VCED and VMEM, mixed), voice export (VCED), EXPORT BANK (up to 32 checked voices, padded with INIT VOICE), BANK SEND (with the memory-protect confirmation). Verify: a saved voice survives a reload; an exported bank re-imports to the same 32 voices.
- [x] 5.2 Changelog line; `AGENTS.md`/`CLAUDE.md` updated with the codec and editor layout; README instructions for the DX7 side, from 2.1.
