# Design

## Bytes are the source of truth

A voice is its 155 unpacked VCED bytes (`Uint8Array(155)`), in the parameter order of the data format sheet: OP6 at 0–20, OP5 at 21–41, … OP1 at 105–125, then the voice-wide parameters 126–154. Every edit writes one field through `set()`. VMEM (32 × 128 packed bytes) is only an exchange format: it is unpacked on import and packed on export. A bank whose unused bits are 0 (as the sheet shows them) round-trips VMEM → VCED → VMEM byte for byte. A bank with set unused bits still imports; those bits are dropped, and the import reports how many voices had them. Out-of-range values in a VCED (e.g. a level of 120) are kept as received; only `set()` clamps.

This is also the storage shape for the API later: the bytes (base64) plus derived fields for search.

## Sources and confidence

Main source: the Yamaha DX7 Operating Manual (https://usa.yamaha.com/files/download/other_assets/9/333979/DX7E1.pdf), read in full for this change. Its pp.30–32 are Yamaha's own MIDI DATA FORMAT: message layouts, the voice parameter table (g=0) and what is received when. The EDIT MODE pages (12–17) give each value's panel meaning; pp.21–22 say how the DX7 sends and receives. Second source, for the packed bank layout only (the manual doesn't print it): the data format sheet as transcribed by Ewan A. Macpherson (1993): https://homepages.abdn.ac.uk/d.j.benson/pages/dx7/sysex-format.txt. msfa is a cross-check, not a source.

| Fact | Source | Status |
|---|---|---|
| VCED `F0 43 0n 00 01 1B <155> cs F7` (163 bytes), `n` = channel − 1 | manual p.30 (1-2-2); sheet A | sourced |
| VMEM `F0 43 0n 09 20 00 <4096> cs F7` (4104 bytes), 128 bytes per voice | manual p.30 (1-2-3); sheet B | sourced |
| Checksum: the 2's complement of the sum of the data bytes, low 7 bits (the header isn't summed) | manual p.30: "add [data 1st … 155th / 4096th] byte and make the 2's complement"; sheet A/B | sourced; a hardware dump confirms it in the hardware issue |
| VCED parameter table 0–154 (names, ranges), OP6 first | manual p.31; sheet D | sourced, the two agree |
| LFO WAVE 0–5 = TRIANGLE, SAW DOWN, SAW UP, SQUARE, SINE, S/HOLD | manual p.13 (six waves); sheet D 0–5 | manual p.31 prints 0–4 (a misprint the sheet also notes): flagged `unverified` |
| VMEM packing: bytes 11 (RC b3–2, LC b1–0), 12 (DET b6–3, RS b2–0), 13 (KVS b4–2, AMS b1–0), 15 (FC b5–1, M b0), 110 (ALG b4–0), 111 (OKS b3, FB b2–0), 116 (LPMS b6–4, LFW b3–1, LKS b0); all others whole bytes | sheet F only | sourced once; a hardware bank confirms it in the hardware issue |
| Parameter 155, operator on/off (bit 5 OP1 … bit 0 OP6): parameter-change only, not stored | manual p.31, p.16 | sourced |
| Parameter change `F0 43 1n 0gggggpp 0ppppppp 0ddddddd F7`: g (bits 6–2) 0 = voice, 2 = function; pp the parameter's top bits | manual p.30 (1-2-4) | sourced (the manual's bit picture settles the sheet's ambiguity) |
| Curves 0–3 = −LIN, −EXP, +EXP, +LIN | manual p.16; sheet D | sourced |
| Break point 0–99 = A-1 … C8, 39 = C3 | manual p.16; sheet D | shown as a note name |
| Transpose 0–48, 24 = C3 (no transposition) | manual p.17 ("C3 as standard"); sheet D "12 = C2" | shown as a note name |
| Detune 0–14 = −7 … +7 | manual p.15; sheet D | shown −7…+7 |
| Algorithm 0–31 = 1–32 | manual pp.12, 31 | shown 1–32 |
| Ratio: coarse 0 = ×0.5, 1–31 = ×1–31; fine ×1.00–1.99. Fixed: coarse 1, 10, 100, 1000 Hz (repeating every 4); fine ×1–9.772 | manual p.15 (ranges and the 2.00 / 977.2 Hz examples) | shown as ×ratio or Hz; fixed fine taken as 10^(fine/100), which gives the manual's endpoints and its example |
| Dump requests | not in the manual | not implemented; the editor never asks |
| The DX7 sends: a VCED when a voice is selected with SYS INFO AVAIL; all 32 with FUNCTION 8 → MIDI TRANSMIT? YES; always on channel 1 | manual p.22 | sourced: MIDI IN reads any channel |
| The DX7 receives VCED, VMEM and parameter changes only on its channel with SYS INFO AVAIL and MEMORY PROTECT (internal) off; a VMEM replaces all 32 internal voices | manual pp.22, 32 | sourced: the MIDI dialog and the BANK SEND confirmation say so |

Anything the manual and the sheet disagree on is flagged `unverified: true` in `params.ts`, as in vz10m.

## Display values

Raw stored values everywhere except where a row above says "shown as". The panel shows 0–99 for most fields and the stored values are 0–99 too, so unlike the VZ there is little to convert.

## Algorithms

`algorithms.ts` in the package (the emulator needs the same data): for each of the 32 algorithms, which operators are carriers, the modulation edges, and the feedback operator. Source: the chart printed on the DX7's front panel (the manual shows only algorithm 1, p.11, and refers to the panel), transcribed; `test/algorithms.test.ts` derives each algorithm's carriers, modulation and feedback from msfa's routing table (Apache-2.0, copied into the test as data) and compares all 32. Algorithms 4 and 6 have their feedback loop through a chain (4→6, 5→6), as on the panel. The editor draws the diagram from that data as 1-bit SVG (boxes and lines, no fills except the selected operator, inverted).

## Operator on/off

Not part of a voice (parameter 155). The editor keeps it as session state per voice being edited: toggling sends parameter 155 when SEND ON EDIT is on, and the emulator (later) mutes the operator. Saving, exporting and sharing never include it; INIT and opening a voice turn all six on.

## Sending

- SEND: the whole voice as one VCED to the chosen channel.
- SEND ON EDIT: one parameter change per changed field, sent at once (no 250 ms wait: the messages are 7 bytes). A multi-field edit (INIT, paste, opening a voice) sends a VCED instead. If 2.3 shows the DX7 mishandles param changes, fall back to vz10m's debounced VCED.
- BANK SEND (library): one VMEM after a confirmation that names MEMORY PROTECT INT OFF and says the DX7's 32 internal voices will be replaced.
- Dumps are spaced by 150 ms (vz10m's guess), to be measured on hardware.

## Receiving

Anything from the chosen MIDI IN is parsed with `fromSyx`: a VCED replaces the voice being edited (undoable, announced by name); a VMEM opens the import dialog listing its 32 voices, all checked, and ADD SELECTED adds them to the library; a damaged message is announced and changes nothing; other Yamaha formats (ACED, AMEM, performance) are announced as not supported; anything else is ignored.

## Library

vz10m's LOCAL tab with DX7 names (10 characters of printable ASCII, shown as stored; the DX7's own panel offers only digits, A–Z, `-`, `.` and space, manual p.17). Import opens the import dialog (the same one a bank from MIDI uses), so the chosen voices are added, not all of them. Import accepts a `.syx` with any mix of VCED and VMEM messages. EXPORT BANK takes up to 32 checked voices in list order and pads with INIT VOICE.

## INIT VOICE

The manual describes VOICE INIT (p.7) but doesn't list its values. `initVoice()` uses the values DX7 owners report: algorithm 1, OP1 output level 99 and the others 0, every operator envelope rates 99 / levels 99-99-99-0, ratio ×1.00, detune 0, break point C3, the pitch envelope flat (rates 99, levels 50), LFO speed 35 (the manual's own example display, p.13), key sync on, pitch mod sens 3, transpose C3, name `INIT VOICE`. Unverified until a DX7's VOICE INIT is dumped (hardware issue). Windchime will later need a louder INIT of its own, as it did for the VZ.

## Risks

- **No hardware yet:** like the VZ, the hardware checks (fixtures, parameter-change group bits, what the DX7 accepts, send pacing) go into an issue if no DX7 is available, and the format stays marked as sourced-but-unconfirmed.
- **Fixtures:** no factory ROM in the repo. Tests build voices with the codec and use one bank made in this editor; a public-domain bank may be added if one with clear terms is found.
