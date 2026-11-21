# Tasks

## 1. Port

- [x] 1.1 `engine/tables.ts` (sine, exp2, freqlut) and `engine/calibration.ts` (every constant labelled PORTED / MANUAL / ESTIMATE). Verify: table tests.
- [x] 1.2 `engine/env.ts` and `engine/pitchenv.ts`. Verify: envelope tests.
- [x] 1.3 `engine/note.ts`: frequency, level scaling, velocity, rate scaling, transpose (no separate `Patch` conversion: a note reads the bytes at note-on). Verify: pitch and scaling tests.
- [x] 1.4 Operator kernel, routing from `algorithms.ts` (per sample, so chained feedback works), feedback, OSC KEY SYNC, operator mask, in `engine/note.ts`. Verify: routing and feedback tests.
- [x] 1.5 `engine/lfo.ts`: waves, delay, key sync, PMD × PMS, AMD × AMS (ESTIMATE). Verify: LFO tests.
- [x] 1.6 `engine/engine.ts`: 16 preallocated voices, release tails, stealing, block rendering, `setOperators`. Verify: voice tests; "allocates nothing" with `--expose-gc`.
- [x] 1.7 `NOTICE`, ported-file headers, README (what's ported, what's estimated, the Apache-2.0 part, `setOperators`), `CHANGELOG.md`. Verify: `pnpm -F @dblodorn/yamaha-dx7-engine smoke` (now a peak check) passes and the packed tarball includes `NOTICE`.

## 2. Synth surface

- [x] 2.1 `setOperators(mask)` on `Synth` and `OfflineSynth`, checked on the main thread; the worklet message. Verify: synth tests (bad mask throws, nothing posted).
- [x] 2.2 Worklet test and smoke test check for sound. Verify: `pnpm test`.

## 3. Editor

- [x] 3.1 Operator ON/OFF calls `A.setOperators`; opening a voice resets it. SOUND help: ported vs estimated. Changelog line. Verify: Playwright: SOUND + KEYS gives an analyser peak; OP1 OFF on INIT VOICE silences it.
- [x] 3.2 CPU check in Chrome (16 held notes, worst-case voice). Verify: under 10 % of one core; record the figure in `design.md`. The engine itself is 2.7–3.1 %; the renderer process rises about 10 points over idle (see design.md, Measured).
- [x] 3.3 Open an issue for the deferred reference comparisons (Dexed renders as an oracle, DX7 recordings): which voices, which measurements, which calibration numbers they would settle. Issue #6.
- [x] 3.4 `AGENTS.md` / `CLAUDE.md`: the engine layout and the calibration rule.
