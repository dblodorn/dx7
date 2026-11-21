// The DX7 emulator, shared by the AudioWorklet and the offline synth: 16 preallocated voices, one LFO, rendered in
// 64-sample blocks. render() adds into its output and never allocates.

import { ENV_RATE_REFERENCE, N, OUTPUT_SCALE } from "./calibration.ts";
import { Lfo } from "./lfo.ts";
import { Note } from "./note.ts";
import { freqTable } from "./tables.ts";

export const POLYPHONY = 16;
const ALL_OPERATORS = 0b111111;

export class Engine {
  readonly sampleRate: number;
  private patch: Uint8Array | null = null;
  private readonly notes: Note[] = [];
  private readonly lfo: Lfo;
  private readonly lut: Int32Array;
  private readonly mix = new Float64Array(N);
  private readonly block = new Float32Array(N); // the current block, scaled
  private blockPos = N; // samples of `block` already handed out
  private clock = 0;
  private mask = ALL_OPERATORS;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.lfo = new Lfo(sampleRate);
    this.lut = freqTable(sampleRate);
    for (let i = 0; i < POLYPHONY; i++) this.notes.push(new Note(sampleRate, ENV_RATE_REFERENCE / sampleRate));
  }

  // Notes already sounding keep the voice they started with.
  setPatch(voice: Uint8Array): void {
    this.patch = voice;
    this.lfo.reset(voice);
  }
  get hasPatch(): boolean { return this.patch !== null; }

  // Parameter 155: bit 5 OP1 … bit 0 OP6. Applies to every voice at once, as on the DX7.
  setOperators(mask: number): void { this.mask = mask & ALL_OPERATORS; }

  // A key already sounding restarts on its own voice; otherwise a free voice, else the oldest released one, else the
  // oldest.
  noteOn(note: number, velocity: number): void {
    if (!this.patch) return;
    let v = this.notes.find(n => n.key === note && !n.released);
    v ??= this.notes.find(n => n.key < 0);
    v ??= this.oldest(true) ?? this.oldest(false);
    this.lfo.keyDown();
    v!.start(this.patch, note, velocity, ++this.clock);
  }

  noteOff(note: number): void {
    for (const n of this.notes) if (n.key === note && !n.released) n.release();
  }

  allOff(): void {
    for (const n of this.notes) n.key = -1;
  }

  // Voices sounding, released ones included until they fall silent.
  sounding(): number {
    let k = 0;
    for (const n of this.notes) if (n.key >= 0) k++;
    return k;
  }

  // Adds `frames` mono samples into out[offset…].
  render(out: Float32Array, frames: number, offset = 0): void {
    let i = 0;
    while (i < frames) {
      if (this.blockPos === N) this.renderBlock();
      const n = Math.min(N - this.blockPos, frames - i);
      for (let k = 0; k < n; k++) out[offset + i + k] = out[offset + i + k]! + this.block[this.blockPos + k]!;
      this.blockPos += n;
      i += n;
    }
  }

  private renderBlock(): void {
    this.mix.fill(0);
    const lfo = this.lfo.sample(), delay = this.lfo.delay();
    for (let v = 0; v < POLYPHONY; v++) {
      const n = this.notes[v]!;
      if (n.key < 0) continue;
      n.render(this.mix, this.lut, lfo, delay, this.mask);
      if (n.finished) n.key = -1;
    }
    for (let k = 0; k < N; k++) this.block[k] = this.mix[k]! * OUTPUT_SCALE;
    this.blockPos = 0;
  }

  private oldest(releasedOnly: boolean): Note | undefined {
    let best: Note | undefined;
    for (const n of this.notes) if ((!releasedOnly || n.released) && (!best || n.started < best.started)) best = n;
    return best;
  }
}
