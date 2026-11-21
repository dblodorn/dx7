"use client";

// Keyboard level scaling drawn as the manual's figure (p.16): the level offset across the keyboard, flat at the
// break point, rising (+) or falling (−) to each side, linearly (LIN) or exponentially (EXP), by each side's depth.
// A sketch of the shape for reading the settings, not the emulator's exact curve.

const W = 320, H = 60, MID = H / 2, AMP = H / 2 - 5;
const LOW = 21, HIGH = 120; // the break point's range, A-1 (stored 0) to C8 (99), as MIDI notes

export default function ScalingCurve({ bp, ld, rd, lc, rc }: { bp: number; ld: number; rd: number; lc: number; rc: number }) {
  const bpNote = bp + LOW;
  const x = (note: number) => ((note - LOW) / (HIGH - LOW)) * W;
  // curve 0 −LIN, 1 −EXP, 2 +EXP, 3 +LIN
  const shape = (curve: number, t: number) => (curve === 0 || curve === 3 ? t : (Math.exp(3 * t) - 1) / (Math.exp(3) - 1));
  const sign = (curve: number) => (curve >= 2 ? 1 : -1);
  const pts: string[] = [];
  for (let n = LOW; n <= HIGH; n++) {
    const left = n < bpNote;
    const span = left ? bpNote - LOW : HIGH - bpNote;
    const t = span > 0 ? Math.abs(n - bpNote) / span : 0;
    const c = left ? lc : rc, d = (left ? ld : rd) / 99;
    pts.push(`${x(n).toFixed(1)},${(MID - sign(c) * shape(c, t) * d * AMP).toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full border border-foreground" aria-hidden="true">
      <line x1={0} x2={W} y1={MID} y2={MID} stroke="currentColor" strokeDasharray="2 3" shapeRendering="crispEdges" />
      <line x1={x(bpNote)} x2={x(bpNote)} y1={0} y2={H} stroke="currentColor" shapeRendering="crispEdges" />
      <polyline fill="none" stroke="currentColor" points={pts.join(" ")} />
    </svg>
  );
}
