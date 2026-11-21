# DX7 editor and engine

A browser editor and librarian for the Yamaha DX7 (Mk I voices) over Web MIDI SysEx, and its emulator published as a package (`@dblodorn/yamaha-dx7-engine`) that other apps (windchime first) use as a sound source. Sibling of `~/Desktop/sound/vz10m`, which it copies: same workspace shape, same stack, same UI rules, same engine-package convention (`openspec/specs/engine-packages`, copied from vz10m). When this file doesn't say how something is done, do it the way vz10m's `AGENTS.md` says.

**Status:** the workspace shell is built (`scaffold-dx7-workspace`): the editor runs with SOUND, KEYS, AUDIO, MIDI notes and LIBRARY → RESOURCES, and the engine package has the full surface with a silent engine. Next is `dx7-editor-sysex`: the VCED/VMEM codec, MIDI voice transfer, the voice editor and the local library.

Later changes, in order: the emulator (`dx7-emulator`), sharing and banks (`shared-voices-and-banks`, with a `dx7-voices` change in dmbk-graphql-api), publishing the engine package, and windchime's `add-dx7-synth`.

## Commands

Run from the root; they fan out to the workspace (`pnpm -F <name> <script>` for one package).

- `pnpm dev`, `pnpm build`: the editor. Both build the engine's worklet first (`pnpm -F dx7-editor engine`), then `relay`.
- `pnpm test`: every package's `test/*.test.ts` through `node --test` (`.ts` run directly). The engine's tests import `src/worklet/code.generated.ts`, so its `test` script builds the worklet first.
- `pnpm typecheck`: `tsc --noEmit` in each package. Must be clean; `pnpm build` type-checks too.
- `pnpm relay`: the Relay compiler (no operations yet; SHARED adds them). `pnpm schema:pull` refreshes `apps/editor/schemas/dmbk-graphql-api.graphql`.
- Engine package (`pnpm -F @dblodorn/yamaha-dx7-engine …`): `build:worklet`, `build` (writes `dist/`), `smoke` (packs, installs outside the workspace, type-checks a consumer, renders).
- Don't run `pnpm build` while `pnpm dev` is running (it overwrites `.next`).

## Layout

- `packages/yamaha-dx7-engine`: `src/voice.ts` (`readVoice`, `VOICE_BYTES` = 155; the codec replaces it), `src/engine/engine.ts` (16-voice note assignment, oldest stolen; renders silence until the emulator), `src/synth.ts`, `src/offline.ts`, `src/notes.ts`, `src/worklet/` (processor registered as `yamaha-dx7-engine`), `src/sources/patch-source.ts`, `scripts/` (build-worklet, rewrite-dts, smoke-pack, check-tag). Workspace `exports["."]` is `src/index.ts`; `publishConfig.exports` swaps in `dist/`. Version 0.0.0, unpublished.
- `apps/editor`: copied from vz10m at `24df23e` (same paths, so `diff -r` against vz10m finds the copies): theme, Knif Mono, `components/ui/*`, `components/params.tsx` (with a local `Field` type until the codec exports one), `Info.tsx`, `KeyboardFloater.tsx`, `lib/audio.ts`, `lib/play.ts` (PLAY TO: EMULATOR / DX7 / BOTH), `lib/router.ts`, `lib/store.ts` (`dx7.*`), the changelog page, `app/api/graphql/route.ts` and `lib/relay/environment.ts`. Rewritten: `components/Editor.tsx` (the shell), `components/Library.tsx` (LOCAL, RESOURCES), `lib/midi.ts` (hands every SysEx message on raw), `lib/help.ts`, `lib/resources.ts`.
- `.github/workflows/publish-yamaha-dx7-engine.yml`: publishes on a tag `yamaha-dx7-engine@<version>` after check-tag, typecheck, test, build and smoke.
- Deploy: Vercel project `dx7` (team `db13`), root directory `apps/editor`; every push to `main` goes to production at `https://dx7.dmbk.io`. The editor uses the workspace engine, so no GitHub Packages token is needed.

## Decisions already made

- **One repo, `dblodorn/dx7`**: the editor at `apps/editor` (package `dx7-editor`), the engine at `packages/yamaha-dx7-engine`. Live at `dx7.dmbk.io`.
- **Mk I voices only.** A voice is the unpacked 155-byte VCED; a 32-voice VMEM bank is converted on import and export. DX7II/TX802 extras (ACED, microtuning) are a later change: read and ignored until then.
- **Emulation source:** written fresh from published descriptions of the DX7's chips, with msfa (Google's music-synthesizer-for-android, Apache-2.0) as the reference; its tables may be ported with a `NOTICE`. **Never copy code from Dexed (GPL-3).** Dexed renders may be used as a test oracle (outputs compared, no code taken).
- **Factory ROM voices (ROM1A–4B):** the import script is built; what goes into the shared library is decided separately by the user (Yamaha is still in business).
- **Shared code:** the engine package copies vz10m's helpers (notes checks, patch sources, build scripts) for now; a shared base package comes later, once both engines are stable. The API side is factored into one synth-voices module with separate collections and GraphQL types.
- **Names:** synth id `yamaha-dx7`, menu name `YAMAHA DX7`, localStorage prefix `dx7.*`.

## Constraints (from vz10m, unchanged)

- TypeScript, strict, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, explicit `.ts` imports; tests with `node --test`.
- Bytes are the source of truth: edits go through `set()` and touch only that field; never rebuild a voice from params.
- Don't guess the format: every byte layout cites a source; conflicting facts are flagged `unverified`.
- Nothing in the engine package writes voices or builds SysEx; writing lives in `apps/editor/lib/dx7/`.
- SSR-safe modules; MIDI access only on a click, with `sysex: true`.
- windchime's 1-bit UI language; changelog line for every shipped editor change; package releases get a `CHANGELOG.md` entry.
- Features go through OpenSpec changes and are archived when done.
