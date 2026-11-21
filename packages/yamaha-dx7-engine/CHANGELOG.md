# Changelog

## 0.1.0 — 2026-11-21

First release.

- The emulator: six operators, 32 algorithms with feedback, envelopes, ratio and fixed frequencies, keyboard and rate scaling, velocity, the pitch envelope, the LFO with pitch and amplitude modulation, transpose and OSC KEY SYNC. Ported from msfa (Apache-2.0, see `NOTICE`) where it can be. Amplitude modulation depths are estimates.
- `setOperators(mask)` on both synths (DX7 only): operator on/off.
- Reading voices: the field table, single voices and 32-voice banks, `frequency`, the algorithm table.
- The skeleton: `createSynth`, `createOfflineSynth`, `readVoice`, the `PatchSource` shape.
