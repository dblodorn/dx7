# Spec Delta

## Purpose

Defines what the DX7 emulator plays, so a voice sounds the same in the editor, in windchime and offline, and where each part of the model comes from.

## ADDED Requirements

### Requirement: Voice structure
The engine SHALL play every voice parameter of a DX7 voice except operator on/off (which arrives separately): six operators routed by the voice's algorithm with its feedback, each with its envelope, frequency (ratio or fixed, coarse, fine, detune), output level, keyboard level and rate scaling, velocity and amplitude-modulation sensitivity; and the voice's pitch envelope, LFO, pitch modulation sensitivity, transpose and OSC KEY SYNC.

#### Scenario: Ratio pitch
- **WHEN** INIT VOICE plays MIDI note 69 with OP1 at ratio ×2.00
- **THEN** the output's fundamental is 880 Hz within half a cent

#### Scenario: Transpose
- **WHEN** a voice with TRANSPOSE C4 (stored 36) plays note 60
- **THEN** it sounds an octave above the same voice at TRANSPOSE C3

### Requirement: Sources and calibration
Every tunable number SHALL live in one calibration file, labelled as ported from msfa (with its file), stated by the owner's manual (with its page), or an estimate. Code ported from msfa SHALL carry its copyright and license header, and the package SHALL ship msfa's Apache-2.0 notice. No code SHALL come from Dexed.

#### Scenario: Packed notice
- **WHEN** the package is packed
- **THEN** the tarball contains `NOTICE` naming msfa and the ported files

### Requirement: Polyphony and release
The engine SHALL play 16 voices. A released voice SHALL keep sounding until its carriers' envelopes fall silent, then be free. A 17th note SHALL take the oldest released voice, else the oldest voice.

#### Scenario: Release tail
- **WHEN** a voice with RATE 4 = 30 on its carrier is released
- **THEN** `sounding()` still counts it until its output is silent, then drops it

### Requirement: Operator on/off
The synth SHALL offer `setOperators(mask)` with parameter 155's 6-bit value (bit 5 OP1 … bit 0 OP6), checked before it reaches the engine. A switched-off operator SHALL contribute nothing. This is a DX7-specific extra outside the engine-packages common surface.

#### Scenario: OP1 off
- **WHEN** INIT VOICE (only OP1 sounding) plays with `setOperators(0b011111)`
- **THEN** the output is silent

### Requirement: Real-time safety
`render()` SHALL NOT allocate, and the worklet SHALL render 16 held notes of an algorithm-1 voice with every operator at level 99 within 10 % of one core in desktop Chrome.

#### Scenario: No allocation
- **WHEN** `render()` runs 1000 blocks with 16 notes held under `--expose-gc`
- **THEN** heap use doesn't grow
