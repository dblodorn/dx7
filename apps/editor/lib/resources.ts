// LIBRARY → RESOURCES: outside pages about the Yamaha DX7, newest finds last. Free sources only; each line says
// what's there in terms a player can act on.

export interface Resource { name: string; url: string; text: string }

export const RESOURCES: Resource[] = [
  {
    name: "DX7 OWNER'S MANUAL",
    url: "https://usa.yamaha.com/files/download/other_assets/9/333979/DX7E1.pdf",
    text: "Yamaha's manual (PDF): the algorithm chart, every voice parameter, and the MIDI and memory-protect settings. The (?) notes cite its pages.",
  },
  {
    name: "DX7 SYSEX FORMAT",
    url: "https://homepages.abdn.ac.uk/d.j.benson/pages/dx7/sysex-format.txt",
    text: "Yamaha's MIDI data format sheet, transcribed: the single-voice and 32-voice dump layouts this editor reads and writes.",
  },
  {
    name: "DAVE BENSON'S DX7 PAGE",
    url: "https://homepages.abdn.ac.uk/d.j.benson/pages/html/dx7.html",
    text: "Notes on DX7 programming and data, with links to patch collections.",
  },
  {
    name: "REVERSE-ENGINEERING THE DX7'S SOUND CHIP",
    url: "https://www.righto.com/2021/11/reverse-engineering-yamaha-dx7.html",
    text: "Ken Shirriff's series on the YM21280 operator chip from die photos: how the DX7 makes its sine waves, envelopes and algorithms.",
  },
  {
    name: "HOW ALGORITHMS ARE IMPLEMENTED",
    url: "https://www.righto.com/2021/12/yamaha-dx7-chip-reverse-engineering.html",
    text: "Part 4 of that series: how the chip routes the six operators for each of the 32 algorithms, and feedback.",
  },
  {
    name: "MUSIC SYNTHESIZER FOR ANDROID (MSFA)",
    url: "https://github.com/google/music-synthesizer-for-android",
    text: "Raph Levien's open DX7-style FM engine (Apache-2.0), the reference for this editor's emulator.",
  },
  {
    name: "DEXED",
    url: "https://github.com/asb2m10/dexed",
    text: "A free DX7 plugin and librarian for desktop DAWs. It reads the same .syx files as this editor.",
  },
];
