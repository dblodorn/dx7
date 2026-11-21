# Proposal

## Why

The DX7's voices are 6 operators × 21 parameters plus 19 voice-wide ones, edited one at a time through a two-line display and a single data slider. Its SysEx format is published (Yamaha's DX7 MIDI data format sheet), so unlike the VZ the whole format, including 32-voice banks, can be read and written from the first change. This change gives the DX7 the VZ editor's first milestone: a lossless codec, MIDI in and out, a voice editor and a local library. It is also what the emulator, sharing and the engine package read voices through.

## What Changes

- **Read side in the package** (`packages/yamaha-dx7-engine/src/`): `params.ts`, the one field table for the 155 VCED bytes (with a source for every entry); `codec.ts` (`get`, `getName`, `readVoice`, `fieldOf`); `sysex.ts` (`fromSyx`: VCED and VMEM messages, checksum checks, VMEM unpacking). Nothing in the package writes.
- **Write side in the editor** (`apps/editor/lib/dx7/`): `codec.ts` (`set`, `setMany`, `setName`, `initVoice`, VCED packing to VMEM) and `sysex.ts` (`toSysex`, `toBankSysex`, `toParamChange`, `.syx` files), re-exporting the read side.
- **MIDI**: receive single voices and 32-voice banks; send a voice, a bank, or one parameter change per edit.
- **Voice editor**: the algorithm (with its diagram), the six operators (grid plus the selected operator's panel: envelope, keyboard scaling, frequency, levels, sensitivities), operator on/off, the pitch envelope, the LFO and voice settings, name, undo/redo, INIT, SEND, SEND ON EDIT, keyboard audition.
- **Local library**: save, open, send, delete, search; `.syx` import of voices and banks; export of a voice (VCED) or of up to 32 voices as one bank (VMEM).
- Help entries for every section, in our own words, citing the owner's manual pages.

## Non-goals (this change)

- Browser sound (the emulator change; SOUND keeps the silent engine).
- SHARED and BANKS (the sharing change).
- DX7II/TX802 data (ACED, AMEM, microtuning, performance): recognised and skipped with a message.
- Function parameters (pitch bend range, portamento, mod wheel assignments, group 2): not part of a voice; a later change if wanted.
- Factory ROM voices in the repo or the library.

## Capabilities

### New Capabilities
- `dx7-sysex`: VCED and VMEM, their sources, what is still unverified.
- `midi-io`: connecting, receiving and sending voices, banks and parameter changes.
- `voice-editor`: editing a voice's parameters, undo, sending.
- `library`: keeping voices in the browser and moving them as `.syx` files.
