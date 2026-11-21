// Checks shared by the AudioWorklet synth and the offline synth, so both refuse the same input with the same
// errors. They throw before anything reaches the engine, so a bad call never changes what is playing.

const midi = (what: string, value: number, min: number): number => {
  if (!Number.isInteger(value) || value < min || value > 127) throw new RangeError(`${what} must be a whole number from ${min} to 127, got ${value}.`);
  return value;
};

export const checkNote = (note: number): number => midi("Note", note, 0);
export const checkVelocity = (velocity: number): number => midi("Velocity", velocity, 0);

export function checkSampleRate(sampleRate: number): number {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new RangeError(`Sample rate must be a positive number, got ${sampleRate}.`);
  return sampleRate;
}

// Parameter 155's value: six bits, bit 5 OP1 … bit 0 OP6, 1 = on.
export function checkOperatorMask(mask: number): number {
  if (!Number.isInteger(mask) || mask < 0 || mask > 0b111111) throw new RangeError(`Operator mask must be a whole number from 0 to 63, got ${mask}.`);
  return mask;
}

// What one note-on means: velocity 0 is a note-off, as in MIDI.
export const noteOnEvent = (note: number, velocity: number): { note: number; velocity: number; off: boolean } => {
  checkNote(note);
  checkVelocity(velocity);
  return { note, velocity, off: velocity === 0 };
};
