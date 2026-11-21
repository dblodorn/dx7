// What each part of the editor is, in terms of the DX7's FM architecture. Shown by the (?) buttons.
// Written for this editor from the DX7 owner's manual (pages cited once dx7-editor-sysex reads it), not quoted.
// `editor` notes say where this editor or its emulator departs from the hardware or is still unfinished.

export interface Help {
  title: string;
  body: string[];
  manual?: string; // owner's manual pages
  editor?: string;
}

export const HELP = {
  sound: {
    title: "SOUND (EMULATOR)",
    body: [
      "Plays the voice in the browser with an emulation of the DX7's FM engine: 16 notes, 6 operators each. It needs no hardware.",
    ],
    editor: "Not built yet: SOUND starts audio and takes notes, but the engine is silent until the emulator lands.",
  },
  keys: {
    title: "KEYS",
    body: [
      "A floating two-octave keyboard. PLAY TO sends notes to the emulator, the DX7 over MIDI, or both; VELOCITY lets you hear the velocity settings. The Z–M computer keys follow the same PLAY TO.",
    ],
  },
  midi: {
    title: "MIDI AND SYSEX",
    body: [
      "Voices travel between the DX7 and the editor as System Exclusive messages: one voice at a time, or all 32 internal voices in one bank.",
      "Notes go out on CHANNEL. TEST NOTE plays middle C; PANIC silences everything.",
    ],
    editor: "Receiving and sending voices arrive with the voice editor. Until then MIDI plays notes only.",
  },
  library: {
    title: "LIBRARY",
    body: [
      "LOCAL: voices kept in this browser, moved in and out as .syx files.",
      "RESOURCES: the owner's manual, the SysEx format, articles on how the DX7 works, and other tools elsewhere on the web.",
    ],
    editor: "LOCAL fills up once the voice editor arrives; SHARED and BANKS come after the emulator.",
  },
} satisfies Record<string, Help>;

export type HelpKey = keyof typeof HELP;
