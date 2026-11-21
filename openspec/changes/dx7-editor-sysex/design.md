# Design

## Bytes are the source of truth

A voice is its 155 unpacked VCED bytes (`Uint8Array(155)`), in the parameter order of the data format sheet: OP6 at 0–20, OP5 at 21–41, … OP1 at 105–125, then the voice-wide parameters 126–154. Every edit writes one field through `set()`. VMEM (32 × 128 packed bytes) is only an exchange format: it is unpacked on import and packed on export. A bank whose unused bits are 0 (as the sheet shows them) round-trips VMEM → VCED → VMEM byte for byte. A bank with set unused bits still imports; those bits are dropped, and the import reports how many voices had them. Out-of-range values in a VCED (e.g. a level of 120) are kept as received; only `set()` clamps.

This is also the storage shape for the API later: the bytes (base64) plus derived fields for search.

## Sources and confidence

Main source: the Yamaha DX7 MIDI data format sheet as transcribed by Ewan A. Macpherson (1993), from the sheet, Keyboard magazine (Jan 1987) and his own DX7's output: https://homepages.abdn.ac.uk/d.j.benson/pages/dx7/sysex-format.txt. The owner's manual (pp. to be cited by task 2.1) is the source for panel meanings. msfa's and other open-source readers are cross-checks, not sources.

| Fact | Source | Status |
|---|---|---|
| VCED `F0 43 0n 00 01 1B <155> cs F7` (163 bytes), `n` = channel − 1 | format sheet A | sourced; confirm with a dump |
| VMEM `F0 43 0n 09 20 00 <4096> cs F7` (4104 bytes), 128 bytes per voice | format sheet B | sourced; confirm with a dump |
| Checksum: low 7 bits of the two's complement of the sum of the data bytes (header excluded) | format sheet ("masked 2's complement of sum of 155 / 4096 bytes"); "header excluded" is the usual reading, not stated | **unverified** until a hardware or known-good dump checks it |
| VCED parameter table 0–154 (names, ranges) | format sheet D | sourced |
| OP6 first in both VCED and VMEM | format sheet D and F | sourced |
| VMEM packing: bytes 11 (RC b3–2, LC b1–0), 12 (DET b6–3, RS b2–0), 13 (KVS b4–2, AMS b1–0), 15 (FC b5–1, M b0), 110 (ALG b4–0), 111 (OKS b3, FB b2–0), 116 (LPMS b6–4, LFW b3–1, LKS b0); all others whole bytes | format sheet F | sourced |
| Parameter 155, operator on/off (bit 5 OP1 … bit 0 OP6): parameter-change only, not stored in a voice | format sheet D | sourced |
| Parameter change `F0 43 1n 0gggggpp 0ppppppp 0ddddddd F7`, g = 0 voice, pp = high bits of the parameter number | format sheet C | layout sourced; **the bit position of g is ambiguous** in the sheet: test with a hardware DX7 (voice group bytes `00`/`01` are unaffected, since g = 0) |
| LFO waves 0–5 = TRIANGLE, SAW DOWN, SAW UP, SQUARE, SINE, S/HOLD | format sheet D (it notes the data sheet's misprinted range) | sourced |
| Curves 0–3 = −LIN, −EXP, +EXP, +LIN | format sheet D | sourced |
| Break point 0–99, 39 = C3 | format sheet D | sourced: shown as a note name (0 = A-1) |
| Transpose 0–48, 12 = C2 | format sheet D | sourced: shown as a note name |
| Detune 0–14, 0 = −7 | format sheet D | sourced: shown −7…+7 |
| Ratio = coarse (0 → 0.5) × (1 + fine/100); fixed = 10^(coarse mod 4) × … Hz | owner's manual (to cite) | shown raw until task 2.1 cites the conversion |
| Dump requests | not in the sheet | **not implemented**; the editor never asks |
| What the DX7 sends on its own: a VCED when a voice is selected with SYS INFO AVAIL; a bulk dump from FUNCTION → MIDI TRANSMIT | owner's manual (task 2.1) | to read; README instructions follow it |
| What the DX7 accepts: VCED into the edit buffer; VMEM into internal memory only with MEMORY PROTECT INT off | owner's manual (task 2.1) | to read; the BANK SEND confirmation names the setting |

Anything the manual and the sheet disagree on is flagged `unverified: true` in `params.ts`, as in vz10m.

## Display values

Raw stored values everywhere except where a row above says "shown as". The panel shows 0–99 for most fields and the stored values are 0–99 too, so unlike the VZ there is little to convert.

## Algorithms

`algorithms.ts` in the package (the emulator needs the same data): for each of the 32 algorithms, which operators are carriers, the modulation edges, and the feedback operator. Source: the owner's manual's algorithm chart, transcribed and checked by a test that every algorithm has 6 operators, at least one carrier, and exactly one feedback loop. The editor draws the diagram from that data as 1-bit SVG (boxes and lines, no fills except the selected operator, inverted).

## Operator on/off

Not part of a voice (parameter 155). The editor keeps it as session state per voice being edited: toggling sends parameter 155 when SEND ON EDIT is on, and the emulator (later) mutes the operator. Saving, exporting and sharing never include it; INIT and opening a voice turn all six on.

## Sending

- SEND: the whole voice as one VCED to the chosen channel.
- SEND ON EDIT: one parameter change per changed field, sent at once (no 250 ms wait: the messages are 7 bytes). A multi-field edit (INIT, paste, opening a voice) sends a VCED instead. If 2.3 shows the DX7 mishandles param changes, fall back to vz10m's debounced VCED.
- BANK SEND (library): one VMEM after a confirmation that names MEMORY PROTECT INT OFF and says the DX7's 32 internal voices will be replaced.
- Dumps are spaced by 150 ms (vz10m's guess), to be measured on hardware.

## Receiving

Anything from the chosen MIDI IN is parsed with `fromSyx`: a VCED replaces the voice being edited (undoable, announced by name); a VMEM opens an import panel listing its 32 voices with ADD ALL / ADD SELECTED to the library; a damaged message is announced and changes nothing; other Yamaha formats (ACED, AMEM, performance) are announced as not supported; anything else is ignored.

## Library

vz10m's LOCAL tab with DX7 names (10 characters, uppercase as stored; the DX7's character set is ASCII with a few Yamaha substitutions, `¥` for `\` and arrows for `~`/DEL, shown as stored). Import accepts a `.syx` with any mix of VCED and VMEM messages. EXPORT BANK takes up to 32 checked voices in list order and pads with INIT VOICE.

## INIT VOICE

Yamaha's initial voice as the owner's manual defines it (task 2.1 cites the page): algorithm 1, OP1 output level 99 and the others 0, all envelopes rates 99 / levels 99-99-99-0, name `INIT VOICE`. It is the manual's, not a guess; windchime will later need a louder INIT of its own, as it did for the VZ.

## Risks

- **No hardware yet:** like the VZ, the hardware checks (fixtures, parameter-change group bits, what the DX7 accepts, send pacing) go into an issue if no DX7 is available, and the format stays marked as sourced-but-unconfirmed.
- **Fixtures:** no factory ROM in the repo. Tests build voices with the codec and use one bank made in this editor; a public-domain bank may be added if one with clear terms is found.
