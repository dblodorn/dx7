// What changed, for /changelog. Newest first: add each shipped feature, fix or enhancement at the top,
// one short line about what a player sees, hears or can do. Same-day entries stay in the order written.

// each type's badge fill: Sanzo Wada combination 225 (https://sanzo-wada.dmbk.io/combination/225), every color
// at least 5.3:1 against the badge's white text
export interface ChangeType { name: string; slug: string; hex: string }
export type ChangeKind = "FEATURE" | "ENHANCEMENT" | "FIX";
export interface Change { date: string; type: ChangeKind; text: string }

export const TYPES: Record<ChangeKind, ChangeType> = {
  FEATURE: { name: "DUSKY GREEN", slug: "dusky-green", hex: "#00592e" },
  ENHANCEMENT: { name: "DARK SLATE PURPLE", slug: "dark-slate-purple", hex: "#53225c" },
  FIX: { name: "CARMINE", slug: "carmine", hex: "#d60036" },
};

export const CHANGELOG: Change[] = [
  { date: "2026-11-21", type: "FEATURE", text: "SOUND plays the voice in the browser: a DX7 emulator with all 32 algorithms, envelopes, LFO and scaling. Operator ON/OFF mutes it too." },
  { date: "2026-11-21", type: "FEATURE", text: "Voice editor: the algorithm with its diagram, six operators with envelopes, keyboard scaling and frequency, the pitch envelope and the LFO, with undo." },
  { date: "2026-11-21", type: "FEATURE", text: "MIDI: receive voices and 32-voice banks from the DX7, send voices and banks back, and SEND ON EDIT changes the DX7 as you edit." },
  { date: "2026-11-21", type: "FEATURE", text: "LIBRARY → LOCAL: save voices in the browser, import .syx voices and banks, export voices and banks of up to 32." },
  { date: "2026-11-21", type: "FEATURE", text: "First release: MIDI connection, KEYS, audio output choice and LIBRARY → RESOURCES. Voice editing comes next." },
];
