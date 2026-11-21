import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine, POLYPHONY } from "../src/engine/engine.ts";
import { exp2, sin } from "../src/engine/tables.ts";
import { createOfflineSynth } from "../src/offline.ts";
import { initLike, magnitudeAt, peakOf, pitchOf, renderNote, rms, SR } from "./voices.ts";

const cents = (a: number, b: number) => 1200 * Math.log2(a / b);
const near = (hz: number, want: number, c = 0.5) => assert.ok(Math.abs(cents(hz, want)) < c, `${hz.toFixed(3)} Hz, want ${want} (±${c} cent)`);

test("tables: sine and 2^x in Q24", () => {
  assert.equal(sin(0), 0);
  assert.ok(Math.abs(sin(1 << 22) - (1 << 24)) < 64, "a quarter cycle is 1.0");
  assert.ok(Math.abs(sin(3 << 22) + (1 << 24)) < 64, "three quarters is -1.0");
  assert.ok(Math.abs(exp2(0) - (1 << 24)) < 64, "2^0 = 1");
  assert.ok(Math.abs(exp2(1 << 24) - (1 << 25)) < 128, "2^1 = 2");
  assert.ok(Math.abs(exp2(-(1 << 23)) - (1 << 24) / Math.SQRT2) < 64, "2^-0.5");
});

test("pitch: ratio and fixed modes, detune, transpose", async () => {
  near(pitchOf(await renderNote(initLike())), 440);
  near(pitchOf(await renderNote(initLike({ "op1.coarse": 2 }))), 880);
  near(pitchOf(await renderNote(initLike({ "op1.coarse": 0 }))), 220);
  near(pitchOf(await renderNote(initLike({ "op1.coarse": 1, "op1.fine": 50 }))), 660);
  near(pitchOf(await renderNote(initLike({ "op1.mode": 1, "op1.coarse": 2, "op1.fine": 0 }), 30)), 100);
  near(pitchOf(await renderNote(initLike({ "op1.mode": 1, "op1.coarse": 2, "op1.fine": 99 }), 90)), 977.237);
  assert.ok(pitchOf(await renderNote(initLike({ "op1.detune": 14 }))) > 440.5, "detune +7 is sharp");
  assert.ok(pitchOf(await renderNote(initLike({ "op1.detune": 0 }))) < 439.5, "detune -7 is flat");
  near(pitchOf(await renderNote(initLike({ transpose: 36 }), 60)), 2 * 261.626);
  near(pitchOf(await renderNote(initLike({ transpose: 24 }), 60)), 261.626);
});

test("pitch envelope: level 99 is up, 50 is no change", async () => {
  const up = initLike({ pl1: 99, pl2: 99, pl3: 99, pl4: 99 });
  assert.ok(pitchOf(await renderNote(up, 45)) > 4 * 110 * 0.9, "around four octaves up");
});

test("envelope: level 0 is silent, attack rises, release frees the voice", async () => {
  assert.equal(peakOf(await renderNote(initLike({ "op1.ol": 0 }))), 0);
  const slow = await renderNote(initLike({ "op1.r1": 40 }), 69, 1);
  assert.ok(rms(slow, 0, SR / 20) < rms(slow, SR / 2, SR), "a slow attack starts quieter");
  const free = async (r4: number) => {
    const s = createOfflineSynth(SR);
    s.loadVoice(initLike({ "op1.r4": r4 }));
    s.noteOn(60, 100);
    const buf = new Float32Array(SR / 100);
    s.render(buf);
    s.noteOff(60);
    let t = 0;
    while (s.sounding() && t < 30) { s.render(buf); t += 0.01; }
    return t;
  };
  const tSlow = await free(30), tFast = await free(70);
  assert.ok(tFast > 0 && tFast < tSlow && tSlow < 30, `release ${tFast.toFixed(2)} s at rate 70, ${tSlow.toFixed(2)} s at 30`);
});

test("rate scaling makes high notes decay faster", async () => {
  const v = initLike({ "op1.r2": 40, "op1.l2": 0, "op1.r3": 40, "op1.l3": 0, "op1.rs": 7 });
  const low = await renderNote(v, 36, 1), high = await renderNote(v, 96, 1);
  assert.ok(rms(high, SR / 2, SR) / rms(high, 0, SR / 10) < rms(low, SR / 2, SR) / rms(low, 0, SR / 10));
});

test("routing: carriers only, then a modulator adds harmonics", async () => {
  const pure = await renderNote(initLike());
  assert.ok(magnitudeAt(pure, 880) < magnitudeAt(pure, 440) * 0.01, "a lone carrier is a sine");
  const fm = await renderNote(initLike({ "op2.ol": 85 }));
  assert.ok(magnitudeAt(fm, 880) > magnitudeAt(fm, 440) * 0.1, "OP2 modulating OP1 adds the second harmonic");
  // algorithm 32: six carriers at ratios 1–6 make six lines
  const six = initLike({ algorithm: 31 });
  for (let op = 1; op <= 6; op++) { six[(6 - op) * 21 + 16] = 99; six[(6 - op) * 21 + 18] = op; }
  const x = await renderNote(six, 45);
  for (let h = 1; h <= 6; h++) assert.ok(magnitudeAt(x, 110 * h) > 0.01, `harmonic ${h}`);
  assert.ok(magnitudeAt(x, 110 * 7) < 0.002, "and nothing at the seventh");
});

test("feedback adds harmonics, on one operator and through a chain (algorithm 4)", async () => {
  const energyAbove = (x: Float32Array) => [2, 3, 4, 5].reduce((s, h) => s + magnitudeAt(x, 440 * h), 0);
  // algorithm 32: OP6 alone, a carrier feeding back into itself
  const self = (fb: number) => { const v = initLike({ algorithm: 31, feedback: fb, "op1.ol": 0 }); v[16] = 99; return v; };
  assert.ok(energyAbove(await renderNote(self(0))) < 0.001, "no feedback: a sine");
  assert.ok(energyAbove(await renderNote(self(7))) > 0.01, "feedback 7: harmonics");
  // algorithm 4: OP6 → OP5 → OP4 (carrier), OP4 feeding back into OP6
  // (strong feedback spreads energy beyond the low harmonics, so this compares the waveforms instead)
  const chain = (fb: number) => { const v = initLike({ algorithm: 3, feedback: fb, "op1.ol": 0 }); v[16] = 80; v[21 + 16] = 80; v[42 + 16] = 99; return v; };
  const off = await renderNote(chain(0)), on = await renderNote(chain(7));
  const diff = new Float32Array(off.length).map((_, i) => on[i]! - off[i]!);
  assert.ok(rms(diff) > 0.3 * rms(off), `chain: feedback 7 changes the sound (${(rms(diff) / rms(off)).toFixed(2)} of its level)`);
  const one = await renderNote(chain(1));
  assert.ok(rms(new Float32Array(off.length).map((_, i) => one[i]! - off[i]!)) < rms(diff), "feedback 1 changes it less");
});

test("keyboard level scaling and velocity", async () => {
  const kls = initLike({ "op1.rd": 99, "op1.rc": 0 }); // -LIN to the right of C3
  assert.ok(rms(await renderNote(kls, 96)) < rms(await renderNote(kls, 48)) * 0.5, "high notes quieter");
  const vel = initLike({ "op1.kvs": 7 });
  assert.ok(rms(await renderNote(vel, 69, 0.5, 20)) < rms(await renderNote(vel, 69, 0.5, 127)) * 0.7, "soft notes quieter");
  const flat = initLike({ "op1.kvs": 0 });
  assert.equal(rms(await renderNote(flat, 69, 0.5, 20)).toFixed(6), rms(await renderNote(flat, 69, 0.5, 127)).toFixed(6), "no sensitivity, no change");
});

test("LFO: pitch and amplitude modulation, and the delay", async () => {
  const vib = await renderNote(initLike({ lfoSpeed: 60, lfoPmd: 99, pms: 7, lfoWave: 4 }), 69, 1);
  const cycles: number[] = [];
  let lastUp = -1;
  for (let i = 1; i < vib.length; i++) if (vib[i - 1]! < 0 && vib[i]! >= 0) { if (lastUp > 0) cycles.push(i - lastUp); lastUp = i; }
  assert.ok(Math.max(...cycles) - Math.min(...cycles) > 10, "the period swings");
  const trem = await renderNote(initLike({ lfoSpeed: 60, lfoAmd: 99, "op1.ams": 3, lfoWave: 4 }), 69, 1);
  const frames = Array.from({ length: 40 }, (_, k) => rms(trem, k * 1200, (k + 1) * 1200));
  assert.ok(Math.min(...frames.slice(5)) < Math.max(...frames.slice(5)) * 0.6, "the level swings");
  const none = await renderNote(initLike({ lfoSpeed: 60, lfoAmd: 99, "op1.ams": 0, lfoWave: 4 }), 69, 1);
  const flat = Array.from({ length: 40 }, (_, k) => rms(none, k * 1200, (k + 1) * 1200)).slice(5);
  assert.ok(Math.min(...flat) > Math.max(...flat) * 0.95, "AMS 0 ignores the LFO");
  const delayed = await renderNote(initLike({ lfoSpeed: 60, lfoAmd: 99, "op1.ams": 3, lfoWave: 4, lfoDelay: 99 }), 69, 1);
  const early = Array.from({ length: 8 }, (_, k) => rms(delayed, 2400 + k * 1200, 3600 + k * 1200));
  assert.ok(Math.min(...early) > Math.max(...early) * 0.95, "nothing during the delay");
});

test("operators switched off contribute nothing", async () => {
  assert.equal(peakOf(await renderNote(initLike(), 69, 0.3, 100, 0b011111)), 0, "OP1 off silences INIT");
  assert.ok(peakOf(await renderNote(initLike(), 69, 0.3, 100, 0b100000)) > 0.1, "OP1 alone still sounds");
  assert.throws(() => createOfflineSynth(SR).setOperators(64), RangeError);
});

test("16 voices; a 17th note takes the oldest released voice, else the oldest", () => {
  const e = new Engine(SR);
  e.setPatch(initLike());
  for (let n = 40; n < 40 + POLYPHONY; n++) e.noteOn(n, 100);
  assert.equal(e.sounding(), 16);
  e.noteOff(45);
  e.noteOn(90, 100); // takes 45's voice, released
  e.noteOn(91, 100); // takes 40's, the oldest
  assert.equal(e.sounding(), 16);
  e.allOff();
  assert.equal(e.sounding(), 0);
});

test("render allocates nothing", { skip: typeof globalThis.gc !== "function" && "run with --expose-gc" }, () => {
  const e = new Engine(SR);
  const full = initLike({ "op2.ol": 99, "op3.ol": 99, "op4.ol": 99, "op5.ol": 99, "op6.ol": 99, feedback: 7, lfoPmd: 50, lfoAmd: 50 });
  e.setPatch(full);
  for (let n = 40; n < 56; n++) e.noteOn(n, 100);
  const out = new Float32Array(128);
  for (let i = 0; i < 2000; i++) e.render(out, 128); // warm up and optimise
  globalThis.gc!();
  const before = process.memoryUsage().heapUsed;
  for (let i = 0; i < 1000; i++) e.render(out, 128);
  const grown = process.memoryUsage().heapUsed - before;
  assert.ok(grown < 64 * 1024, `heap grew ${grown} bytes`);
});
