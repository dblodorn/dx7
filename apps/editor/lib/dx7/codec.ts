// The DX7 codec's write side: changing fields and names, INIT VOICE, and packing a voice for a 32-voice bank.
// It re-exports the package's read side, so the editor imports one codec. Every edit returns a new voice and
// touches only the bytes of the fields it sets (bytes are the source of truth; a voice is never rebuilt).

import { NAME_BYTE, NAME_LENGTH, OPERATORS, operatorBase, PACKED_VOICE_BYTES, VOICE_BYTES, voiceField, type Operator } from "@dblodorn/yamaha-dx7-engine";

export * from "@dblodorn/yamaha-dx7-engine";

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, Math.round(v)));

// One field, clamped to its range.
export function set(voice: Uint8Array, key: string, value: number): Uint8Array {
  const f = voiceField(key);
  const next = voice.slice();
  next[f.byte] = clamp(value, f.min, f.max);
  return next;
}

export function setMany(voice: Uint8Array, values: Record<string, number>): Uint8Array {
  const next = voice.slice();
  for (const [key, value] of Object.entries(values)) {
    const f = voiceField(key);
    next[f.byte] = clamp(value, f.min, f.max);
  }
  return next;
}

// Up to 10 printable ASCII characters, padded with spaces; anything else becomes a space.
export function setName(voice: Uint8Array, name: string): Uint8Array {
  const next = voice.slice();
  for (let i = 0; i < NAME_LENGTH; i++) {
    const c = name.charCodeAt(i);
    next[NAME_BYTE + i] = c >= 32 && c < 127 ? c : 32;
  }
  return next;
}

// The 21 bytes of one operator, and writing them onto another (COPY / PASTE OPERATOR).
export const operatorBytes = (voice: Uint8Array, op: Operator): Uint8Array => voice.slice(operatorBase(op), operatorBase(op) + 21);
export function setOperator(voice: Uint8Array, op: Operator, bytes: Uint8Array): Uint8Array {
  if (bytes.length !== 21) throw new RangeError(`An operator is 21 bytes, got ${bytes.length}.`);
  const next = voice.slice();
  next.set(bytes, operatorBase(op));
  return next;
}

// INIT VOICE. The manual describes VOICE INIT (p.7) without listing its values; these are the values DX7 owners
// report it sets (OP1 alone at full level on algorithm 1, every envelope 99-99-99-99 / 99-99-99-0, the pitch
// envelope flat at 50, ratio ×1.00, no detune, break point C3, transpose C3, LFO speed 35 — the manual's own
// example display, p.13 — key sync on, pitch mod sens 3). Unverified until checked on a DX7.
export function initVoice(name = "INIT VOICE"): Uint8Array {
  const v = new Uint8Array(VOICE_BYTES);
  for (const op of OPERATORS) {
    const b = operatorBase(op);
    v.set([99, 99, 99, 99, 99, 99, 99, 0, 39, 0, 0, 0, 0, 0, 0, 0, op === 1 ? 99 : 0, 0, 1, 0, 7], b);
  }
  v.set([99, 99, 99, 99, 50, 50, 50, 50, 0, 0, 1, 35, 0, 0, 0, 1, 0, 3, 24], 126);
  return setName(v, name);
}

// 155 VCED bytes → the 128-byte packed form a bank holds (format sheet section F). Packed fields are masked to
// their widths; unused bits are 0.
export function packVoice(d: Uint8Array): Uint8Array {
  if (d.length !== VOICE_BYTES) throw new RangeError(`A voice is ${VOICE_BYTES} bytes, got ${d.length}.`);
  const p = new Uint8Array(PACKED_VOICE_BYTES);
  for (let op = 0; op < 6; op++) { // OP6 first in both layouts
    const s = op * 21, t = op * 17;
    for (let i = 0; i <= 10; i++) p[t + i] = d[s + i]! & 0x7f;
    p[t + 11] = ((d[s + 12]! & 3) << 2) | (d[s + 11]! & 3);
    p[t + 12] = ((d[s + 20]! & 15) << 3) | (d[s + 13]! & 7);
    p[t + 13] = ((d[s + 15]! & 7) << 2) | (d[s + 14]! & 3);
    p[t + 14] = d[s + 16]! & 0x7f;
    p[t + 15] = ((d[s + 18]! & 31) << 1) | (d[s + 17]! & 1);
    p[t + 16] = d[s + 19]! & 0x7f;
  }
  for (let i = 0; i < 8; i++) p[102 + i] = d[126 + i]! & 0x7f;
  p[110] = d[134]! & 31;
  p[111] = ((d[136]! & 1) << 3) | (d[135]! & 7);
  for (let i = 0; i < 4; i++) p[112 + i] = d[137 + i]! & 0x7f;
  p[116] = ((d[143]! & 7) << 4) | ((d[142]! & 7) << 1) | (d[141]! & 1);
  p[117] = d[144]! & 0x7f;
  for (let i = 0; i < 10; i++) p[118 + i] = d[145 + i]! & 0x7f;
  return p;
}

// Parameter 155's value: bit 5 is OP1 … bit 0 is OP6 (manual p.31), 1 = on.
export const enableMask = (on: Record<Operator, boolean>): number => OPERATORS.reduce((m, op) => m | (on[op] ? 1 << (6 - op) : 0), 0);
