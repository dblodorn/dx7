import { test } from "node:test";
import assert from "node:assert/strict";
import { fromSyx, getName, readVoice } from "../src/codec.ts";
import { checksum, parse, splitMessages, unpackVoice } from "../src/sysex.ts";
import { message, testVoice } from "./voices.ts";

test("a single voice parses, with its channel and name", () => {
  const v = testVoice({ "op1.ol": 99, algorithm: 4 }, "E.PIANO 1");
  const m = message(0, v, 3);
  assert.equal(m.length, 163);
  assert.deepEqual([...m.slice(0, 6)], [0xf0, 0x43, 0x02, 0x00, 0x01, 0x1b]);
  const p = parse(m);
  assert.ok(!("error" in p) && p.type === "voice");
  assert.equal(p.channel, 3);
  assert.deepEqual(p.data, v);
  assert.equal(getName(p.data), "E.PIANO 1");
});

test("a damaged dump reports a checksum mismatch and yields no voice", () => {
  const m = message(0, testVoice());
  m[20] = m[20]! ^ 1;
  assert.deepEqual(parse(m), { error: "checksum mismatch", format: 0 });
  assert.equal(fromSyx(m).items.length, 0);
});

test("checksum is the 7-bit two's complement of the data sum", () => {
  assert.equal(checksum([1, 2, 3]), 0x7a);
  assert.equal(checksum([0x40, 0x40]), 0x00);
});

test("packed fields unpack to their VCED bytes", () => {
  const p = new Uint8Array(128);
  p[11] = (2 << 2) | 1; // right curve +EXP, left curve -EXP
  p[12] = (14 << 3) | 7; // detune +7, rate scaling 7 (0x77)
  p[13] = (5 << 2) | 3; // velocity sens 5, amp mod sens 3
  p[15] = (31 << 1) | 1; // coarse 31, fixed
  p[110] = 31; p[111] = (1 << 3) | 7; p[116] = (7 << 4) | (5 << 1) | 1;
  "BANK VOICE".split("").forEach((c, i) => { p[118 + i] = c.charCodeAt(0); });
  const v = unpackVoice(p);
  assert.deepEqual([v[11], v[12], v[13], v[20], v[14], v[15], v[17], v[18]], [1, 2, 7, 14, 3, 5, 1, 31]);
  assert.deepEqual([v[134], v[135], v[136], v[141], v[142], v[143]], [31, 7, 1, 1, 5, 7]);
  assert.equal(getName(v), "BANK VOICE");
});

test("a bank parses to 32 voices and counts voices with unused bits", () => {
  const data = new Uint8Array(4096);
  for (let i = 0; i < 32; i++) data[i * 128 + 118] = 65 + i % 26;
  data[5 * 128 + 110] = 0x40; // an unused bit in voice 6
  const p = parse(message(9, data));
  assert.ok(!("error" in p) && p.type === "bank");
  assert.equal(p.voices.length, 32);
  assert.equal(p.unusedBits, 1);
  assert.equal(getName(p.voices[2]!), "C");
});

test("a mixed file: every voice in order, other Yamaha formats reported as unsupported", () => {
  const aced = Uint8Array.from([0xf0, 0x43, 0x00, 0x05, 0x00, 0x31, ...new Uint8Array(49), 0, 0xf7]);
  const file = Uint8Array.from([...message(0, testVoice({}, "FIRST")), ...aced, ...message(9, new Uint8Array(4096))]);
  assert.equal(splitMessages(file).length, 3);
  const r = fromSyx(file);
  assert.equal(r.items.length, 33);
  assert.equal(r.items[0]!.name, "FIRST");
  assert.equal(r.items[1]!.from, "bank");
  assert.equal(r.errors.length, 1);
  assert.equal(r.errors[0]!.unsupported, true);
});

test("readVoice takes 155 bytes or one voice message, nothing else", () => {
  const v = testVoice();
  assert.deepEqual(readVoice(v), v);
  assert.deepEqual(readVoice(message(0, v)), v);
  assert.throws(() => readVoice(new Uint8Array(128)), RangeError);
  assert.throws(() => readVoice(message(9, new Uint8Array(4096))), RangeError);
});
