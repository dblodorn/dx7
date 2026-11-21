import { test } from "node:test";
import assert from "node:assert/strict";
import code from "../src/worklet/code.generated.ts";
import { PROCESSOR } from "../src/worklet/messages.ts";
import { initLike } from "./voices.ts";

// The bundled worklet (the string createSynth loads) imported as a module in a stand-in AudioWorkletGlobalScope.
test("the generated worklet loads as a module and plays", async () => {
  const registered = new Map<string, new () => { port: { onmessage: ((e: { data: unknown }) => void) | null }; process(i: Float32Array[][], o: Float32Array[][]): boolean }>();
  const g = globalThis as Record<string, unknown>;
  g.sampleRate = 48000;
  g.AudioWorkletProcessor = class { port = { onmessage: null as unknown, postMessage() {} }; };
  g.registerProcessor = (name: string, ctor: never) => registered.set(name, ctor);
  try {
    await import(`data:text/javascript,${encodeURIComponent(code)}`);
    const Ctor = registered.get(PROCESSOR);
    assert.ok(Ctor, `registers "${PROCESSOR}"`);
    const p = new Ctor();
    p.port.onmessage!({ data: { type: "patch", data: initLike() } });
    p.port.onmessage!({ data: { type: "noteOn", note: 60, velocity: 100 } });
    const out = [[new Float32Array(128), new Float32Array(128)]];
    let peak = 0;
    for (let i = 0; i < 40; i++) { assert.equal(p.process([], out), true, "keeps running"); peak = Math.max(peak, ...out[0]![0]!.map(Math.abs)); }
    assert.ok(peak > 0.05, `sound after note-on (peak ${peak})`);
    p.port.onmessage!({ data: { type: "operators", mask: 0b011111 } });
    for (let i = 0; i < 4; i++) p.process([], out);
    assert.ok(out[0]![0]!.every(v => v === 0), "OP1 off silences INIT VOICE");
    assert.deepEqual(out[0]![1], out[0]![0], "the mono engine is copied to every channel");
  } finally {
    delete g.sampleRate; delete g.AudioWorkletProcessor; delete g.registerProcessor;
  }
});
