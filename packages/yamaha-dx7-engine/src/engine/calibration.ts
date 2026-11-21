// Every tunable number of the DX7 emulator, in one place (the VZ package's convert.ts rule): a change here changes
// how voices sound, so release it as at least a minor version with a changelog line. Each value is labelled:
//   PORTED    from msfa (google/music-synthesizer-for-android, Apache-2.0), file named; see NOTICE
//   MANUAL    stated by the DX7 Operating Manual, page named
//   ESTIMATE  ours, where msfa and the manual say nothing; to be checked against references (deferred)
//
// Copyright 2012 Google Inc. for the PORTED tables, licensed under the Apache License, Version 2.0
// (http://www.apache.org/licenses/LICENSE-2.0).

// Block size: envelopes, the pitch envelope and the LFO step once per 64 samples. PORTED synth.h (LG_N 6)
export const LG_N = 6;
export const N = 1 << LG_N;

// Below this gain an operator is skipped (outputs nothing). PORTED fm_core.cc kLevelThresh
export const LEVEL_THRESH = 1120;

// msfa's operator envelope has no sample-rate term and msfa ran at 44.1 kHz, so its rates are per 64-sample block at
// that rate; other rates scale the increment. ESTIMATE (derived)
export const ENV_RATE_REFERENCE = 44100;

// Output level 0–19 → the envelope's level scale (20–99 is 28 + level). PORTED env.cc levellut
export const LEVEL_LUT = [0, 5, 9, 13, 17, 20, 23, 25, 27, 29, 31, 33, 35, 37, 39, 41, 42, 43, 45, 46];

// Ratio-mode coarse 0–31 as log2 multipliers in Q24 (0 is ×0.5). PORTED dx7note.cc coarsemul
export const COARSE_MUL = [
  -16777216, 0, 16777216, 26591258, 33554432, 38955489, 43368474, 47099600,
  50331648, 53182516, 55732705, 58039632, 60145690, 62083076, 63876816,
  65546747, 67108864, 68576247, 69959732, 71268397, 72509921, 73690858,
  74816848, 75892776, 76922906, 77910978, 78860292, 79773775, 80654032,
  81503396, 82323963, 83117622,
];

// Detune step in log-frequency units: ratio mode, and fixed mode (positive detune only). PORTED dx7note.cc osc_freq
export const DETUNE_RATIO = 12606;
export const DETUNE_FIXED = 13457;

// Velocity 0–127 (halved) → level offset. PORTED dx7note.cc velocity_data
export const VELOCITY_DATA = [
  0, 70, 86, 97, 106, 114, 121, 126, 132, 138, 142, 148, 152, 156, 160, 163,
  166, 170, 173, 174, 178, 181, 184, 186, 189, 190, 194, 196, 198, 200, 202,
  205, 206, 209, 211, 214, 216, 218, 220, 222, 224, 225, 227, 229, 230, 232,
  233, 235, 237, 238, 240, 241, 242, 243, 244, 246, 246, 248, 249, 250, 251,
  252, 253, 254,
];

// Keyboard level scaling, exponential curves, by 3-key group. PORTED dx7note.cc exp_scale_data
export const EXP_SCALE_DATA = [
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 11, 14, 16, 19, 23, 27, 33, 39, 47, 56, 66,
  80, 94, 110, 126, 142, 158, 174, 190, 206, 222, 238, 250,
];

// Pitch mod sensitivity 0–7. PORTED dx7note.cc pitchmodsenstab
export const PITCH_MOD_SENS = [0, 10, 20, 33, 55, 92, 153, 255];

// Pitch envelope: rate 0–99 → step, level 0–99 → pitch (50 = none, ±4 octaves at the ends). PORTED pitchenv.cc
export const PITCH_RATES = [
  1, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9, 10, 10, 11, 11, 12,
  12, 13, 13, 14, 14, 15, 16, 16, 17, 18, 18, 19, 20, 21, 22, 23, 24,
  25, 26, 27, 28, 30, 31, 33, 34, 36, 37, 38, 39, 41, 42, 44, 46, 47,
  49, 51, 53, 54, 56, 58, 60, 62, 64, 66, 68, 70, 72, 74, 76, 79, 82,
  85, 88, 91, 94, 98, 102, 106, 110, 115, 120, 125, 130, 135, 141, 147,
  153, 159, 165, 171, 178, 185, 193, 202, 211, 232, 243, 254, 255,
];
export const PITCH_LEVELS = [
  -128, -116, -104, -95, -85, -76, -68, -61, -56, -52, -49, -46, -43,
  -41, -39, -37, -35, -33, -32, -31, -30, -29, -28, -27, -26, -25, -24,
  -23, -22, -21, -20, -19, -18, -17, -16, -15, -14, -13, -12, -11, -10,
  -9, -8, -7, -6, -5, -4, -3, -2, -1, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
  11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
  28, 29, 30, 31, 32, 33, 34, 35, 38, 40, 43, 46, 49, 53, 58, 65, 73,
  82, 92, 103, 115, 127,
];
// The pitch envelope's step unit, 1 / 21.3 s per octave per rate step. PORTED pitchenv.cc
export const PITCH_ENV_SECONDS = 21.3;

// LFO speed unit (1 << 32 / 15.5 s / 11). PORTED lfo.cc
export const LFO_UNIT = 25190424;

// Amplitude modulation, which msfa leaves out. The manual gives only the ranges (AMD 0–99, AMS 0–3, pp.13–14).
// AMD scales like PMD (×165 >> 6); AMS picks a share of the deepest tremolo; the LFO lowers the operator's log
// level by up to AM_MAX at AMD 99 and AMS 3 (4 << 24 is 24 dB). ESTIMATE, all three
export const AMP_MOD_SENS = [0, 66, 109, 255];
export const AM_MAX = 4 << 24;

// Output: the voices' Q24 sum >> 4 is full scale at 1 << 24 (msfa synth_unit.cc, before its 16-bit conversion), so a
// float sample is sum / 2^28. A single carrier at level 99 peaks near 0.125; six carriers can pass 1.0. The engine
// doesn't clip: hosts mix and limit. PORTED synth_unit.cc
export const OUTPUT_SCALE = 1 / (1 << 28);
