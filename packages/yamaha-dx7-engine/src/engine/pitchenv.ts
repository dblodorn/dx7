// The pitch envelope: four rates and levels, 50 = no change, ±4 octaves, stepped once per 64-sample block.
// Ported from msfa pitchenv.cc: Copyright 2012 Google Inc., Apache License 2.0 (see NOTICE).

import { N, PITCH_ENV_SECONDS, PITCH_LEVELS, PITCH_RATES } from "./calibration.ts";

export class PitchEnv {
  private readonly unit: number;
  private readonly rates = new Int32Array(4);
  private readonly levels = new Int32Array(4);
  private level = 0; // log2 pitch offset, Q24
  private target = 0;
  private inc = 0;
  private rising = false;
  private ix = 0;
  private down = true;

  constructor(sampleRate: number) {
    this.unit = Math.floor((N * (1 << 24)) / (PITCH_ENV_SECONDS * sampleRate) + 0.5);
  }

  init(voice: Uint8Array): void {
    for (let i = 0; i < 4; i++) { this.rates[i] = voice[126 + i]!; this.levels[i] = voice[130 + i]!; }
    this.level = (PITCH_LEVELS[Math.min(99, this.levels[3]!)] ?? 0) * (1 << 19);
    this.down = true;
    this.advance(0);
  }

  sample(): number {
    if (this.ix < 3 || (this.ix < 4 && !this.down)) {
      if (this.rising) {
        this.level += this.inc;
        if (this.level >= this.target) { this.level = this.target; this.advance(this.ix + 1); }
      } else {
        this.level -= this.inc;
        if (this.level <= this.target) { this.level = this.target; this.advance(this.ix + 1); }
      }
    }
    return this.level;
  }

  keyDown(d: boolean): void {
    if (this.down !== d) { this.down = d; this.advance(d ? 0 : 3); }
  }

  private advance(ix: number): void {
    this.ix = ix;
    if (ix >= 4) return;
    this.target = (PITCH_LEVELS[Math.min(99, this.levels[ix]!)] ?? 0) * (1 << 19);
    this.rising = this.target > this.level;
    this.inc = (PITCH_RATES[Math.min(99, this.rates[ix]!)] ?? 0) * this.unit;
  }
}
