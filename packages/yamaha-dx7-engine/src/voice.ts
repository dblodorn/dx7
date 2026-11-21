// A DX7 voice as the engine takes it: the 155 unpacked VCED bytes, in the data format sheet's parameter order
// (OP6 first). This skeleton only checks the length; the codec (dx7-editor-sysex) replaces readVoice with one
// that also accepts a single-voice SysEx message.

export const VOICE_BYTES = 155;

// A copy of the voice's 155 bytes, so later changes to the caller's array can't reach the engine. Throws on
// anything else.
export function readVoice(voice: Uint8Array): Uint8Array {
  if (!(voice instanceof Uint8Array)) throw new TypeError("A voice must be a Uint8Array.");
  if (voice.length !== VOICE_BYTES) throw new RangeError(`A voice is ${VOICE_BYTES} bytes, got ${voice.length}.`);
  return voice.slice();
}
