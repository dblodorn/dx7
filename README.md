# DX7

A browser editor and librarian for the Yamaha DX7, over Web MIDI SysEx, and its emulator as a package
(`@dblodorn/yamaha-dx7-engine`). Sibling of [vz10m](https://github.com/dblodorn/vz10m), and built the same way.

```
pnpm install
pnpm dev
pnpm test
```

Use Chrome or Edge. On the DX7 press FUNCTION, then 8 to set MIDI CH (match CHANNEL in the editor's MIDI dialog), and 8 again for SYS INFO AVAIL. In the editor press MIDI → CONNECT MIDI and choose the ports.

- **From the DX7:** selecting a voice sends it to the editor. For all 32, press 8 once more (MIDI TRANSMIT?) and answer YES; the editor offers them for its library.
- **To the DX7:** also set MEMORY PROTECT INTERNAL to OFF. SEND sends the voice you're editing; SEND ON EDIT sends each change as you make it; LIBRARY → BANK SEND replaces the DX7's 32 internal voices.

The browser emulator (SOUND) is still silent: it's the next change. Plans are in `openspec/changes/`.
