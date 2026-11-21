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
  { date: "2026-11-21", type: "FEATURE", text: "First release: MIDI connection, KEYS, audio output choice and LIBRARY → RESOURCES. Voice editing comes next." },
];
