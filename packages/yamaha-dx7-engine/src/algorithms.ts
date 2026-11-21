// The DX7's 32 algorithms: which operators are carriers (heard), which modulate which, and where the feedback
// loop is. Transcribed from the algorithm chart printed on the DX7's front panel (the manual describes algorithm 1
// on p.11 and refers to the panel for the rest). test/algorithms.test.ts checks every entry against the routing
// table of msfa (Google's music-synthesizer-for-android, Apache-2.0), an independent transcription.
//
// The emulator and the editor's diagram both read this table.

import type { Operator } from "./params.ts";

export interface Algorithm {
  carriers: readonly Operator[]; // bottom row, summed to the output
  edges: readonly (readonly [Operator, Operator])[]; // [modulator, modulated]
  feedback: readonly [Operator, Operator]; // [from, to]: the same operator for self-feedback; 4 and 6 loop back through a chain
}

const A = (carriers: Operator[], edges: [Operator, Operator][], feedback: [Operator, Operator]): Algorithm => ({ carriers, edges, feedback });

export const ALGORITHMS: readonly Algorithm[] = [
  /* 1 */ A([1, 3], [[2, 1], [4, 3], [5, 4], [6, 5]], [6, 6]),
  /* 2 */ A([1, 3], [[2, 1], [4, 3], [5, 4], [6, 5]], [2, 2]),
  /* 3 */ A([1, 4], [[2, 1], [3, 2], [5, 4], [6, 5]], [6, 6]),
  /* 4 */ A([1, 4], [[2, 1], [3, 2], [5, 4], [6, 5]], [4, 6]),
  /* 5 */ A([1, 3, 5], [[2, 1], [4, 3], [6, 5]], [6, 6]),
  /* 6 */ A([1, 3, 5], [[2, 1], [4, 3], [6, 5]], [5, 6]),
  /* 7 */ A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 5]], [6, 6]),
  /* 8 */ A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 5]], [4, 4]),
  /* 9 */ A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 5]], [2, 2]),
  /* 10 */ A([1, 4], [[2, 1], [3, 2], [5, 4], [6, 4]], [3, 3]),
  /* 11 */ A([1, 4], [[2, 1], [3, 2], [5, 4], [6, 4]], [6, 6]),
  /* 12 */ A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 3]], [2, 2]),
  /* 13 */ A([1, 3], [[2, 1], [4, 3], [5, 3], [6, 3]], [6, 6]),
  /* 14 */ A([1, 3], [[2, 1], [4, 3], [5, 4], [6, 4]], [6, 6]),
  /* 15 */ A([1, 3], [[2, 1], [4, 3], [5, 4], [6, 4]], [2, 2]),
  /* 16 */ A([1], [[2, 1], [3, 1], [5, 1], [4, 3], [6, 5]], [6, 6]),
  /* 17 */ A([1], [[2, 1], [3, 1], [5, 1], [4, 3], [6, 5]], [2, 2]),
  /* 18 */ A([1], [[2, 1], [3, 1], [4, 1], [5, 4], [6, 5]], [3, 3]),
  /* 19 */ A([1, 4, 5], [[2, 1], [3, 2], [6, 4], [6, 5]], [6, 6]),
  /* 20 */ A([1, 2, 4], [[3, 1], [3, 2], [5, 4], [6, 4]], [3, 3]),
  /* 21 */ A([1, 2, 4, 5], [[3, 1], [3, 2], [6, 4], [6, 5]], [3, 3]),
  /* 22 */ A([1, 3, 4, 5], [[2, 1], [6, 3], [6, 4], [6, 5]], [6, 6]),
  /* 23 */ A([1, 2, 4, 5], [[3, 2], [6, 4], [6, 5]], [6, 6]),
  /* 24 */ A([1, 2, 3, 4, 5], [[6, 3], [6, 4], [6, 5]], [6, 6]),
  /* 25 */ A([1, 2, 3, 4, 5], [[6, 4], [6, 5]], [6, 6]),
  /* 26 */ A([1, 2, 4], [[3, 2], [5, 4], [6, 4]], [6, 6]),
  /* 27 */ A([1, 2, 4], [[3, 2], [5, 4], [6, 4]], [3, 3]),
  /* 28 */ A([1, 3, 6], [[2, 1], [4, 3], [5, 4]], [5, 5]),
  /* 29 */ A([1, 2, 3, 5], [[4, 3], [6, 5]], [6, 6]),
  /* 30 */ A([1, 2, 3, 6], [[4, 3], [5, 4]], [5, 5]),
  /* 31 */ A([1, 2, 3, 4, 5], [[6, 5]], [6, 6]),
  /* 32 */ A([1, 2, 3, 4, 5, 6], [], [6, 6]),
];

// algorithm is the stored value, 0–31
export const algorithmOf = (stored: number): Algorithm => ALGORITHMS[Math.max(0, Math.min(31, stored | 0))]!;
