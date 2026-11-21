// Main thread -> emulator worklet. Shared by the synth and worklet/processor.ts. The processor name carries the
// package's name, so engines from different packages can share one AudioContext.
export const PROCESSOR = "yamaha-dx7-engine";

export type ToWorklet =
  | { type: "patch"; data: Uint8Array } // 155 VCED voice bytes
  | { type: "noteOn"; note: number; velocity: number }
  | { type: "noteOff"; note: number }
  | { type: "allOff" }
  | { type: "operators"; mask: number }; // parameter 155: bit 5 OP1 … bit 0 OP6
