import { test } from "node:test";
import assert from "node:assert/strict";
import * as pkg from "../src/index.ts";
import { frequency } from "../src/codec.ts";
import { testVoice } from "./voices.ts";

test("nothing exported writes a voice or builds SysEx", () => {
  const writers = Object.keys(pkg).filter(k => /^(set|init|pack|to[A-Z]|build|write|frame)/.test(k));
  assert.deepEqual(writers, []);
});

test("frequency reads as the panel shows it (manual p.15)", () => {
  assert.equal(frequency(testVoice({ "op2.coarse": 0 }), 2).text, "×0.50");
  assert.equal(frequency(testVoice({ "op2.coarse": 2 }), 2).text, "×2.00");
  assert.equal(frequency(testVoice({ "op2.coarse": 1, "op2.fine": 99 }), 2).text, "×1.99");
  assert.equal(frequency(testVoice({ "op2.mode": 1, "op2.coarse": 2, "op2.fine": 99 }), 2).text, "977.2 HZ");
  assert.equal(frequency(testVoice({ "op2.mode": 1, "op2.coarse": 4 }), 2).text, "1.000 HZ"); // coarse wraps every 4
});
