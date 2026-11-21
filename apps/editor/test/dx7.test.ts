import { test } from "node:test";
import assert from "node:assert/strict";
import { enableMask, get, getName, initVoice, operatorBytes, packVoice, set, setMany, setName, setOperator, unpackVoice, VOICE_FIELDS } from "../lib/dx7/codec.ts";
import { fromSyx, parse, toBankSysex, toParamChange, toSyx, toSysex } from "../lib/dx7/sysex.ts";

const random = (seed: number) => () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
function randomVoice(r: () => number): Uint8Array {
  let v = initVoice();
  for (const f of VOICE_FIELDS) v = set(v, f.key, Math.floor(r() * (f.max + 1)));
  return setName(v, "RND " + Math.floor(r() * 1e6));
}

test("every field set alone changes only its own byte", () => {
  const base = initVoice();
  for (const f of VOICE_FIELDS) {
    const v = set(base, f.key, base[f.byte] === f.max ? f.min : f.max);
    const changed = [...v].map((b, i) => (b !== base[i] ? i : -1)).filter(i => i >= 0);
    assert.deepEqual(changed, [f.byte], f.key);
  }
});

test("set clamps to the field's range, and keeps out-of-range bytes it doesn't touch", () => {
  assert.equal(get(set(initVoice(), "feedback", 12), "feedback"), 7);
  const odd = initVoice(); odd[0] = 120; // received from elsewhere
  assert.equal(setMany(odd, { algorithm: 4 })[0], 120);
});

test("INIT VOICE: OP1 alone at full level on algorithm 1", () => {
  const v = initVoice();
  assert.equal(getName(v), "INIT VOICE");
  assert.deepEqual([1, 2, 3, 4, 5, 6].map(op => get(v, `op${op}.ol`)), [99, 0, 0, 0, 0, 0]);
  assert.equal(get(v, "algorithm"), 0);
  assert.equal(get(v, "transpose"), 24);
});

test("names: printable ASCII, padded to 10", () => {
  assert.equal(getName(setName(initVoice(), "BRIGHTé")), "BRIGHT");
  assert.equal(getName(setName(initVoice(), "TOO LONG A NAME")), "TOO LONG A");
});

test("VCED → VMEM → VCED is the identity for random valid voices", () => {
  const r = random(7);
  for (let i = 0; i < 200; i++) {
    const v = randomVoice(r);
    assert.deepEqual(unpackVoice(packVoice(v)), v);
  }
});

test("packed byte 12 holds detune and rate scaling", () => {
  const v = setMany(initVoice(), { "op6.detune": 14, "op6.rs": 7 });
  assert.equal(packVoice(v)[12], 0x77);
});

test("a bank made here round-trips byte for byte, padded with INIT VOICE", () => {
  const r = random(42);
  const voices = Array.from({ length: 20 }, () => randomVoice(r));
  const bank = toBankSysex(voices, { channel: 2 });
  assert.equal(bank.length, 4104);
  assert.deepEqual([...bank.slice(0, 6)], [0xf0, 0x43, 0x01, 0x09, 0x20, 0x00]);
  const p = parse(bank);
  assert.ok(!("error" in p) && p.type === "bank");
  assert.deepEqual(p.voices.slice(0, 20), voices);
  assert.deepEqual(p.voices[31], initVoice());
  assert.deepEqual(toBankSysex(p.voices, { channel: 2 }), bank);
});

test("a single voice: 163 bytes on the chosen channel", () => {
  const m = toSysex(initVoice(), { channel: 5 });
  assert.equal(m.length, 163);
  assert.deepEqual([...m.slice(0, 6)], [0xf0, 0x43, 0x04, 0x00, 0x01, 0x1b]);
  assert.equal(fromSyx(toSyx([m, m])).items.length, 2);
});

test("one field's change sends differs only in that byte and the checksum", () => {
  const a = initVoice(), b = set(a, "op3.ol", 50);
  const ma = toSysex(a), mb = toSysex(b);
  const diff = [...ma].map((x, i) => (x !== mb[i] ? i : -1)).filter(i => i >= 0);
  assert.deepEqual(diff, [6 + 79, 162 - 1]);
});

test("parameter changes", () => {
  assert.deepEqual([...toParamChange(0, 50)], [0xf0, 0x43, 0x10, 0x00, 0x00, 50, 0xf7]);
  assert.deepEqual([...toParamChange(127, 1)], [0xf0, 0x43, 0x10, 0x00, 0x7f, 1, 0xf7]);
  assert.deepEqual([...toParamChange(128, 99, { channel: 16 })], [0xf0, 0x43, 0x1f, 0x01, 0x00, 99, 0xf7]);
  // OP1 off, the other five on
  const mask = enableMask({ 1: false, 2: true, 3: true, 4: true, 5: true, 6: true });
  assert.deepEqual([...toParamChange(155, mask)], [0xf0, 0x43, 0x10, 0x01, 0x1b, 0x1f, 0xf7]);
  assert.throws(() => toParamChange(156, 0), RangeError);
});

test("paste operator copies 21 bytes and nothing else", () => {
  const r = random(3);
  const v = randomVoice(r);
  const w = setOperator(v, 5, operatorBytes(v, 2));
  assert.deepEqual([...w.slice(21, 42)], [...v.slice(84, 105)]);
  [...w].forEach((b, i) => { if (i < 21 || i >= 42) assert.equal(b, v[i], `byte ${i}`); });
});
