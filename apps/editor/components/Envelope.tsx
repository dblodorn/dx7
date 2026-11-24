"use client";

// A DX7 envelope: four rates and four levels (manual p.15; the pitch envelope works the same way, p.17), drawn by the
// package's EnvelopeEditor. The drawing starts at LEVEL 4 on key-on, moves to LEVEL 1, 2 and 3, holds LEVEL 3 while
// the key is down, then RATE 4 takes it back to LEVEL 4. Points can be dragged; the sliders under it set the same
// values from the keyboard.

import { EnvelopeEditor } from "@dblodorn/sound-ui";
import { voiceField } from "@dblodorn/yamaha-dx7-engine";

interface Props {
  id: string;
  voice: Uint8Array;
  prefix: string; // "op1." … "op6." or "p" for the pitch envelope (pr1, pl1)
  center?: boolean; // the pitch envelope: draw the 50 line
  onChange: (values: Record<string, number>) => void;
}

const STAGES = [1, 2, 3, 4];

export default function Envelope({ id, voice, prefix, center, onChange }: Props) {
  const rk = (n: number) => (prefix === "p" ? `pr${n}` : `${prefix}r${n}`);
  const lk = (n: number) => (prefix === "p" ? `pl${n}` : `${prefix}l${n}`);
  const stages = STAGES.map(n => ({ rate: voice[voiceField(rk(n)).byte]!, level: voice[voiceField(lk(n)).byte]! }));
  return (
    <EnvelopeEditor id={id} label={prefix === "p" ? "PITCH ENVELOPE" : "ENVELOPE"} stages={stages} rateRange={[0, 99]} levelRange={[0, 99]}
      start={stages[3]!.level} sustain={2} hold center={center ? 50 : undefined}
      onChange={(i, c) => onChange("rate" in c ? { [rk(i + 1)]: c.rate } : { [lk(i + 1)]: c.level })} />
  );
}
