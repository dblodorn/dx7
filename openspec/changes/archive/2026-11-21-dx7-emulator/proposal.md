# Proposal

## Why

SOUND starts audio and takes notes, but the engine package still renders silence. The emulator makes the editor audible without a DX7. It is also what `@dblodorn/yamaha-dx7-engine` exists for: windchime and later apps play DX7 voices through it. The DX7's sound generation has been reverse-engineered and implemented openly; msfa (Raph Levien's music-synthesizer-for-android, Apache-2.0) is the closest open model of it. So unlike the VZ, most of the engine can be ported from a known-good source instead of estimated.

## What Changes

- **The engine** (`packages/yamaha-dx7-engine/src/engine/`), replacing the silent skeleton behind the same API:
  - six operators per voice, 16 voices;
  - the 32 algorithms from `algorithms.ts`, with feedback;
  - the DX7 envelope;
  - frequency in ratio and fixed modes, with detune;
  - keyboard level scaling and rate scaling;
  - velocity sensitivity and output level;
  - the pitch envelope;
  - the LFO (6 waves, delay, key sync) with PMD/PMS and AMD/AMS;
  - transpose and OSC KEY SYNC.
- **Ported from msfa with attribution:**
  - the sine, exp2 and frequency tables;
  - the envelope;
  - output-level, velocity, rate- and level-scaling curves;
  - the pitch envelope and the LFO;
  - the operator kernel.

  Each ported file says so in its header, and the package ships msfa's Apache-2.0 notice in `NOTICE`. No code from Dexed.
- **Written fresh** where msfa stops: amplitude modulation, transpose, OSC KEY SYNC off and operator on/off. Every number they need is marked ESTIMATE in the calibration file.
- **A DX7-specific extra on the synth:** `setOperators(mask)`, the editor's operator ON/OFF (parameter 155), muting operators in the emulator as on the hardware.
- **Editor:**
  - SOUND plays the voice;
  - operator ON/OFF mutes in the emulator;
  - the SOUND help says what is ported and what is estimated;
  - changelog lines.
- **Package:** `CHANGELOG.md` entry. Still unpublished: publishing 0.1.0 is the next change.

## Non-goals (this change)

- **Comparing renders against references** (Dexed renders as a test oracle, recordings of a real DX7). Deferred by choice. The engine is checked by its own unit tests here, and calibration against references is a later change tracked in an issue.
- **Pitch bend, mod wheel, breath, foot controller and aftertouch:** function parameters, not voice data; the common surface has no controller API yet.
- **Mono mode and portamento:** function parameters.
- **The DX7's DAC character** (its 12-bit floating-point converter and noise): a later option, if wanted.
- **Publishing:** the next change.

## Capabilities

### New Capabilities
- `dx7-engine`: what the emulator plays and how, and where each part comes from.

### Modified Capabilities
- `dx7-workspace`: the silent-engine requirement is replaced by `dx7-engine`.
