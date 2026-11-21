// The emulator, shared by the AudioWorklet and the offline synth. This is the skeleton: it keeps the voice and
// assigns notes to 16 voices exactly as the real engine will, and renders silence. The emulator change replaces
// what a voice plays; the note bookkeeping stays. render() adds into its buffer and must never allocate.

export const POLYPHONY = 16;

export class Engine {
  readonly sampleRate: number;
  private patch: Uint8Array | null = null;
  // per voice: the note it plays (-1 when free), and when it started, for stealing the oldest
  private readonly notes = new Int16Array(POLYPHONY).fill(-1);
  private readonly started = new Float64Array(POLYPHONY);
  private clock = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setPatch(voice: Uint8Array): void { this.patch = voice; }
  get hasPatch(): boolean { return this.patch !== null; }

  // A note already sounding is restarted on its own voice; otherwise a free voice, else the oldest is taken.
  noteOn(note: number, _velocity: number): void {
    let v = this.notes.indexOf(note);
    if (v < 0) v = this.notes.indexOf(-1);
    if (v < 0) {
      v = 0;
      for (let i = 1; i < POLYPHONY; i++) if (this.started[i]! < this.started[v]!) v = i;
    }
    this.notes[v] = note;
    this.started[v] = ++this.clock;
  }

  // Without envelopes yet, a released voice is free at once.
  noteOff(note: number): void {
    const v = this.notes.indexOf(note);
    if (v >= 0) this.notes[v] = -1;
  }

  allOff(): void { this.notes.fill(-1); }

  // How many voices are sounding (for tests and meters).
  sounding(): number {
    let n = 0;
    for (let i = 0; i < POLYPHONY; i++) if (this.notes[i]! >= 0) n++;
    return n;
  }

  render(_out: Float32Array, _frames: number, _offset = 0): void {
    // silent until the emulator lands
  }
}
