// Test-only voice builders. The package never writes voices; the editor's codec does (apps/editor/lib/dx7). These
// copies let the package's tests make voices and dumps without depending on the editor.
import { NAME_BYTE, VOICE_BYTES, voiceField } from "../src/params.ts";
import { checksum } from "../src/sysex.ts";

export function testVoice(values: Record<string, number> = {}, name = "TEST VOICE"): Uint8Array {
  const v = new Uint8Array(VOICE_BYTES);
  for (const [k, x] of Object.entries(values)) v[voiceField(k).byte] = x;
  for (let i = 0; i < 10; i++) v[NAME_BYTE + i] = (name.padEnd(10).charCodeAt(i)) & 0x7f;
  return v;
}

export function message(format: number, data: Uint8Array, channel = 1): Uint8Array {
  return Uint8Array.from([0xf0, 0x43, channel - 1, format, data.length >> 7, data.length & 0x7f, ...data, checksum(data), 0xf7]);
}

// A test copy of the editor's INIT VOICE (OP1 alone at level 99 on algorithm 1), with fields changed.
export function initLike(values: Record<string, number> = {}): Uint8Array {
  const v = new Uint8Array(VOICE_BYTES);
  for (let op = 0; op < 6; op++) v.set([99, 99, 99, 99, 99, 99, 99, 0, 39, 0, 0, 0, 0, 0, 0, 0, op === 5 ? 99 : 0, 0, 1, 0, 7], op * 21);
  v.set([99, 99, 99, 99, 50, 50, 50, 50, 0, 0, 1, 35, 0, 0, 0, 1, 0, 3, 24], 126);
  for (const [k, x] of Object.entries(values)) v[voiceField(k).byte] = x;
  return v;
}

export const SR = 48000;

// Render one note for `secs` seconds with the offline synth.
export async function renderNote(voice: Uint8Array, note = 69, secs = 0.5, velocity = 100, mask?: number): Promise<Float32Array> {
  const { createOfflineSynth } = await import("../src/offline.ts");
  const s = createOfflineSynth(SR);
  s.loadVoice(voice);
  if (mask !== undefined) s.setOperators(mask);
  s.noteOn(note, velocity);
  const out = new Float32Array(Math.round(SR * secs));
  s.render(out);
  return out;
}

// Frequency by zero crossings after `from` seconds.
export function pitchOf(x: Float32Array, from = 0.1): number {
  let n = 0, first = -1, last = -1;
  for (let i = Math.floor(SR * from) + 1; i < x.length; i++) {
    if (x[i - 1]! < 0 && x[i]! >= 0) { const t = i - x[i]! / (x[i]! - x[i - 1]!); if (first < 0) first = t; last = t; n++; }
  }
  return (n - 1) / ((last - first) / SR);
}

// Magnitude at one frequency (Goertzel), over x[from…].
export function magnitudeAt(x: Float32Array, hz: number, from = 0.1): number {
  const start = Math.floor(SR * from), w = (2 * Math.PI * hz) / SR, c = 2 * Math.cos(w);
  let s1 = 0, s2 = 0;
  for (let i = start; i < x.length; i++) { const s0 = x[i]! + c * s1 - s2; s2 = s1; s1 = s0; }
  return Math.sqrt(s1 * s1 + s2 * s2 - c * s1 * s2) / (x.length - start);
}

export const rms = (x: Float32Array, a = 0, b = x.length): number => {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i]! * x[i]!;
  return Math.sqrt(s / Math.max(1, b - a));
};
export const peakOf = (x: Float32Array): number => x.reduce((m, v) => Math.max(m, Math.abs(v)), 0);
