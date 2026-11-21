import { test } from "node:test";
import assert from "node:assert/strict";
import { Engine, POLYPHONY } from "../src/engine/engine.ts";

test("16 voices: a 17th note takes the oldest", () => {
  const e = new Engine(48000);
  for (let n = 40; n < 40 + POLYPHONY; n++) e.noteOn(n, 100);
  assert.equal(e.sounding(), 16);
  e.noteOn(80, 100);
  assert.equal(e.sounding(), 16);
  e.noteOff(40); // stolen, so releasing it frees nothing
  assert.equal(e.sounding(), 16);
  e.noteOff(41);
  assert.equal(e.sounding(), 15);
});

test("a note struck again restarts on its own voice", () => {
  const e = new Engine(48000);
  e.noteOn(60, 100);
  e.noteOn(60, 50);
  assert.equal(e.sounding(), 1);
  e.noteOff(60);
  assert.equal(e.sounding(), 0);
});

test("all notes off frees every voice", () => {
  const e = new Engine(48000);
  [60, 64, 67].forEach(n => e.noteOn(n, 100));
  e.allOff();
  assert.equal(e.sounding(), 0);
});
