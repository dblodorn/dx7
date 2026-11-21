// The operator envelope: four rates and levels in the DX7's log-level domain, stepped once per 64-sample block, with
// the attack's jump and exponential approach. Ported from msfa env.cc: Copyright 2012 Google Inc., Apache License
// 2.0 (see NOTICE). Added here: the increment scales with the sample rate (calibration.ENV_RATE_REFERENCE).

import { LEVEL_LUT, LG_N } from "./calibration.ts";

export const scaleOutLevel = (outlevel: number): number => (outlevel >= 20 ? 28 + outlevel : LEVEL_LUT[outlevel] ?? 0);

export class Env {
  private readonly rates = new Int32Array(4);
  private readonly levels = new Int32Array(4);
  private outlevel = 0;
  private rateScaling = 0;
  level = 0; // Q24-ish log level; read by the note for its gain
  private target = 0;
  private inc = 0;
  private rising = false;
  ix = 0; // 0–3 the stage, 4 finished
  private down = true;
  private rateFactor = 1; // ENV_RATE_REFERENCE / sample rate

  setSampleRate(factor: number): void { this.rateFactor = factor; }

  // A note starts; the level starts from 0, as in msfa.
  init(voice: Uint8Array, base: number, outlevel: number, rateScaling: number): void {
    for (let i = 0; i < 4; i++) { this.rates[i] = voice[base + i]!; this.levels[i] = voice[base + 4 + i]!; }
    this.outlevel = outlevel;
    this.rateScaling = rateScaling;
    this.level = 0;
    this.down = true;
    this.advance(0);
  }

  sample(): number {
    if (this.ix < 3 || (this.ix < 4 && !this.down)) {
      if (this.rising) {
        const jump = 1716 << 16;
        if (this.level < jump) this.level = jump;
        this.level += (((17 << 24) - this.level) >> 24) * this.inc;
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

  get released(): boolean { return !this.down; }

  private advance(ix: number): void {
    this.ix = ix;
    if (ix >= 4) return;
    let actual = ((scaleOutLevel(this.levels[ix]!) >> 1) << 6) + this.outlevel - 4256;
    if (actual < 16) actual = 16;
    this.target = actual << 16;
    this.rising = this.target > this.level;
    let qrate = ((this.rates[ix]! * 41) >> 6) + this.rateScaling;
    if (qrate > 63) qrate = 63;
    this.inc = Math.floor(((4 + (qrate & 3)) * 2 ** (2 + LG_N + (qrate >> 2))) * this.rateFactor);
  }
}
