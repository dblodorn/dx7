"use client";

// A DX7 envelope: four rates and four levels (manual p.15; the pitch envelope works the same way, p.17). The drawing
// starts at LEVEL 4 on key-on, moves to LEVEL 1, 2 and 3, holds LEVEL 3 while the key is down, then RATE 4 takes it
// back to LEVEL 4. A segment is drawn shorter the higher its rate (the drawing is not to time scale). Points 1–4 can
// be dragged: up and down sets that LEVEL, sideways that RATE, whichever way the drag starts, so a drag changes one
// value. The sliders under it set the same values from the keyboard.

import { useRef, useState } from "react";
import type * as React from "react";
import { voiceField } from "@dblodorn/yamaha-dx7-engine";
import { FieldRow } from "./params";

const W = 320, H = 90, TOP = 6, BOTTOM = H - 6, HOLD = 40, MIN_SEG = 16, MAX_SEG = 60;

interface Props {
  id: string;
  voice: Uint8Array;
  prefix: string; // "op1." … "op6." or "p" for the pitch envelope (pr1, pl1)
  center?: boolean; // the pitch envelope: draw the 50 line
  onChange: (values: Record<string, number>) => void;
}

export default function Envelope({ id, voice, prefix, center, onChange }: Props) {
  const rk = (n: number) => (prefix === "p" ? `pr${n}` : `${prefix}r${n}`);
  const lk = (n: number) => (prefix === "p" ? `pl${n}` : `${prefix}l${n}`);
  const rate = (n: number) => voice[voiceField(rk(n)).byte]!;
  const level = (n: number) => voice[voiceField(lk(n)).byte]!;
  const seg = (r: number) => MIN_SEG + ((99 - r) / 99) * (MAX_SEG - MIN_SEG);
  const y = (l: number) => BOTTOM - (l / 99) * (BOTTOM - TOP);
  // x of the start and of points 1–4
  const xs = [0];
  [1, 2, 3].forEach(n => xs.push(xs.at(-1)! + seg(rate(n))));
  xs.push(xs.at(-1)! + HOLD + seg(rate(4)));
  const pts = [[xs[0]!, y(level(4))], ...[1, 2, 3, 4].map(n => [xs[n]!, y(level(n))])] as [number, number][];

  const svg = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<{ n: number; x0: number; y0: number; axis: "x" | "y" | null; r0: number; l0: number } | null>(null);
  const toSvg = (e: React.PointerEvent) => {
    const r = svg.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
  };
  const onMove = (e: React.PointerEvent) => {
    if (!drag) return;
    const p = toSvg(e);
    const dx = p.x - drag.x0, dy = p.y - drag.y0;
    const axis = drag.axis ?? (Math.hypot(dx, dy) < 4 ? null : Math.abs(dx) > Math.abs(dy) ? "x" : "y");
    if (!axis) return;
    if (!drag.axis) setDrag({ ...drag, axis });
    if (axis === "y") onChange({ [lk(drag.n)]: Math.round(drag.l0 - (dy / (BOTTOM - TOP)) * 99) });
    else onChange({ [rk(drag.n)]: Math.round(drag.r0 - (dx / (MAX_SEG - MIN_SEG)) * 99) });
  };

  return (
    <div className="grid gap-2">
      <svg ref={svg} viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-none border border-foreground" aria-hidden="true"
        onPointerMove={onMove} onPointerUp={() => setDrag(null)} onPointerCancel={() => setDrag(null)}>
        {center && <line x1={0} x2={W} y1={y(50)} y2={y(50)} stroke="currentColor" strokeDasharray="2 3" shapeRendering="crispEdges" />}
        <line x1={xs[3]!} x2={xs[3]! + HOLD} y1={BOTTOM + 3} y2={BOTTOM + 3} stroke="currentColor" shapeRendering="crispEdges" />
        <polyline fill="none" stroke="currentColor" points={[...pts.slice(0, 4), [xs[3]! + HOLD, pts[3]![1]], pts[4]!].map(p => p.join(",")).join(" ")} />
        {[1, 2, 3, 4].map(n => (
          <rect key={n} x={pts[n]![0] - 4} y={pts[n]![1] - 4} width="8" height="8" className="cursor-grab"
            fill={drag?.n === n ? "currentColor" : "var(--background)"} stroke="currentColor" shapeRendering="crispEdges"
            onPointerDown={e => {
              (e.target as Element).setPointerCapture?.(e.pointerId);
              const p = toSvg(e);
              setDrag({ n, x0: p.x, y0: p.y, axis: null, r0: rate(n), l0: level(n) });
            }} />
        ))}
      </svg>
      <div className="grid grid-cols-2 gap-x-4 gap-y-2">
        {[1, 2, 3, 4].map(n => <FieldRow key={`r${n}`} id={`${id}-r${n}`} field={voiceField(rk(n))} label={`R${n}`} value={rate(n)} onChange={v => onChange({ [rk(n)]: v })} />)}
        {[1, 2, 3, 4].map(n => <FieldRow key={`l${n}`} id={`${id}-l${n}`} field={voiceField(lk(n))} label={`L${n}`} value={level(n)} onChange={v => onChange({ [lk(n)]: v })} />)}
      </div>
    </div>
  );
}
