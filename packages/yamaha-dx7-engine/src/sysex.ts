// Reading DX7 System Exclusive: single voices (VCED), 32-voice banks (VMEM) and the bank's packed voice layout.
// Read side only; building messages is the editor's (apps/editor/lib/dx7/sysex.ts).
//
// Sources: Yamaha DX7 Operating Manual pp.30–32 (MIDI DATA FORMAT: headers, byte counts, checksum "add [the data
// bytes] and make the 2's complement"); the packed layout is in the format sheet's section F only
// (https://homepages.abdn.ac.uk/d.j.benson/pages/dx7/sysex-format.txt).

import { VOICE_BYTES } from "./params.ts";

export const YAMAHA = 0x43;
export const FORMAT = { VOICE: 0, BANK: 9 } as const;
export const VOICE_MESSAGE_BYTES = 6 + VOICE_BYTES + 2; // 163
export const PACKED_VOICE_BYTES = 128;
export const BANK_VOICES = 32;
export const BANK_DATA_BYTES = PACKED_VOICE_BYTES * BANK_VOICES; // 4096
export const BANK_MESSAGE_BYTES = 6 + BANK_DATA_BYTES + 2; // 4104

// The low 7 bits of the two's complement of the sum of the data bytes (the header is not summed).
export function checksum(data: ArrayLike<number>): number {
  let sum = 0;
  for (let i = 0; i < data.length; i++) sum += data[i]!;
  return -sum & 0x7f;
}

// Every F0…F7 message in a byte stream (a .syx file holds any number back to back). Bytes outside a message are
// skipped; an unterminated message at the end is returned as is, so the caller can report it.
export function splitMessages(bytes: Uint8Array): Uint8Array[] {
  const out: Uint8Array[] = [];
  let start = -1;
  for (let i = 0; i < bytes.length; i++) {
    if (bytes[i] === 0xf0) start = i;
    else if (bytes[i] === 0xf7 && start >= 0) { out.push(bytes.slice(start, i + 1)); start = -1; }
  }
  if (start >= 0) out.push(bytes.slice(start));
  return out;
}

export type Parsed =
  | { type: "voice"; channel: number; data: Uint8Array } // 155 VCED bytes
  | { type: "bank"; channel: number; packed: Uint8Array; voices: Uint8Array[]; unusedBits: number }; // 32 unpacked voices

export type ParseError = { error: string; format?: number };

// A Yamaha message whose sub-status is 0 (a bulk dump), with its format byte; other messages aren't dumps.
export const isYamahaDump = (m: Uint8Array): boolean => m.length >= 4 && m[0] === 0xf0 && m[1] === YAMAHA && (m[2]! & 0xf0) === 0;

// One message → a voice, a bank, or why it can't be read. Never throws.
export function parse(m: Uint8Array): Parsed | ParseError {
  if (!isYamahaDump(m)) return { error: "not a Yamaha bulk dump" };
  const channel = (m[2]! & 0x0f) + 1;
  const format = m[3]!;
  if (format !== FORMAT.VOICE && format !== FORMAT.BANK) return { error: `Yamaha format ${format} is not a DX7 voice or bank`, format };
  const want = format === FORMAT.VOICE ? VOICE_MESSAGE_BYTES : BANK_MESSAGE_BYTES;
  const count = format === FORMAT.VOICE ? VOICE_BYTES : BANK_DATA_BYTES;
  if (m.length !== want || m[m.length - 1] !== 0xf7) return { error: `wrong length: ${m.length} bytes, expected ${want}`, format };
  if (((m[4]! << 7) | m[5]!) !== count) return { error: `byte count ${(m[4]! << 7) | m[5]!}, expected ${count}`, format };
  const data = m.slice(6, 6 + count);
  if (data.some(b => b > 0x7f)) return { error: "data byte above 0x7F", format };
  if (checksum(data) !== m[6 + count]) return { error: "checksum mismatch", format };
  if (format === FORMAT.VOICE) return { type: "voice", channel, data };
  const voices: Uint8Array[] = [];
  let unusedBits = 0;
  for (let v = 0; v < BANK_VOICES; v++) {
    const packed = data.subarray(v * PACKED_VOICE_BYTES, (v + 1) * PACKED_VOICE_BYTES);
    voices.push(unpackVoice(packed));
    if (hasUnusedBits(packed)) unusedBits++;
  }
  return { type: "bank", channel, packed: data, voices, unusedBits };
}

// The packed bytes that share fields, and the bits no field uses (format sheet section F).
const UNUSED = [[11, 0x70], [13, 0x60], [15, 0x40]] as const; // per operator block
const UNUSED_GLOBAL = [[110, 0x60], [111, 0x70]] as const;

function hasUnusedBits(p: Uint8Array): boolean {
  for (let op = 0; op < 6; op++) for (const [o, mask] of UNUSED) if (p[op * 17 + o]! & mask) return true;
  return UNUSED_GLOBAL.some(([o, mask]) => (p[o]! & mask) !== 0);
}

// 128 packed bytes → the 155 bytes a VCED of the same voice holds. Packed fields are masked to their widths.
export function unpackVoice(p: Uint8Array): Uint8Array {
  if (p.length !== PACKED_VOICE_BYTES) throw new RangeError(`A packed voice is ${PACKED_VOICE_BYTES} bytes, got ${p.length}.`);
  const d = new Uint8Array(VOICE_BYTES);
  for (let op = 0; op < 6; op++) { // OP6 first in both layouts
    const s = op * 17, t = op * 21;
    for (let i = 0; i <= 10; i++) d[t + i] = p[s + i]!; // rates, levels, break point, depths
    d[t + 11] = p[s + 11]! & 3; // left curve
    d[t + 12] = (p[s + 11]! >> 2) & 3; // right curve
    d[t + 13] = p[s + 12]! & 7; // rate scaling
    d[t + 20] = (p[s + 12]! >> 3) & 15; // detune
    d[t + 14] = p[s + 13]! & 3; // amp mod sens
    d[t + 15] = (p[s + 13]! >> 2) & 7; // velocity sens
    d[t + 16] = p[s + 14]!; // output level
    d[t + 17] = p[s + 15]! & 1; // osc mode
    d[t + 18] = (p[s + 15]! >> 1) & 31; // coarse
    d[t + 19] = p[s + 16]!; // fine
  }
  for (let i = 0; i < 8; i++) d[126 + i] = p[102 + i]!; // pitch EG
  d[134] = p[110]! & 31; // algorithm
  d[135] = p[111]! & 7; // feedback
  d[136] = (p[111]! >> 3) & 1; // osc key sync
  for (let i = 0; i < 4; i++) d[137 + i] = p[112 + i]!; // LFO speed, delay, PMD, AMD
  d[141] = p[116]! & 1; // LFO sync
  d[142] = (p[116]! >> 1) & 7; // LFO wave
  d[143] = (p[116]! >> 4) & 7; // pitch mod sens
  d[144] = p[117]!; // transpose
  for (let i = 0; i < 10; i++) d[145 + i] = p[118 + i]!; // name
  return d;
}
