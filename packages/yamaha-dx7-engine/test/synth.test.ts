import { test } from "node:test";
import assert from "node:assert/strict";
import { createOfflineSynth } from "../src/offline.ts";
import { createSynth } from "../src/synth.ts";
import { PROCESSOR, type ToWorklet } from "../src/worklet/messages.ts";

// A stand-in AudioContext and AudioWorkletNode that record what reaches the worklet's port.
function fakeContext() {
  const posted: ToWorklet[] = [];
  const modules: string[] = [];
  const g = globalThis as Record<string, unknown>;
  g.AudioWorkletNode = class {
    readonly name: string;
    port = { postMessage: (m: ToWorklet) => posted.push(m), close() {} };
    constructor(_ctx: unknown, name: string) { this.name = name; }
    connect() {} disconnect() {}
  };
  const ctx = { audioWorklet: { addModule: async (url: string) => { modules.push(url); } } } as unknown as BaseAudioContext;
  return { ctx, posted, modules, restore: () => { delete g.AudioWorkletNode; } };
}

test("createSynth: checks on the main thread, so nothing bad is posted", async () => {
  const f = fakeContext();
  try {
    const s = await createSynth(f.ctx);
    assert.equal((s.output as unknown as { name: string }).name, PROCESSOR);
    assert.throws(() => s.loadVoice(new Uint8Array(128)), RangeError);
    assert.throws(() => s.noteOn(128), RangeError);
    assert.equal(f.posted.length, 0, "nothing reached the worklet");
    const voice = new Uint8Array(155);
    s.loadVoice(voice);
    voice[0] = 99;
    const sent = f.posted[0];
    assert.ok(sent?.type === "patch" && sent.data[0] === 0, "the voice is copied before posting");
    s.noteOn(60, 0);
    assert.deepEqual(f.posted[1], { type: "noteOff", note: 60 }, "velocity 0 is a note-off");
    s.dispose();
    assert.throws(() => s.noteOn(60), /disposed/);
  } finally { f.restore(); }
});

test("createSynth: the worklet is added once per context, from a URL when given", async () => {
  const f = fakeContext();
  try {
    await createSynth(f.ctx, { workletUrl: "/worklet.js" });
    await createSynth(f.ctx, { workletUrl: "/worklet.js" });
    assert.deepEqual(f.modules, ["/worklet.js"]);
  } finally { f.restore(); }
});

test("createOfflineSynth: takes 155-byte voices and renders silence", () => {
  const s = createOfflineSynth(48000);
  assert.throws(() => s.loadVoice(new Uint8Array(163)), RangeError);
  assert.throws(() => createOfflineSynth(0), RangeError);
  s.loadVoice(new Uint8Array(155));
  s.noteOn(60, 100);
  const out = new Float32Array(256).fill(1);
  s.render(out, 128, 64);
  assert.ok(out.subarray(64, 192).every(v => v === 0), "the rendered span is written");
  assert.equal(out[0], 1, "outside the span is untouched");
  assert.throws(() => s.render(out, 300), RangeError);
});
