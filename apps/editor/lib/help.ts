// What each part of the editor is, in terms of the DX7's FM architecture. Shown by the (?) buttons.
// Written for this editor from the DX7 Operating Manual (page numbers cited), not quoted from it.
// `editor` notes say where this editor or its emulator departs from the hardware or is still unfinished.

export interface Help {
  title: string;
  body: string[];
  manual?: string; // owner's manual pages
  editor?: string;
}

export const HELP = {
  algorithm: {
    title: "ALGORITHM",
    body: [
      "A DX7 voice is six operators: sine oscillators, each with its own envelope. The algorithm decides how they're wired: operators on the bottom row (carriers) are heard, the ones above them (modulators) bend the waveform of the operator below, which shapes the tone rather than the volume.",
      "There are 32 fixed wirings. The diagram here follows the chart printed on the DX7's panel; press an operator to edit it.",
    ],
    manual: "pp.9–12",
  },
  feedback: {
    title: "FEEDBACK",
    body: [
      "One operator in every algorithm feeds its own output back into itself (in algorithms 4 and 6, back through a short chain). FEEDBACK 0–7 sets how much: higher values add harmonics up to a noise-like edge.",
    ],
    manual: "p.13",
  },
  oscSync: {
    title: "OSC KEY SYNC",
    body: [
      "ON: every operator starts from the same point of its sine on each key, so attacks are identical. OFF: an operator carries on from where it was, so repeated notes vary slightly.",
    ],
    manual: "p.14",
  },
  operators: {
    title: "OPERATORS",
    body: [
      "The six operators side by side, with their output level and frequency. ON/OFF mutes an operator while you edit, as the DX7's operator keys do; it isn't stored with the voice, so to silence an operator for good set its OUTPUT LEVEL to 0.",
    ],
    manual: "pp.12, 16",
    editor: "ON/OFF mutes the operator in SOUND and is sent to the DX7 (with SEND ON EDIT); it resets to all on when a voice is opened, as on the hardware.",
  },
  envelope: {
    title: "ENVELOPE",
    body: [
      "Four rates and four levels, 0–99. On a key the envelope moves from LEVEL 4 to LEVEL 1 at RATE 1, then to LEVEL 2 and LEVEL 3; it holds LEVEL 3 until the key is released, then RATE 4 takes it back to LEVEL 4. Higher rates are faster.",
      "On a carrier this is the volume over time; on a modulator it is the brightness over time. LEVEL 4 is normally 0, and then LEVEL 1 should be above about 50.",
    ],
    manual: "p.15",
    editor: "The drawing shortens a segment as its rate rises; it isn't to time scale.",
  },
  scaling: {
    title: "KEYBOARD LEVEL SCALING",
    body: [
      "Raises or lowers the operator's level for keys away from the BREAK POINT (A-1 to C8). Each side has its own DEPTH (0–99) and CURVE: −LIN and −EXP lower the level, +LIN and +EXP raise it, linearly or exponentially.",
      "With a large depth on a + curve an operator can sound even at OUTPUT LEVEL 0.",
    ],
    manual: "p.16",
    editor: "The drawing sketches the curve shapes from the manual's figure; it isn't the emulator's exact response.",
  },
  rateScaling: {
    title: "RATE SCALING",
    body: ["Makes the operator's envelope faster for higher keys, 0–7, like a piano's short treble and long bass."],
    manual: "p.16",
  },
  output: {
    title: "OUTPUT LEVEL AND SENSITIVITY",
    body: [
      "OUTPUT LEVEL (0–99) is the operator's overall level: loudness for a carrier, modulation depth for a modulator.",
      "VELOCITY SENS (0–7) is how much key velocity changes that level. AMP MOD SENS (0–3) is how much the LFO's amplitude modulation reaches this operator: tremolo on a carrier, a 'wow' on a modulator.",
    ],
    manual: "pp.14, 16",
  },
  frequency: {
    title: "FREQUENCY",
    body: [
      "RATIO: the operator follows the keyboard at a multiple of the note's pitch. COARSE gives ×0.5 or ×1 to ×31, FINE adds 0–99 % on top.",
      "FIXED: the operator stays at one pitch whatever key is played. COARSE picks 1, 10, 100 or 1000 Hz and FINE multiplies it by up to 9.772. DETUNE shifts it slightly, −7 to +7.",
    ],
    manual: "pp.14–15",
  },
  pitchEnv: {
    title: "PITCH ENVELOPE",
    body: [
      "The same four rates and levels as an operator envelope, applied to the pitch of the whole voice. 50 is no change; 99 and 0 are four octaves up and down. Set all four levels to 50 to switch it off.",
    ],
    manual: "p.17",
  },
  lfo: {
    title: "LFO",
    body: [
      "A slow oscillator for vibrato and tremolo: WAVE (triangle, saw down, saw up, square, sine, sample and hold), SPEED, DELAY before it starts, and PMD and AMD, the depths it applies to pitch and amplitude without touching the wheel.",
      "KEY SYNC restarts the wave on each key. PITCH MOD SENS (0–7) sets how strongly the voice responds to pitch modulation; each operator's AMP MOD SENS does the same for amplitude.",
    ],
    manual: "pp.13–14",
  },
  transpose: {
    title: "TRANSPOSE",
    body: ["Moves the whole voice up or down two octaves in semitones. C3 is no transposition."],
    manual: "p.17",
  },
  sound: {
    title: "SOUND (EMULATOR)",
    body: [
      "Plays the voice in the browser with an emulation of the DX7's FM engine: 16 notes, 6 operators each, the 32 algorithms with feedback, every envelope, the LFO and the scaling settings. It needs no hardware. Play it with KEYS or the Z–M keys.",
    ],
    editor: "Most of the engine is a port of msfa, an open DX7-compatible engine, so envelopes, pitch and FM behave like the DX7's; tremolo depth (AMD and AMP MOD SENS) is our estimate. It hasn't been compared with recordings of a real DX7 yet. Levels add up as on the hardware, so a voice with one carrier, like INIT VOICE, is quieter than one with several.",
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
      "Voices travel as System Exclusive messages: one voice at a time, or all 32 internal voices as one bank. On the DX7, FUNCTION then key 8 sets the MIDI channel; pressing 8 again shows SYS INFO, which must be AVAIL.",
      "To send from the DX7: with SYS INFO AVAIL, selecting a voice sends it. For all 32, press 8 once more for MIDI TRANSMIT? and answer YES. The DX7 always transmits on channel 1.",
      "To receive on the DX7: also turn MEMORY PROTECT INTERNAL off. A voice then shows on its display by name; a bank replaces all 32 internal voices.",
    ],
    manual: "pp.21–22, 30–32",
  },
  library: {
    title: "LIBRARY",
    body: [
      "LOCAL: voices kept in this browser. IMPORT .SYX reads single voices and 32-voice banks (the format most DX7 archives use), and lets you choose which to add. Each voice exports as its own .syx; EXPORT BANK writes up to 32 checked voices as one bank, filled out with INIT VOICE.",
      "BANK SEND puts that bank into the DX7's internal memory, replacing all 32 voices there.",
      "SHARED: a public list anyone can open. SHARE CURRENT adds the voice you're editing. Voices marked YOURS were shared from this browser, and only it can rename, update or delete them, using a device key kept here (no account). Copy the key under DEVICE KEY to manage them from another browser.",
      "RESOURCES: the owner's manual, the SysEx format, articles on how the DX7 works, and other tools elsewhere on the web.",
    ],
    manual: "pp.19–22",
    editor: "Banks stay in LOCAL: check up to 32 voices there to export or send them as one bank.",
  },
} satisfies Record<string, Help>;

export type HelpKey = keyof typeof HELP;
