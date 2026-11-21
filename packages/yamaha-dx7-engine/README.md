# @dblodorn/yamaha-dx7-engine

The Yamaha DX7 emulator as a sound source: load a voice, play notes, in an AudioWorklet inside your own `AudioContext` or offline in Node. It comes from the [DX7 editor](https://github.com/dblodorn/dx7) and follows the same shape as [`@dblodorn/casio-vz-engine`](https://github.com/dblodorn/vz10m/tree/main/packages/casio-vz-engine), so a host can swap one for the other.

**Not released yet.** This is the skeleton: the full API with an engine that renders silence. The emulator comes in a later change, and the first release (0.1.0) waits for it.

The package only plays voices. It has no way to change one, build SysEx or send MIDI.

## Surface

| | |
|---|---|
| `createSynth(ctx, { workletUrl? })` | A `Synth` in the host's `AudioContext`. The host creates, resumes and closes the context. The worklet loads from a Blob URL of code inside the package, or from `workletUrl` (serve `@dblodorn/yamaha-dx7-engine/worklet.js`). |
| `Synth.output` | A stereo `AudioNode`. |
| `Synth.loadVoice(voice)` | 155 bytes (a DX7 voice, VCED, unpacked). Anything else throws and the old voice stays. |
| `Synth.noteOn(note, velocity = 100)` / `noteOff(note)` / `allNotesOff()` | MIDI ranges; velocity 0 is a note-off. Out-of-range values throw. 16 voices; a 17th note takes the oldest. |
| `Synth.dispose()` | All notes off, disconnect. |
| `createOfflineSynth(sampleRate)` | The same engine without Web Audio, with `render(out, frames?, offset?)`. |
| `readVoice(bytes)`, `VOICE_BYTES` | The voice check `loadVoice` uses. |
| `PatchSource` | The shape of a voice library: `list({ search, after, first })`, `get(id)`. |

Importing the package touches no browser globals, so it is safe in server rendering and Node.

## License

MIT.
