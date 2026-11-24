"use client";

// The algorithm drawn from the engine's table by the package's OperatorGraph, like the chart on the DX7's panel:
// carriers on the bottom row, each modulator above what it modulates, and the feedback loop. The selected operator
// is inverted, switched-off ones dashed; pressing a box selects that operator.

import { OperatorGraph } from "@dblodorn/sound-ui";
import { algorithmOf, type Operator } from "@dblodorn/yamaha-dx7-engine";

interface Props {
  algorithm: number; // stored, 0–31
  selected: Operator;
  enabled: Record<Operator, boolean>;
  onSelect: (op: Operator) => void;
}

export default function AlgorithmDiagram({ algorithm, selected, enabled, onSelect }: Props) {
  const a = algorithmOf(algorithm);
  return (
    <OperatorGraph label={`ALGORITHM ${algorithm + 1}`} carriers={a.carriers} edges={a.edges} feedback={a.feedback}
      selected={selected} enabled={op => enabled[op as Operator]} onSelect={op => onSelect(op as Operator)} />
  );
}
