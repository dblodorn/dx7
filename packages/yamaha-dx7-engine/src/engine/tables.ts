// The sine and 2^x tables and the log-frequency → phase-increment table, in msfa's fixed point (Q24).
// Ported from msfa sin.cc, exp2.cc and freqlut.cc: Copyright 2012 Google Inc., Apache License 2.0 (see NOTICE).
// The 64-bit multiplies there are done in doubles here (exact below 2^53); `| 0` keeps 32-bit wraparound.

const SIN_LG = 10, SIN_SIZE = 1 << SIN_LG;
const EXP2_LG = 10, EXP2_SIZE = 1 << EXP2_LG;

// sintab: interleaved (delta, value) pairs, built by msfa's integer rotation (BigInt for its 64-bit products)
export const SIN = new Int32Array(SIN_SIZE << 1);
{
  const R = 1n << 29n;
  const dphase = (2 * Math.PI) / SIN_SIZE;
  const c = BigInt(Math.floor(Math.cos(dphase) * (1 << 30) + 0.5)), s = BigInt(Math.floor(Math.sin(dphase) * (1 << 30) + 0.5));
  let u = 1n << 30n, v = 0n;
  for (let i = 0; i < SIN_SIZE / 2; i++) {
    const y = Number((v + 32n) >> 6n);
    SIN[(i << 1) + 1] = y;
    SIN[((i + SIN_SIZE / 2) << 1) + 1] = -y;
    const t = (u * s + v * c + R) >> 30n;
    u = (u * c - v * s + R) >> 30n;
    v = t;
  }
  for (let i = 0; i < SIN_SIZE - 1; i++) SIN[i << 1] = SIN[(i << 1) + 3]! - SIN[(i << 1) + 1]!;
  SIN[(SIN_SIZE << 1) - 2] = -SIN[(SIN_SIZE << 1) - 1]!;
}

// phase: Q24 of a cycle (wraps at 2^24) → sine in Q24
export function sin(phase: number): number {
  const lowbits = phase & ((1 << 14) - 1);
  const i = (phase >> 13) & ((SIN_SIZE - 1) << 1);
  // |delta| < 2^17 and lowbits < 2^14, so the product fits in 32 bits and `>>` is msfa's 64-bit shift
  return SIN[i + 1]! + ((SIN[i]! * lowbits) >> 14);
}

export const EXP2 = new Int32Array(EXP2_SIZE << 1);
{
  const inc = 2 ** (1 / EXP2_SIZE);
  let y = 1 << 30;
  for (let i = 0; i < EXP2_SIZE; i++) { EXP2[(i << 1) + 1] = Math.floor(y + 0.5); y *= inc; }
  for (let i = 0; i < EXP2_SIZE - 1; i++) EXP2[i << 1] = EXP2[(i << 1) + 3]! - EXP2[(i << 1) + 1]!;
  EXP2[(EXP2_SIZE << 1) - 2] = 2147483648 - EXP2[(EXP2_SIZE << 1) - 1]!;
}

// x: Q24 (integer part −14…6) → 2^x in Q24
export function exp2(x: number): number {
  const lowbits = x & ((1 << 14) - 1);
  const i = (x >> 13) & ((EXP2_SIZE - 1) << 1);
  const y = EXP2[i + 1]! + Math.floor((EXP2[i]! * lowbits) / (1 << 14));
  return y >> (6 - (x >> 24));
}

const FREQ_LG = 10, FREQ_SIZE = 1 << FREQ_LG, MAX_LOGFREQ_INT = 20;

// one per sample rate: log2(Hz) in Q24 → phase increment per sample (Q24 of a cycle)
export function freqTable(sampleRate: number): Int32Array {
  const lut = new Int32Array(FREQ_SIZE + 1);
  let y = 2 ** (24 + MAX_LOGFREQ_INT) / sampleRate;
  const inc = 2 ** (1 / FREQ_SIZE);
  for (let i = 0; i <= FREQ_SIZE; i++) { lut[i] = Math.floor(y + 0.5); y *= inc; }
  return lut;
}

export function freq(lut: Int32Array, logfreq: number): number {
  const ix = (logfreq & 0xffffff) >> (24 - FREQ_LG);
  const y0 = lut[ix]!, y1 = lut[ix + 1]!;
  const lowbits = logfreq & ((1 << (24 - FREQ_LG)) - 1);
  const y = y0 + Math.floor(((y1 - y0) * lowbits) / (1 << (24 - FREQ_LG)));
  return y >> (MAX_LOGFREQ_INT - (logfreq >> 24));
}
