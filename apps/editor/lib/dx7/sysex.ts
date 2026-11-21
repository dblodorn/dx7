// Building DX7 SysEx: a single voice (VCED), a 32-voice bank (VMEM), a parameter change, and .syx files.
// Formats from the DX7 Operating Manual pp.30–31; re-exports the package's reading side.

import { BANK_VOICES, checksum, FORMAT, OPERATOR_ENABLE_PARAM, VOICE_BYTES, YAMAHA } from "@dblodorn/yamaha-dx7-engine";
import { initVoice, packVoice } from "./codec.ts";

export * from "@dblodorn/yamaha-dx7-engine";

const nib = (channel: number): number => Math.max(1, Math.min(16, channel | 0)) - 1;

function dump(format: number, data: Uint8Array, channel: number): Uint8Array {
  return Uint8Array.from([0xf0, YAMAHA, nib(channel), format, data.length >> 7, data.length & 0x7f, ...data, checksum(data), 0xf7]);
}

// One voice: F0 43 0n 00 01 1B <155> cs F7 (163 bytes).
export function toSysex(voice: Uint8Array, { channel = 1 }: { channel?: number } = {}): Uint8Array {
  if (voice.length !== VOICE_BYTES) throw new RangeError(`A voice is ${VOICE_BYTES} bytes, got ${voice.length}.`);
  return dump(FORMAT.VOICE, voice, channel);
}

// Up to 32 voices as one bank, in order, the rest filled with INIT VOICE: F0 43 0n 09 20 00 <4096> cs F7.
export function toBankSysex(voices: Uint8Array[], { channel = 1 }: { channel?: number } = {}): Uint8Array {
  if (voices.length > BANK_VOICES) throw new RangeError(`A bank holds ${BANK_VOICES} voices, got ${voices.length}.`);
  const init = initVoice();
  const data = new Uint8Array(BANK_VOICES * 128);
  for (let i = 0; i < BANK_VOICES; i++) data.set(packVoice(voices[i] ?? init), i * 128);
  return dump(FORMAT.BANK, data, channel);
}

// A voice parameter change (group 0): F0 43 1n 0gggggpp 0ppppppp 0ddddddd F7, pp the parameter's top two bits.
export function toParamChange(param: number, value: number, { channel = 1 }: { channel?: number } = {}): Uint8Array {
  if (!Number.isInteger(param) || param < 0 || param > OPERATOR_ENABLE_PARAM) throw new RangeError(`Voice parameter must be 0–155, got ${param}.`);
  return Uint8Array.from([0xf0, YAMAHA, 0x10 | nib(channel), param >> 7, param & 0x7f, value & 0x7f, 0xf7]);
}

// Several messages back to back, as a .syx file holds them.
export function toSyx(messages: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(messages.reduce((n, m) => n + m.length, 0));
  let at = 0;
  for (const m of messages) { out.set(m, at); at += m.length; }
  return out;
}
