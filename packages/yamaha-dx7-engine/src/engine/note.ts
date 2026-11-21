// One sounding voice: six operators with their envelopes, the voice's pitch envelope and modulation, rendered a
// 64-sample block at a time into the mix.
//
// Ported from msfa dx7note.cc (frequency, keyboard level and rate scaling, velocity, pitch modulation) and
// fm_core.cc / fm_op_kernel.cc (the operator: phase modulation, the gain ramp across a block, self-feedback as the
// average of the last two outputs): Copyright 2012 Google Inc., Apache License 2.0 (see NOTICE).
// Written here (msfa leaves them out): the routing reads this package's algorithm table and runs per sample, so
// algorithms 4 and 6, whose feedback loops through a chain of operators, get it too; amplitude modulation;
// transpose; OSC KEY SYNC off (phases carry over); operators switched off. Numbers in calibration.ts.

import { ALGORITHMS } from "../algorithms.ts";
import {
  AM_MAX, AMP_MOD_SENS, COARSE_MUL, DETUNE_FIXED, DETUNE_RATIO, EXP_SCALE_DATA, LEVEL_THRESH, LG_N, N, PITCH_MOD_SENS,
  VELOCITY_DATA,
} from "./calibration.ts";
import { Env, scaleOutLevel } from "./env.ts";
import { PitchEnv } from "./pitchenv.ts";
import { exp2, freq, sin } from "./tables.ts";

// log2(Hz) of a MIDI note in Q24. PORTED dx7note.cc midinote_to_logfreq
export const noteLogFreq = (note: number): number => 50857777 + Math.floor((1 << 24) / 12) * note;

// PORTED dx7note.cc osc_freq
export function oscLogFreq(note: number, fixed: boolean, coarse: number, fine: number, detune: number): number {
  if (!fixed) {
    let lf = noteLogFreq(note) + COARSE_MUL[coarse & 31]!;
    if (fine) lf += Math.floor(24204406.323123 * Math.log(1 + 0.01 * fine) + 0.5);
    return lf + DETUNE_RATIO * (detune - 7);
  }
  const lf = (4458616 * ((coarse & 3) * 100 + fine)) >> 3;
  return lf + (detune > 7 ? DETUNE_FIXED * (detune - 7) : 0);
}

// PORTED dx7note.cc ScaleVelocity, ScaleRate, ScaleCurve, ScaleLevel
const scaleVelocity = (velocity: number, sens: number): number =>
  ((sens * (VELOCITY_DATA[Math.max(0, Math.min(127, velocity)) >> 1]! - 239) + 7) >> 3) << 4;
const scaleRate = (note: number, sens: number): number => (sens * Math.min(31, Math.max(0, Math.floor(note / 3) - 7))) >> 3;
function scaleCurve(group: number, depth: number, curve: number): number {
  const scale = curve === 0 || curve === 3
    ? (group * depth * 329) >> 12
    : (EXP_SCALE_DATA[Math.min(group, EXP_SCALE_DATA.length - 1)]! * depth * 329) >> 15;
  return curve < 2 ? -scale : scale;
}
function scaleLevel(note: number, bp: number, ld: number, rd: number, lc: number, rc: number): number {
  const offset = note - bp - 17;
  return offset >= 0 ? scaleCurve(Math.floor(offset / 3), rd, rc) : scaleCurve(Math.floor(-offset / 3), ld, lc);
}

const Q24 = 1 / (1 << 24);

export class Note {
  readonly env = [new Env(), new Env(), new Env(), new Env(), new Env(), new Env()];
  readonly pitchEnv: PitchEnv;
  key = -1; // the MIDI note it was started with; -1 free
  started = 0; // for stealing the oldest
  private readonly basePitch = new Float64Array(6);
  private readonly phase = new Int32Array(6);
  private readonly freq = new Int32Array(6);
  private readonly gain0 = new Float64Array(6);
  private readonly gain1 = new Float64Array(6);
  private readonly dgain = new Float64Array(6); // per-sample gain step across this block
  private readonly ams = new Int32Array(6);
  private readonly out = new Int32Array(6); // this sample's output per operator
  private readonly mods: number[][] = [[], [], [], [], [], []]; // per operator index, the indices modulating it
  private readonly carrier = new Uint8Array(6);
  private fbFrom = 0;
  private fbTo = 0;
  private fbShift = 16;
  private fb0 = 0;
  private fb1 = 0;
  private pitchModDepth = 0;
  private pitchModSens = 0;
  private ampModDepth = 0;
  private silentBlocks = 0;

  constructor(sampleRate: number, envRateFactor: number) {
    this.pitchEnv = new PitchEnv(sampleRate);
    for (const e of this.env) e.setSampleRate(envRateFactor);
  }

  start(voice: Uint8Array, key: number, velocity: number, started: number): void {
    this.key = key;
    this.started = started;
    this.silentBlocks = 0;
    // transpose moves the pitch; scaling follows the key played (ESTIMATE: which one the DX7 scales by)
    const pitchNote = key + voice[144]! - 24;
    for (let i = 0; i < 6; i++) {
      const b = i * 21;
      let outlevel = scaleOutLevel(voice[b + 16]!);
      outlevel += scaleLevel(key, voice[b + 8]!, voice[b + 9]!, voice[b + 10]!, voice[b + 11]!, voice[b + 12]!);
      outlevel = Math.min(127, outlevel) << 5;
      outlevel = Math.max(0, outlevel + scaleVelocity(velocity, voice[b + 15]!));
      this.env[i]!.init(voice, b, outlevel, scaleRate(key, voice[b + 13]!));
      this.basePitch[i] = oscLogFreq(pitchNote, voice[b + 17] === 1, voice[b + 18]!, voice[b + 19]!, voice[b + 20]!);
      this.ams[i] = AMP_MOD_SENS[voice[b + 14]! & 3]!;
      if (voice[136] !== 0) this.phase[i] = 0; // OSC KEY SYNC on; off keeps the slot's phases
      this.gain1[i] = 0;
    }
    this.pitchEnv.init(voice);
    const alg = ALGORITHMS[voice[134]! & 31]!;
    for (let i = 0; i < 6; i++) { this.mods[i]!.length = 0; this.carrier[i] = 0; }
    for (const [from, to] of alg.edges) this.mods[6 - to]!.push(6 - from);
    for (const c of alg.carriers) this.carrier[6 - c] = 1;
    this.fbFrom = 6 - alg.feedback[0];
    this.fbTo = 6 - alg.feedback[1];
    const fb = voice[135]! & 7;
    this.fbShift = fb !== 0 ? 8 - fb : 16;
    this.fb0 = 0; this.fb1 = 0;
    this.pitchModDepth = (voice[139]! * 165) >> 6;
    this.pitchModSens = PITCH_MOD_SENS[voice[143]! & 7]!;
    this.ampModDepth = (voice[140]! * 165) >> 6;
  }

  release(): void {
    for (const e of this.env) e.keyDown(false);
    this.pitchEnv.keyDown(false);
  }

  get released(): boolean { return this.env[0]!.released; }

  // Done once released and every carrier has been below the threshold for a whole block.
  get finished(): boolean { return this.released && this.silentBlocks > 0; }

  // Adds one block into mix[0…N). lfo and lfoDelay are 0…2^24; mask is parameter 155 (bit 5 OP1 … bit 0 OP6).
  render(mix: Float64Array, lut: Int32Array, lfo: number, lfoDelay: number, mask: number): void {
    // pitch: envelope plus LFO × PMD × PMS (PORTED dx7note.cc compute)
    let pitchMod = this.pitchEnv.sample();
    const pmd = this.pitchModDepth * lfoDelay;
    const sensLfo = this.pitchModSens * (lfo - (1 << 23));
    pitchMod += Math.floor((pmd * sensLfo) / 2 ** 39);
    // amplitude: LFO × AMD × AMS lowers each operator's log level (ESTIMATE)
    const am = ((this.ampModDepth / 255) * (lfoDelay / (1 << 24)) * (lfo / (1 << 24)) * AM_MAX) / 255;
    let audible = false;
    for (let i = 0; i < 6; i++) {
      this.gain0[i] = this.gain1[i]!;
      const level = this.env[i]!.sample() - Math.floor(am * this.ams[i]!);
      this.gain1[i] = (mask >> i) & 1 ? exp2(level - (14 << 24)) : 0;
      this.freq[i] = freq(lut, this.basePitch[i]! + pitchMod);
      this.dgain[i] = Math.floor((this.gain1[i]! - this.gain0[i]! + (N >> 1)) / N);
      if (this.carrier[i] && (this.gain0[i]! >= LEVEL_THRESH || this.gain1[i]! >= LEVEL_THRESH)) audible = true;
    }
    if (this.released && !audible) this.silentBlocks++;

    const fbTo = this.fbTo, fbFrom = this.fbFrom, fbShift = this.fbShift, out = this.out;
    for (let s = 0; s < N; s++) {
      // OP6 to OP1 (index i is operator 6 − i, as in the voice bytes): in every algorithm a modulator has a higher
      // number than what it modulates, so its sample is ready
      for (let i = 0; i < 6; i++) {
        const g0 = this.gain0[i]!, g1 = this.gain1[i]!;
        if (g0 < LEVEL_THRESH && g1 < LEVEL_THRESH) { out[i] = 0; continue; }
        const gain = g0 + this.dgain[i]! * (s + 1);
        let input = 0;
        const m = this.mods[i]!;
        for (let k = 0; k < m.length; k++) input += out[m[k]!]!;
        if (i === fbTo && fbShift < 16) input += (this.fb0 + this.fb1) >> (fbShift + 1);
        const y = sin((this.phase[i]! + s * this.freq[i]! + input) | 0);
        out[i] = Math.floor(y * gain * Q24); // y·gain < 2^50: exact in a double
      }
      this.fb0 = this.fb1;
      this.fb1 = out[fbFrom]!;
      let sum = 0;
      for (let i = 0; i < 6; i++) if (this.carrier[i]) sum += out[i]!;
      mix[s] = mix[s]! + sum;
    }
    for (let i = 0; i < 6; i++) this.phase[i] = (this.phase[i]! + (this.freq[i]! << LG_N)) | 0;
  }
}
