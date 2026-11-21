// Test-only voice builders. The package never writes voices; the editor's codec does (apps/editor/lib/dx7). These
// copies let the package's tests make voices and dumps without depending on the editor.
import { NAME_BYTE, VOICE_BYTES, voiceField } from "../src/params.ts";
import { checksum } from "../src/sysex.ts";

export function testVoice(values: Record<string, number> = {}, name = "TEST VOICE"): Uint8Array {
  const v = new Uint8Array(VOICE_BYTES);
  for (const [k, x] of Object.entries(values)) v[voiceField(k).byte] = x;
  for (let i = 0; i < 10; i++) v[NAME_BYTE + i] = (name.padEnd(10).charCodeAt(i)) & 0x7f;
  return v;
}

export function message(format: number, data: Uint8Array, channel = 1): Uint8Array {
  return Uint8Array.from([0xf0, 0x43, channel - 1, format, data.length >> 7, data.length & 0x7f, ...data, checksum(data), 0xf7]);
}
