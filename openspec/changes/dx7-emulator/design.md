# Design

## Port, then fill the gaps

msfa models the DX7 in fixed-point integer arithmetic: log-domain levels and log-frequencies in Q24, 64-sample blocks, lookup tables for 2^x and sine. The port keeps that arithmetic (JS `Math.imul`, `Int32Array` tables, `>>` shifts) rather than turning it into floats. That keeps msfa's behaviour, including its quantisation, which is part of how the DX7 sounds, and keeps it testable against msfa's own numbers.

| Part | Source | File |
|---|---|---|
| Sine table, exp2 table, log-frequency → phase increment | msfa `sin.cc`, `exp2.cc`, `freqlut.cc` (PORTED) | `engine/tables.ts` |
| Operator envelope: rates, levels, the attack "jump" and curve, output-level table, rate scaling | msfa `env.cc` (PORTED) | `engine/env.ts` |
| Frequency: ratio coarse table, fine, fixed mode, detune | msfa `dx7note.cc` `osc_freq` (PORTED) | `engine/note.ts` |
| Keyboard level scaling (linear and exponential curves), velocity table, rate scaling | msfa `dx7note.cc` (PORTED) | `engine/note.ts` |
| Pitch envelope | msfa `pitchenv.cc` (PORTED) | `engine/pitchenv.ts` |
| LFO: speed table, delay, waves, key sync, S/H; PMD × PMS | msfa `lfo.cc`, `dx7note.cc` (PORTED) | `engine/lfo.ts` |
| Operator kernel: phase modulation, feedback (average of the last two outputs, shifted by 8 − feedback) | msfa `fm_op_kernel.cc`, `fm_core.cc` (PORTED) | `engine/core.ts` |
| Algorithm routing | this package's `algorithms.ts` (checked against msfa's table in phase 1) | `engine/core.ts` |
| Amplitude modulation: AMD × AMS, into each operator's log level | ESTIMATE (msfa leaves it out; the manual gives only the ranges, AMD 0–99 and AMS 0–3, p.13–14): AMS as four increasing depth steps with 0 = none, the LFO lowering the operator's log level; tuned by ear until references arrive | `engine/note.ts` |
| Transpose: the voice's notes shifted by `transpose − 24` semitones before everything else | manual p.17 | `engine/note.ts` |
| OSC KEY SYNC off: operator phases carry over to the next note in that voice slot | manual p.14 (msfa always resets) | `engine/core.ts` |
| Operator on/off: a muted operator outputs nothing, but its envelope keeps running | manual p.12 | `engine/core.ts` |
| Output gain: Q24 sum → float, with headroom for 16 voices × up to 6 carriers | ESTIMATE, measured | `engine/calibration.ts` |

`engine/calibration.ts` is the one file of tunable numbers, as `convert.ts` is in the VZ package. Each number is labelled PORTED (with the msfa line), MANUAL (with the page) or ESTIMATE. A change there changes the sound, so it is released as at least a minor version.

## Licensing

msfa is Apache-2.0. The package stays MIT for its own code. Ported files carry msfa's copyright line and a "ported from msfa <file>, Apache-2.0" header. `packages/yamaha-dx7-engine/NOTICE` reproduces msfa's notice and lists the ported files, and `files` in `package.json` includes `NOTICE`. The README's license section says the package contains Apache-2.0 code. Nothing is taken from Dexed (GPL-3).

## Engine shape

- `Engine` (in `engine.ts`) keeps its phase-0 API (`setPatch`, `noteOn`, `noteOff`, `allOff`, `render`, `sounding`) and adds `setOperators(mask)`.
- Voices are preallocated: 16 `Note` objects, each with 6 envelopes, phases and feedback state.
- `render(out, frames, offset)` fills an internal 64-sample Q24 block and converts it into `out`. A request that isn't a multiple of 64 is served from the leftover block, so the worklet's 128 frames are exactly two blocks. It never allocates: the "allocates nothing" test from vz10m (`--expose-gc`) runs on it.
- **Patch changes:** `setPatch` converts the 155 bytes into a `Patch` once (pre-scaled per-operator values that don't depend on the note), as the VZ engine does. Notes already sounding keep theirs.
- **Note-on:** a voice gets the patch and the note: transpose, then per-operator frequency, level scaling, velocity and rate scaling. Note-off releases every envelope.
- **Freeing voices:** a voice is free once every carrier's envelope is in release below the silence threshold. Until then it counts in `sounding()`, and a 17th note steals the oldest released voice first, then the oldest.
- **The LFO:** one per engine, as on the DX7 (one LFO for the instrument). Key sync restarts it on each key-on; the delay runs per voice from its key-on, per msfa.

## The extra: operator on/off

`Synth.setOperators(mask)` and `OfflineSynth.setOperators(mask)` take parameter 155's 6-bit value (bit 5 OP1 … bit 0 OP6). The value is checked on the main thread and posted to the worklet as `{ type: "operators", mask }`. It is not part of the engine-packages common surface: hosts that swap engines don't call it. It is documented as DX7-only in the README. The editor calls it whenever ON/OFF changes and resets it to all-on when a voice is opened, matching the MIDI side.

## Tests in this change

The package's own checks. Reference comparisons are deferred.

- **Tables:** sine and exp2 within msfa's stated error.
- **Pitch:** one carrier at ratio ×1, ×2, ×0.5, fixed 100 Hz and fixed 977.2 Hz; the measured frequency (zero crossings over 0.5 s) is within 0.5 cent of `frequency()` × the note. Detune +7 is sharp of 0, −7 flat. Transpose 36 is an octave up.
- **Envelope:** the attack rises, decay and sustain settle at their levels, and release reaches silence. A higher rate is faster. Level 0 is silent. Rate scaling shortens high notes.
- **Routing:**
  - With every modulator at output level 0, algorithm 1's output is the sum of carriers 1 and 3 only (spectrum: the fundamental alone at ratio 1).
  - Raising OP2's level adds harmonics.
  - Algorithm 32 with six equal carriers at different ratios has six spectral lines.
  - Feedback 7 has more harmonic energy than feedback 0.
- **Scaling:** keyboard level scaling with −LIN depth 99 on the right makes high notes quieter. Velocity sensitivity 7 makes soft notes quieter, and 0 doesn't.
- **LFO:** PMD 99 × PMS 7 wobbles pitch at the LFO rate, and AMD 99 × AMS 3 wobbles amplitude. Delay 99 postpones it, and key sync starts the wave at the same phase each key.
- **Voices:**
  - 16 voices; the release tail keeps a voice until it is silent, then frees it.
  - `setOperators(0b011111)` (OP1 off) removes OP1's contribution.
  - `render` allocates nothing.
  - The worklet and smoke tests check for a peak again, not silence.
- **Browser:** SOUND plus a key in Playwright shows a peak on an analyser after the destination. A CPU check in Chrome: 16 voices of an all-modulator algorithm-1 voice, held, at under 10 % of one core (vz10m measured about 5 %).

## Risks

- **AM is estimated:** voices that lean on AMS/AMD (tremolo, "wow") will be approximate until compared with references.
- **Loudness:** the DX7's output level depends on the carrier count (manual p.16 has Yamaha setting carrier levels to 1/2 or 1/6 depending on the algorithm). The engine sums carriers without normalising, as the hardware does. The output gain leaves headroom for six carriers at 99, so a one-carrier INIT VOICE is quiet. Windchime will make its own louder INIT, as it did for the VZ.
- **Fixed-point in JS:** 32-bit wraparound has to be explicit (`| 0`, `Math.imul`). The table and pitch tests catch slips.
