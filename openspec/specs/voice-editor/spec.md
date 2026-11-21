# voice-editor Specification

## Purpose
Defines how a DX7 voice is edited in the browser: algorithm, operators, envelopes, scaling, LFO and voice settings.

## Requirements

### Requirement: Algorithm
ALGORITHM (1–32) SHALL be shown with a diagram drawn from the package's algorithm table: operators as numbered boxes, carriers on the bottom row, modulation lines and the feedback loop. Pressing an operator in the diagram SHALL select it. FEEDBACK (0–7) and OSC KEY SYNC sit with it.

#### Scenario: Change algorithm
- **WHEN** ALGORITHM changes from 1 to 32
- **THEN** the diagram shows six carriers and the feedback loop on OP6, and only data byte 134 changes

### Requirement: Operators
Six operators SHALL be shown side by side on wide screens and stacked on narrow ones, each with ON/OFF, OUTPUT LEVEL and its frequency. The selected operator's panel SHALL hold its envelope, keyboard level scaling, rate scaling, amp-mod and velocity sensitivity, osc mode, coarse, fine and detune. COPY and PASTE OPERATOR SHALL copy one operator's 21 bytes onto another. ON/OFF is session state and SHALL NOT change the voice's bytes.

#### Scenario: Paste operator
- **WHEN** OP2 is copied and pasted onto OP5
- **THEN** data bytes 21–41 equal bytes 84–104 and no other byte changes

### Requirement: Envelopes
The operator envelope and the pitch envelope SHALL be edited as four rates and four levels (0–99), with a drawing whose points can be dragged; each drag SHALL change exactly one rate or level.

#### Scenario: Drag a level
- **WHEN** the second point of OP1's envelope is dragged down
- **THEN** only OP1's LEVEL 2 changes

### Requirement: Keyboard level scaling
BREAK POINT SHALL be shown as a note name (39 = C3), with LEFT and RIGHT DEPTH (0–99) and CURVE (−LIN, −EXP, +EXP, +LIN), and a drawing of the resulting level across the keyboard.

#### Scenario: Break point display
- **WHEN** BREAK POINT is stored as 39
- **THEN** it reads C3

### Requirement: Voice settings, name, undo, init
The voice panel SHALL hold the pitch envelope, the LFO (wave, speed, delay, pitch and amp mod depth, sync, pitch mod sensitivity), TRANSPOSE (as a note, 12 = C2) and the 10-character name. UNDO and REDO SHALL restore earlier bytes exactly. INIT SHALL load INIT VOICE (OP1 alone at full level on algorithm 1; the values DX7 owners report for VOICE INIT, which the manual doesn't list).

#### Scenario: Undo restores bytes
- **WHEN** a voice arrives from the DX7, three fields are edited, and UNDO is pressed three times
- **THEN** the voice's 155 bytes equal the received ones
