"use client";

// The algorithm drawn from the package's table, like the chart on the DX7's panel: numbered operator boxes, carriers
// on the bottom row joined by the output line, each modulator above what it modulates, and the feedback loop.
// 1-bit: lines and outlines only; the selected operator is inverted, switched-off ones dashed. Pressing a box
// selects that operator.

import { algorithmOf, type Operator } from "@dblodorn/yamaha-dx7-engine";

const BOX_W = 26, BOX_H = 20, COL = 40, ROW = 38, PAD = 12;

interface Placed { op: Operator; col: number; level: number }

// Carriers on level 0, left to right; each operator's modulators stacked above it, the first in its own column and
// any others in new columns to the right. An operator feeding several others is placed where it's first reached.
function layout(stored: number): { placed: Map<Operator, Placed>; cols: number; levels: number } {
  const a = algorithmOf(stored);
  const mods = (op: Operator) => a.edges.filter(([, to]) => to === op).map(([from]) => from).sort((x, y) => y - x);
  const placed = new Map<Operator, Placed>();
  let next = 0;
  const place = (op: Operator, col: number, level: number) => {
    if (placed.has(op)) return;
    placed.set(op, { op, col, level });
    mods(op).forEach((m, i) => place(m, i === 0 ? col : next++, level + 1));
  };
  for (const c of a.carriers) place(c, next++, 0);
  const all = [...placed.values()];
  return { placed, cols: next, levels: Math.max(...all.map(p => p.level)) + 1 };
}

interface Props {
  algorithm: number; // stored, 0–31
  selected: Operator;
  enabled: Record<Operator, boolean>;
  onSelect: (op: Operator) => void;
}

export default function AlgorithmDiagram({ algorithm, selected, enabled, onSelect }: Props) {
  const a = algorithmOf(algorithm);
  const { placed, cols, levels } = layout(algorithm);
  const W = PAD * 2 + (cols - 1) * COL + BOX_W + 14, H = PAD * 2 + (levels - 1) * ROW + BOX_H + 12;
  const pos = (op: Operator) => {
    const p = placed.get(op)!;
    return { x: PAD + p.col * COL, y: PAD + (levels - 1 - p.level) * ROW };
  };
  const carriers = [...a.carriers].map(pos);
  const busY = H - 6;
  const [fbFrom, fbTo] = a.feedback;
  const f = pos(fbFrom), t = pos(fbTo);
  const loopX = Math.max(f.x, t.x) + BOX_W + 7;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W * 1.5} height={H * 1.5} className="block h-auto max-w-full" role="group" aria-label={`ALGORITHM ${algorithm + 1}`}>
      {/* modulation: from the modulator's bottom to the top of what it modulates */}
      {a.edges.map(([from, to]) => {
        const s = pos(from), e = pos(to);
        const midY = e.y - (ROW - BOX_H) / 2;
        return <polyline key={`${from}-${to}`} fill="none" stroke="currentColor" shapeRendering="crispEdges"
          points={`${s.x + BOX_W / 2},${s.y + BOX_H} ${s.x + BOX_W / 2},${midY} ${e.x + BOX_W / 2},${midY} ${e.x + BOX_W / 2},${e.y}`} />;
      })}
      {/* carriers to the output line */}
      {carriers.map((c, i) => <line key={i} x1={c.x + BOX_W / 2} y1={c.y + BOX_H} x2={c.x + BOX_W / 2} y2={busY} stroke="currentColor" shapeRendering="crispEdges" />)}
      <line x1={carriers[0]!.x + BOX_W / 2} y1={busY} x2={carriers.at(-1)!.x + BOX_W / 2} y2={busY} stroke="currentColor" shapeRendering="crispEdges" />
      {/* feedback: out of the right side of `from`, round to the top of `to` */}
      <polyline fill="none" stroke="currentColor" shapeRendering="crispEdges"
        points={`${f.x + BOX_W},${f.y + BOX_H / 2} ${loopX},${f.y + BOX_H / 2} ${loopX},${t.y - 5} ${t.x + BOX_W / 2},${t.y - 5} ${t.x + BOX_W / 2},${t.y}`} />
      {[...placed.values()].map(({ op }) => {
        const { x, y } = pos(op);
        const sel = op === selected;
        return (
          <g key={op} role="button" tabIndex={0} aria-label={`OP ${op}`} aria-pressed={sel} className="cursor-pointer outline-none [&:focus-visible>rect]:[stroke-dasharray:2_2]"
            onClick={() => onSelect(op)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(op); } }}>
            <rect x={x + 0.5} y={y + 0.5} width={BOX_W - 1} height={BOX_H - 1} fill={sel ? "currentColor" : "var(--background)"} stroke="currentColor"
              strokeDasharray={enabled[op] ? undefined : "3 2"} shapeRendering="crispEdges" />
            <text x={x + BOX_W / 2} y={y + BOX_H / 2 + 4} textAnchor="middle" fontSize="11" fill={sel ? "var(--background)" : "currentColor"}>{op}</text>
          </g>
        );
      })}
    </svg>
  );
}
