# Design

## Copy, then strip

The shell is copied from vz10m at `24df23e` (the iOS silent-switch fix included), not regenerated, so the fixes vz10m collected (SSR-safe capability reads, the hydration-safe slider thumb, the AudioContext ownership rules, the persisted-operation route) come along. Everything VZ-specific is removed rather than renamed:

| From vz10m | In dx7 |
|---|---|
| `apps/editor/lib/vz/*`, `components/EnvelopeEditor.tsx` (8-step) | removed; DX7 versions arrive in `dx7-editor-sysex` |
| `components/Editor.tsx` | a shell: header, SOUND, MIDI, LIBRARY (LOCAL only), KEYS, an empty voice area |
| `components/Library.tsx` | LOCAL and RESOURCES tabs; SHARED and BANKS come with sharing |
| `lib/resources.ts` | DX7 links (owner's manual, data format sheet, msfa, Ken Shirriff's chip articles) |
| `lib/changelog.ts` | one entry: first release |
| `lib/store.ts` | prefix `dx7.*` |
| `worker/banks-*`, `lib/banks/*`, `lib/device.ts`, `lib/vz/names.ts` | not copied yet (sharing and banks change) |
| `packages/casio-vz-engine` | `packages/yamaha-dx7-engine`: `synth.ts`, `offline.ts`, `notes.ts`, `worklet/messages.ts`, `worklet/processor.ts` (silent), `sources/` (patch-source shape and dmbk client, its queries left for the sharing change), the three scripts |

## The silent engine

The skeleton engine accepts any 155-byte voice, tracks notes exactly as the real one will (16 voices, velocity 0 = note-off, all-notes-off), and renders zeros. That lets the editor's SOUND toggle, the KEYS floater and the package's smoke test run end to end now, and the emulator change replaces only `src/engine/`.

`loadVoice` checks the length (155) and nothing else yet; the codec change adds the range checks from `params.ts`.

## Package name and registry

`@dblodorn/yamaha-dx7-engine`, `publishConfig.registry` GitHub Packages, `exports["."]` → `src/index.ts` in the workspace and `dist/` when published, as in vz10m. Version starts at `0.0.0` and stays unpublished until the emulator plays.

## Deploy

Vercel builds from `apps/editor` with pnpm. The editor depends on the workspace engine (`workspace:*`), so unlike windchime it needs no GitHub Packages token. `DMBK_GRAPHQL_API_KEY` is added when SHARED arrives; until then the route has no persisted operations and refuses everything, and the production check for the key is deferred to that change.

## Risks

- **Drift from vz10m:** fixes to the shared shell now have to be made twice. Accepted until a shared base exists; each copied file keeps a first-line comment naming its vz10m origin, so a later diff finds them.
