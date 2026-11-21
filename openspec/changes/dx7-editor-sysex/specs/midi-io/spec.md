# Spec Delta

## Purpose

Defines how the editor connects to a DX7 over Web MIDI and moves voices, banks and parameter changes both ways.

## ADDED Requirements

### Requirement: Connecting
MIDI access, including SysEx, SHALL be requested only from the CONNECT MIDI button, never on load. Browsers without Web MIDI SHALL show a message and a disabled button. After connecting, the MIDI dialog SHALL offer MIDI IN, MIDI OUT and CHANNEL (1–16), remembered across visits; a remembered port that is unplugged SHALL show as DISCONNECTED and be picked up again when it returns.

#### Scenario: SysEx permission
- **WHEN** the user presses CONNECT MIDI
- **THEN** the browser is asked for MIDI access with SysEx

### Requirement: Receiving
Every message on MIDI IN SHALL be parsed: a VCED replaces the voice being edited (undoable, announced by name); a VMEM opens an import panel of its 32 voices; a damaged message is announced and changes nothing; other Yamaha formats are announced as not supported; everything else is ignored. The editor SHALL never send a dump request.

#### Scenario: Bank arrives
- **WHEN** the DX7 transmits its 32 internal voices
- **THEN** the import panel lists 32 names and ADD ALL puts them in the library

### Requirement: Sending
SEND SHALL send the current voice as one VCED on the chosen channel. With SEND ON EDIT, each single-field edit SHALL send one parameter change at once, and a multi-field change (INIT, paste, opening a voice) SHALL send a VCED. BANK SEND SHALL ask for confirmation naming the memory-protect setting before sending a VMEM. Several dumps SHALL be spaced apart. Sending is disabled without a MIDI OUT port.

#### Scenario: Send
- **WHEN** CHANNEL is 5 and the user presses SEND
- **THEN** one 163-byte message starting `F0 43 04 00 01 1B` is sent

### Requirement: Audition and panic
TEST NOTE, the computer-keyboard keys and the KEYS floater SHALL play through the note router to the DX7 and/or the emulator (PLAY TO). PANIC SHALL release held notes and send All Notes Off and All Sound Off.

#### Scenario: Computer keyboard
- **WHEN** no field has focus and the user holds Z, then releases it
- **THEN** a note-on for C4 is sent on the chosen channel, then its note-off
