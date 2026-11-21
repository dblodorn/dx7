// @dblodorn/yamaha-dx7-engine: the Yamaha DX7 emulator as a sound source. Everything here reads or plays a voice;
// nothing changes one or builds SysEx (that's the editor's, in apps/editor).
//
// The skeleton: the common surface of the engine-packages convention, with an engine that renders silence.

export { readVoice, VOICE_BYTES } from "./voice.ts";
export { POLYPHONY } from "./engine/engine.ts";
export { createOfflineSynth, type OfflineSynth } from "./offline.ts";
export { createSynth, type Synth, type SynthOptions } from "./synth.ts";
export type { PatchPage, PatchQuery, PatchSource, PatchSummary } from "./sources/patch-source.ts";
