// The one field table for a DX7 voice: the 155 unpacked VCED bytes, one field per byte, in the order of the
// DX7 MIDI data format (OP6 first). Sources:
//   [manual]  Yamaha DX7 Operating Manual, pp.30–31 "MIDI DATA FORMAT" (the voice parameter table, g=0) and the
//             EDIT MODE pages 12–17 for what each value means on the panel.
//   [sheet]   The DX7 MIDI data format sheet as transcribed by Ewan A. Macpherson (1993), section D:
//             https://homepages.abdn.ac.uk/d.j.benson/pages/dx7/sysex-format.txt
// Both agree on every byte and range except LFO WAVE (see there). A field's `display` is given only where a source
// states the panel value; everything else is shown as stored.

export interface Field {
  key: string; // "op1.r1", "algorithm", …
  byte: number; // index in the 155 VCED bytes
  min: number;
  max: number;
  label: string;
  options?: readonly string[]; // names for each value, from the sources
  display?: (v: number) => string; // the panel's reading of a stored value
  unverified?: true; // sources disagree or only imply it; settle with a hardware dump
}

export const VOICE_BYTES = 155;
export const OPERATORS = [1, 2, 3, 4, 5, 6] as const;
export type Operator = (typeof OPERATORS)[number];
export const NAME_BYTE = 145;
export const NAME_LENGTH = 10;

export const CURVES = ["-LIN", "-EXP", "+EXP", "+LIN"] as const; // [manual] p.16, [sheet] D
export const LFO_WAVES = ["TRIANGLE", "SAW DOWN", "SAW UP", "SQUARE", "SINE", "S/HOLD"] as const; // [manual] p.13
export const OSC_MODES = ["RATIO", "FIXED"] as const; // [manual] p.14, [sheet] D "0=ratio"

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
// Yamaha's octave numbering: middle C (MIDI 60) is C3
export const yamahaNote = (midi: number): string => `${NOTES[((midi % 12) + 12) % 12]}${Math.floor(midi / 12) - 2}`;

// The 21 bytes of one operator, at their offset from the operator's first byte.
const OPERATOR_FIELDS: { name: string; offset: number; max: number; label: string; options?: readonly string[]; display?: (v: number) => string }[] = [
  { name: "r1", offset: 0, max: 99, label: "RATE 1" },
  { name: "r2", offset: 1, max: 99, label: "RATE 2" },
  { name: "r3", offset: 2, max: 99, label: "RATE 3" },
  { name: "r4", offset: 3, max: 99, label: "RATE 4" },
  { name: "l1", offset: 4, max: 99, label: "LEVEL 1" },
  { name: "l2", offset: 5, max: 99, label: "LEVEL 2" },
  { name: "l3", offset: 6, max: 99, label: "LEVEL 3" },
  { name: "l4", offset: 7, max: 99, label: "LEVEL 4" },
  // 0 = A-1 … 99 = C8 ([manual] p.16), 39 = C3 ([sheet] D)
  { name: "bp", offset: 8, max: 99, label: "BREAK POINT", display: v => yamahaNote(v + 21) },
  { name: "ld", offset: 9, max: 99, label: "LEFT DEPTH" },
  { name: "rd", offset: 10, max: 99, label: "RIGHT DEPTH" },
  { name: "lc", offset: 11, max: 3, label: "LEFT CURVE", options: CURVES },
  { name: "rc", offset: 12, max: 3, label: "RIGHT CURVE", options: CURVES },
  { name: "rs", offset: 13, max: 7, label: "RATE SCALING" },
  { name: "ams", offset: 14, max: 3, label: "AMP MOD SENS" },
  { name: "kvs", offset: 15, max: 7, label: "VELOCITY SENS" },
  { name: "ol", offset: 16, max: 99, label: "OUTPUT LEVEL" },
  { name: "mode", offset: 17, max: 1, label: "OSC MODE", options: OSC_MODES },
  { name: "coarse", offset: 18, max: 31, label: "FREQ COARSE" },
  { name: "fine", offset: 19, max: 99, label: "FREQ FINE" },
  // 0 = -7 ([sheet] D), shown -7…+7 ([manual] p.15)
  { name: "detune", offset: 20, max: 14, label: "DETUNE", display: v => (v > 7 ? `+${v - 7}` : String(v - 7)) },
];
export const OPERATOR_BYTES = 21;
export const operatorBase = (op: Operator): number => (6 - op) * OPERATOR_BYTES; // OP6 at 0, OP1 at 105

const VOICE_WIDE: Field[] = [
  ...[1, 2, 3, 4].map((n, i): Field => ({ key: `pr${n}`, byte: 126 + i, min: 0, max: 99, label: `PITCH RATE ${n}` })),
  // 50 is no pitch change, 0 and 99 are -4 and +4 octaves ([manual] p.17)
  ...[1, 2, 3, 4].map((n, i): Field => ({ key: `pl${n}`, byte: 130 + i, min: 0, max: 99, label: `PITCH LEVEL ${n}` })),
  { key: "algorithm", byte: 134, min: 0, max: 31, label: "ALGORITHM", display: v => String(v + 1) }, // panel 1–32
  { key: "feedback", byte: 135, min: 0, max: 7, label: "FEEDBACK" },
  { key: "oscSync", byte: 136, min: 0, max: 1, label: "OSC KEY SYNC" },
  { key: "lfoSpeed", byte: 137, min: 0, max: 99, label: "LFO SPEED" },
  { key: "lfoDelay", byte: 138, min: 0, max: 99, label: "LFO DELAY" },
  { key: "lfoPmd", byte: 139, min: 0, max: 99, label: "LFO PMD" },
  { key: "lfoAmd", byte: 140, min: 0, max: 99, label: "LFO AMD" },
  { key: "lfoSync", byte: 141, min: 0, max: 1, label: "LFO KEY SYNC" },
  // [manual] p.31 prints 0–4, but p.13 lists six waves and [sheet] D gives 0–5 (noting the data sheet's misprint)
  { key: "lfoWave", byte: 142, min: 0, max: 5, label: "LFO WAVE", options: LFO_WAVES, unverified: true },
  { key: "pms", byte: 143, min: 0, max: 7, label: "PITCH MOD SENS" },
  // 0–48 in semitones, 24 = C3 = no transposition ([manual] p.17 "C3 as standard", [sheet] D "12 = C2")
  { key: "transpose", byte: 144, min: 0, max: 48, label: "TRANSPOSE", display: v => yamahaNote(v + 36) },
];

export const VOICE_FIELDS: readonly Field[] = [
  ...OPERATORS.flatMap(op => OPERATOR_FIELDS.map((f): Field => ({
    key: `op${op}.${f.name}`, byte: operatorBase(op) + f.offset, min: 0, max: f.max, label: f.label,
    ...(f.options ? { options: f.options } : {}), ...(f.display ? { display: f.display } : {}),
  }))),
  ...VOICE_WIDE,
];

const BY_KEY = new Map(VOICE_FIELDS.map(f => [f.key, f]));
export const OPERATOR_FIELD_NAMES: readonly string[] = OPERATOR_FIELDS.map(f => f.name);

// Throws on an unknown key, so a typo never reads or writes a random byte.
export function voiceField(key: string): Field {
  const f = BY_KEY.get(key);
  if (!f) throw new Error(`Unknown DX7 voice field "${key}".`);
  return f;
}

// Parameter 155 (operator on/off) is not part of a voice: it exists only in parameter-change messages
// ([manual] p.31, p.16 "not stored in memory"). Bit 5 is OP1 … bit 0 is OP6.
export const OPERATOR_ENABLE_PARAM = 155;
