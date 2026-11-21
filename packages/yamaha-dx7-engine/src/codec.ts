// Reading a DX7 voice: field values, its name, the operator frequency as the panel shows it, and voices out of
// .syx files. Nothing here changes a voice (the editor's apps/editor/lib/dx7/codec.ts writes).

import { NAME_BYTE, NAME_LENGTH, operatorBase, VOICE_BYTES, voiceField, type Field, type Operator } from "./params.ts";
import { parse, splitMessages, VOICE_MESSAGE_BYTES } from "./sysex.ts";

export const fieldOf = voiceField;

export const get = (voice: Uint8Array, key: string): number => voice[voiceField(key).byte]!;

// The 10 name characters as stored, trailing spaces removed. NUL reads as a space, other bytes outside printable
// ASCII as "?".
export function getName(voice: Uint8Array): string {
  let s = "";
  for (let i = 0; i < NAME_LENGTH; i++) {
    const c = voice[NAME_BYTE + i] ?? 32;
    s += c === 0 ? " " : c >= 32 && c < 127 ? String.fromCharCode(c) : "?";
  }
  return s.trimEnd();
}

// A copy of the voice's 155 bytes, from those bytes or from one single-voice SysEx message. Throws on anything
// else, so a bad voice never reaches the engine.
export function readVoice(input: Uint8Array): Uint8Array {
  if (!(input instanceof Uint8Array)) throw new TypeError("A voice must be a Uint8Array.");
  if (input.length === VOICE_BYTES) return input.slice();
  if (input.length === VOICE_MESSAGE_BYTES && input[0] === 0xf0) {
    const p = parse(input);
    if ("error" in p) throw new RangeError(`Not a DX7 voice: ${p.error}.`);
    if (p.type === "voice") return p.data;
  }
  throw new RangeError(`A voice is ${VOICE_BYTES} bytes or a ${VOICE_MESSAGE_BYTES}-byte voice message, got ${input.length} bytes.`);
}

// The operator's frequency as the panel shows it (manual p.15): in RATIO mode coarse 0 is ×0.5 and 1–31 are ×1–31,
// fine adds 0–99 % (×1.00–1.99); in FIXED mode coarse picks 1, 10, 100 or 1000 Hz and fine multiplies by 1–9.772
// (10^(fine/100): 99 gives the manual's 9.772, its 977.2 Hz example).
export function frequency(voice: Uint8Array, op: Operator): { mode: "ratio" | "fixed"; value: number; text: string } {
  const base = operatorBase(op);
  const fixed = voice[base + 17] === 1, coarse = voice[base + 18]!, fine = voice[base + 19]!;
  if (fixed) {
    const hz = 10 ** (coarse & 3) * 10 ** (fine / 100);
    return { mode: "fixed", value: hz, text: `${hz < 10 ? hz.toFixed(3) : hz < 100 ? hz.toFixed(2) : hz < 1000 ? hz.toFixed(1) : Math.round(hz)} HZ` };
  }
  const ratio = (coarse === 0 ? 0.5 : coarse) * (1 + fine / 100);
  return { mode: "ratio", value: ratio, text: `×${ratio.toFixed(2)}` };
}

// A field's value as the panel reads it, else as stored.
export const displayOf = (f: Field, v: number): string => (f.options ? f.options[v] ?? String(v) : f.display ? f.display(v) : String(v));

export interface SyxItem { name: string; data: Uint8Array; from: "voice" | "bank"; slot?: number }
export interface SyxError { index: number; message: string; unsupported?: boolean }

// Every voice in a .syx file, in order: single voices as they are, banks as their 32 voices. Damaged messages
// and other Yamaha formats (DX7II ACED, AMEM, performances…) are reported, not thrown.
export function fromSyx(bytes: Uint8Array): { items: SyxItem[]; errors: SyxError[]; unusedBits: number } {
  const items: SyxItem[] = [], errors: SyxError[] = [];
  let unusedBits = 0;
  splitMessages(bytes).forEach((m, index) => {
    const p = parse(m);
    if ("error" in p) {
      errors.push({ index, message: p.error, ...(p.format !== undefined && p.format !== 0 && p.format !== 9 ? { unsupported: true } : {}) });
    } else if (p.type === "voice") {
      items.push({ name: getName(p.data), data: p.data, from: "voice" });
    } else {
      p.voices.forEach((data, slot) => items.push({ name: getName(data), data, from: "bank", slot }));
      unusedBits += p.unusedBits;
    }
  });
  return { items, errors, unusedBits };
}
