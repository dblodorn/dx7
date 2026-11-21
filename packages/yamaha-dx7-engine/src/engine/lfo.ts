// The LFO, one for the whole instrument as on the DX7: six waves, speed, delay (restarted by each key-on), key sync.
// Stepped once per 64-sample block; its value is 0…2^24 (centre 2^23). Ported from msfa lfo.cc: Copyright 2012
// Google Inc., Apache License 2.0 (see NOTICE). Unsigned 32-bit arithmetic is written with `>>> 0`.

import { LFO_UNIT, N } from "./calibration.ts";
import { sin } from "./tables.ts";

export class Lfo {
  private readonly unit: number;
  private phase = 0; // uint32
  private delta = 0;
  private wave = 0;
  private sync = false;
  private rand = 0;
  private delayState = 0; // uint32
  private delayInc = 0;
  private delayInc2 = 0;

  constructor(sampleRate: number) {
    this.unit = Math.floor((N * LFO_UNIT) / sampleRate + 0.5);
  }

  // From the voice: speed, delay, (PMD, AMD), sync, wave at bytes 137–142.
  reset(voice: Uint8Array): void {
    const rate = voice[137]!;
    let sr = rate === 0 ? 1 : (165 * rate) >> 6;
    sr *= sr < 160 ? 11 : 11 + ((sr - 160) >> 4);
    this.delta = (this.unit * sr) >>> 0;
    let a = 99 - voice[138]!;
    if (a === 99) {
      this.delayInc = 0xffffffff;
      this.delayInc2 = 0xffffffff;
    } else {
      a = (16 + (a & 15)) << (1 + (a >> 4));
      this.delayInc = (this.unit * a) >>> 0;
      a &= 0xff80;
      a = Math.max(0x80, a);
      this.delayInc2 = (this.unit * a) >>> 0;
    }
    this.sync = voice[141] !== 0;
    this.wave = voice[142]!;
  }

  sample(): number {
    this.phase = (this.phase + this.delta) >>> 0;
    const p = this.phase;
    switch (this.wave) {
      case 0: return ((p >>> 7) ^ -(p >>> 31)) & 0xffffff; // triangle
      case 1: return ((~p ^ 0x80000000) >>> 8); // saw down
      case 2: return ((p ^ 0x80000000) >>> 8); // saw up
      case 3: return (~p >>> 7) & (1 << 24); // square
      case 4: return (1 << 23) + (sin(p >>> 8) >> 1); // sine
      case 5: // sample and hold
        if (p < this.delta) this.rand = (this.rand * 179 + 17) & 0xff;
        return ((this.rand ^ 0x80) + 1) << 16;
    }
    return 1 << 23;
  }

  // 0 during the delay, rising to 2^24
  delay(): number {
    const delta = this.delayState < 0x80000000 ? this.delayInc : this.delayInc2;
    const d = (this.delayState + delta) >>> 0;
    if (d < this.delayInc) return 1 << 24;
    this.delayState = d;
    return d < 0x80000000 ? 0 : (d >>> 7) & 0xffffff;
  }

  keyDown(): void {
    if (this.sync) this.phase = 0x7fffffff;
    this.delayState = 0;
  }
}
