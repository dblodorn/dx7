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

SOUND plays the voice in the browser with the emulator (`packages/yamaha-dx7-engine`, mostly ported from msfa; see its README and NOTICE), no DX7 needed. Play it with KEYS or the Z–M keys.

The emulator is an approximate stand-in for the DX7, not a replacement for it. This is an editor and librarian, and a way to learn how the DX7 is programmed; LIBRARY → COLOPHON credits the work it builds on.
