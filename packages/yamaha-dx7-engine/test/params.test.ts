import { test } from "node:test";
import assert from "node:assert/strict";
import { OPERATORS, VOICE_BYTES, VOICE_FIELDS, voiceField } from "../src/params.ts";

test("the field table covers the 155 VCED bytes exactly once", () => {
  const seen = new Array<number>(VOICE_BYTES).fill(0);
  for (const f of VOICE_FIELDS) seen[f.byte]!++;
  seen.slice(0, 145).forEach((n, i) => assert.equal(n, 1, `byte ${i}`));
  seen.slice(145).forEach((n, i) => assert.equal(n, 0, `name byte ${145 + i} is not a field`));
});

test("ranges match the manual's voice parameter table (p.31)", () => {
  const ranges: Record<string, number> = { r1: 99, l4: 99, bp: 99, ld: 99, rd: 99, lc: 3, rc: 3, rs: 7, ams: 3, kvs: 7, ol: 99, mode: 1, coarse: 31, fine: 99, detune: 14 };
  for (const op of OPERATORS) for (const [k, max] of Object.entries(ranges)) assert.equal(voiceField(`op${op}.${k}`).max, max, `op${op}.${k}`);
  assert.deepEqual([134, 135, 144].map(b => VOICE_FIELDS.find(f => f.byte === b)!.max), [31, 7, 48]);
});

test("operators are stored OP6 first", () => {
  assert.equal(voiceField("op6.r1").byte, 0);
  assert.equal(voiceField("op1.r1").byte, 105);
  assert.equal(voiceField("op3.ol").byte, 79);
  assert.equal(voiceField("op1.detune").byte, 125);
});

test("panel readings where the sources state them", () => {
  assert.equal(voiceField("op1.bp").display!(39), "C3");
  assert.equal(voiceField("op1.bp").display!(0), "A-1");
  assert.equal(voiceField("op1.bp").display!(99), "C8");
  assert.equal(voiceField("transpose").display!(24), "C3");
  assert.equal(voiceField("transpose").display!(12), "C2");
  assert.equal(voiceField("op1.detune").display!(0), "-7");
  assert.equal(voiceField("op1.detune").display!(14), "+7");
  assert.equal(voiceField("algorithm").display!(31), "32");
});

test("an unknown key throws", () => {
  assert.throws(() => voiceField("op7.r1"), /Unknown/);
});
