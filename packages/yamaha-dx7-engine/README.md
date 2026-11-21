# @dblodorn/yamaha-dx7-engine

The Yamaha DX7 emulator as a sound source: load a voice, play notes, in an AudioWorklet inside your own `AudioContext` or offline in Node. It comes from the [DX7 editor](https://github.com/dblodorn/dx7) and has the same shape as [`@dblodorn/casio-vz-engine`](https://github.com/dblodorn/vz10m/tree/main/packages/casio-vz-engine), so a host can swap one for the other.

## Install

The package is on GitHub Packages, which needs a token to install, even for public packages. Make a classic personal access token with the `read:packages` scope, then add an `.npmrc` beside your `package.json`:

```
@dblodorn:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```sh
GITHUB_TOKEN=ghp_… pnpm add @dblodorn/yamaha-dx7-engine
```

It ships as ES modules with TypeScript types. Nothing needs to be built or configured on your side.

## Play

```ts
import { createSynth } from "@dblodorn/yamaha-dx7-engine";

let ctx: AudioContext | undefined;
let synth: Awaited<ReturnType<typeof createSynth>> | undefined;

button.onclick = async () => {
  ctx ??= new AudioContext();       // create or resume it in a click
  await ctx.resume();
  synth ??= await createSynth(ctx);
  synth.output.connect(ctx.destination);
  synth.loadVoice(voiceBytes);      // 155 bytes, or one DX7 single-voice SysEx message
  synth.noteOn(60, 100);
  setTimeout(() => synth!.noteOff(60), 500);
};
```

A 32-voice bank file reads with `fromSyx(bytes).items`, each item's `data` ready for `loadVoice`.

The package only plays and reads voices. It has no way to change one, build SysEx or send MIDI.

## The sound

Six operators per voice, 16 voices, the 32 algorithms with feedback, the DX7 envelope, ratio and fixed frequencies with detune, keyboard level and rate scaling, velocity, the pitch envelope, the LFO (six waves, delay, key sync) with pitch and amplitude modulation, transpose and OSC KEY SYNC.

Most of it is a port of [msfa](https://github.com/google/music-synthesizer-for-android) (Raph Levien's DX7-compatible engine, Apache-2.0), keeping its fixed-point arithmetic. Written here, where msfa stops:
- **amplitude modulation:** its depths are estimates;
- **feedback loops through a chain** of operators (algorithms 4 and 6);
- **transpose, OSC KEY SYNC off and operator on/off.**

Every tunable number is in `src/engine/calibration.ts`, marked as ported, from the owner's manual, or an estimate. A release that changes one says so in the changelog. The output isn't compared with a real DX7 yet.

Levels follow the hardware: carriers add up, unnormalised. One carrier at level 99 peaks near 0.125, and six can pass 1.0. The engine doesn't clip, so mix and limit in your host.

## Surface

| | |
|---|---|
| `createSynth(ctx, { workletUrl? })` | A `Synth` in the host's `AudioContext`. The host creates, resumes and closes the context. The worklet loads from a Blob URL of code inside the package, or from `workletUrl` (serve `@dblodorn/yamaha-dx7-engine/worklet.js`). |
| `Synth.output` | A stereo `AudioNode`. |
| `Synth.loadVoice(voice)` | 155 bytes (a DX7 voice, VCED) or one single-voice SysEx message. Anything else throws and the old voice stays. Notes already sounding keep theirs. |
| `Synth.noteOn(note, velocity = 100)` / `noteOff(note)` / `allNotesOff()` | MIDI ranges; velocity 0 is a note-off. 16 voices; a 17th note takes the oldest released voice, else the oldest. |
| `Synth.setOperators(mask)` | DX7 only, outside the shared engine surface: which operators sound, as parameter 155's value (bit 5 OP1 … bit 0 OP6). |
| `Synth.dispose()` | All notes off, disconnect. |
| `createOfflineSynth(sampleRate)` | The same engine without Web Audio, with `render(out, frames?, offset?)` and `sounding()`. |
| Reading voices | `readVoice`, `get`, `getName`, `frequency`, `fromSyx` (single voices and 32-voice banks), `parse`, `unpackVoice`, the field table `VOICE_FIELDS` / `voiceField`, and `ALGORITHMS`. |
| `PatchSource` | The shape of a voice library: `list({ search, after, first })`, `get(id)`. |

Importing the package touches no browser globals, so it is safe in server rendering and Node.

## License

MIT for this package's own code. It also contains code ported from msfa under the Apache License 2.0; `NOTICE` lists the files.
