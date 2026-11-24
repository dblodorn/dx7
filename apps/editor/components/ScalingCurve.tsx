"use client";

// Keyboard level scaling drawn as the manual's figure (p.16): the level offset across the keyboard, flat at the
// break point, rising (+) or falling (−) to each side, linearly (LIN) or exponentially (EXP), by each side's depth.
// A sketch of the shape for reading the settings, not the emulator's exact curve.

import { KeyboardCurve } from "@dblodorn/sound-ui";

const LOW = 21, HIGH = 120; // the break point's range, A-1 (stored 0) to C8 (99), as MIDI notes

export default function ScalingCurve({ bp, ld, rd, lc, rc }: { bp: number; ld: number; rd: number; lc: number; rc: number }) {
  const bpNote = bp + LOW;
  // curve 0 −LIN, 1 −EXP, 2 +EXP, 3 +LIN
  const shape = (curve: number, t: number) => (curve === 0 || curve === 3 ? t : (Math.exp(3 * t) - 1) / (Math.exp(3) - 1));
  const fn = (n: number) => {
    const left = n < bpNote;
    const span = left ? bpNote - LOW : HIGH - bpNote;
    const t = span > 0 ? Math.abs(n - bpNote) / span : 0;
    const c = left ? lc : rc;
    return (c >= 2 ? 1 : -1) * shape(c, t) * ((left ? ld : rd) / 99);
  };
  return <KeyboardCurve fn={fn} low={LOW} high={HIGH} marker={bpNote} />;
}
