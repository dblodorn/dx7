# DX7 editor and engine

A browser editor and librarian for the Yamaha DX7 (Mk I voices) over Web MIDI SysEx, and its emulator published as a package (`@dblodorn/yamaha-dx7-engine`) that other apps (windchime first) use as a sound source. Sibling of `~/Desktop/sound/vz10m`, which it copies: same workspace shape, same stack, same UI rules, same engine-package convention (`openspec/specs/engine-packages`, copied from vz10m). When this file doesn't say how something is done, do it the way vz10m's `AGENTS.md` says.

**Status:** the workspace and `dx7-editor-sysex` (codec, MIDI, voice editor, local library) are archived; hardware checks are issue #3. `dx7-emulator` is built: SOUND plays. Reference comparisons are deferred to issue #6.

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

- `packages/yamaha-dx7-engine`: the read side and the player. Nothing in it writes, and `test/codec.test.ts` enforces that.
  - `src/params.ts`: the one field table. It covers all 155 VCED bytes (OP6 first, `op1.r1` … `op6.detune`, then `pr1` … `transpose`; the name is at 145–154). Each byte cites the manual p.31 or the format sheet. `display` is given only where a source states the panel reading. Look fields up with `voiceField(key)`, which throws on an unknown key.
  - `src/sysex.ts`: `parse`, `splitMessages`, `checksum`, `unpackVoice` (VMEM's 128 packed bytes → 155).
  - `src/codec.ts`: `get`, `getName`, `readVoice` (155 bytes or a 163-byte VCED), `frequency` (ratio/Hz as the panel shows it), `fromSyx`.
  - `src/algorithms.ts`: the 32 algorithms (carriers, edges, feedback), transcribed from the panel chart. `test/algorithms.test.ts` checks all of them against msfa's routing table.
  - `src/engine/`: the emulator, mostly ported from msfa (Apache-2.0; `NOTICE` lists the files, each ported file says so in its header; never copy from Dexed).
    - `calibration.ts` is the one file of tunable numbers, each labelled PORTED / MANUAL / ESTIMATE. Changing one changes the sound: release at least a minor version, with a changelog line.
    - `tables.ts` (sine, 2^x, frequency, in msfa's Q24 fixed point), `env.ts`, `pitchenv.ts`, `lfo.ts` (one per engine, as on the DX7).
    - `note.ts`: one voice, routed per sample from `algorithms.ts`, so feedback through a chain (algorithms 4 and 6) works. Amplitude modulation, transpose, OSC KEY SYNC off and operator on/off are written here.
    - `engine.ts`: 16 preallocated voices; a released voice frees itself once silent; 64-sample blocks.
    - `render()` must never allocate (the test runs with `--expose-gc`). Keep the fixed-point arithmetic: `| 0` for 32-bit wraparound, `>>>` for unsigned, doubles for msfa's 64-bit products.
  - `setOperators(mask)` on both synths is a DX7-only extra (parameter 155), outside the common surface.
  - Also `src/synth.ts`, `src/offline.ts`, `src/notes.ts`, `src/worklet/` (the processor `yamaha-dx7-engine`), `src/sources/patch-source.ts` and `scripts/`.
  - `test/voices.ts` is a test-only voice builder.
  - Workspace `exports["."]` is `src/index.ts`; `publishConfig.exports` swaps in `dist/`. Version 0.0.0, unpublished.
- `apps/editor/lib/dx7/`: the write side, re-exporting the read side.
  - `codec.ts`: `set`/`setMany` (clamp, one byte each), `setName`, `operatorBytes`/`setOperator`, `initVoice` (values unverified: the manual doesn't list them), `packVoice`, `enableMask`.
  - `sysex.ts`: `toSysex`, `toBankSysex` (pads with INIT VOICE), `toParamChange` (group 0), `toSyx`.
  - Tests: `apps/editor/test/dx7.test.ts`.
- Editor UI:
  - `components/Editor.tsx`: the history reducer and the MIDI receive.
  - SEND ON EDIT diffs each new voice against the last one sent. Up to 10 changed bytes go as parameter changes, more as one VCED, and a voice that came from the DX7 isn't echoed back.
  - Operator on/off is session state, sent as parameter 155.
  - `AlgorithmDiagram.tsx`, `Envelope.tsx` (each drag changes one rate or level), `ScalingCurve.tsx` (a sketch) and `ImportDialog.tsx` (banks from MIDI and `.syx` files) are their own components.
  - `Library.tsx` LOCAL: up to 32 checked voices make a bank for EXPORT BANK and BANK SEND.
- `apps/editor`: copied from vz10m at `24df23e` (same paths, so `diff -r` against vz10m finds the copies): theme, Knif Mono, `components/ui/*`, `components/params.tsx` (FieldRow takes the package's `Field`), `Info.tsx`, `KeyboardFloater.tsx`, `lib/audio.ts`, `lib/play.ts` (PLAY TO: EMULATOR / DX7 / BOTH), `lib/router.ts`, `lib/store.ts` (`dx7.*`), the changelog page, `app/api/graphql/route.ts` and `lib/relay/environment.ts`. Rewritten: `components/Editor.tsx`, `components/Library.tsx`, `lib/midi.ts` (hands every SysEx message on raw; the editor parses it), `lib/help.ts` (manual pages cited), `lib/resources.ts`.
- `.github/workflows/publish-yamaha-dx7-engine.yml`: publishes on a tag `yamaha-dx7-engine@<version>` after check-tag, typecheck, test, build and smoke.
- Deploy: Vercel project `dx7` (team `db13`), root directory `apps/editor`; every push to `main` goes to production at `https://dx7.dmbk.io`. The editor uses the workspace engine, so no GitHub Packages token is needed.

## Decisions already made

- **One repo, `dblodorn/dx7`**: the editor at `apps/editor` (package `dx7-editor`), the engine at `packages/yamaha-dx7-engine`. Live at `dx7.dmbk.io`.
- **Mk I voices only.** A voice is the unpacked 155-byte VCED; a 32-voice VMEM bank is converted on import and export. DX7II/TX802 extras (ACED, microtuning) are a later change: read and ignored until then.
- **Emulation source:** written fresh from published descriptions of the DX7's chips, with msfa (Google's music-synthesizer-for-android, Apache-2.0) as the reference; its tables may be ported with a `NOTICE`. **Never copy code from Dexed (GPL-3).** Dexed renders may be used as a test oracle (outputs compared, no code taken).
- **Factory ROM voices (ROM1A–4B):** the import script is built; what goes into the shared library is decided separately by the user (Yamaha is still in business).
- **Shared code:** the engine package copies vz10m's helpers (notes checks, patch sources, build scripts) for now; a shared base package comes later, once both engines are stable. The API side is factored into one synth-voices module with separate collections and GraphQL types.
- **Names:** synth id `yamaha-dx7`, menu name `YAMAHA DX7`, localStorage prefix `dx7.*`.

## DX7 facts the code relies on (owner's manual)

- The DX7 always transmits on channel 1 (p.22), so MIDI IN reads every channel.
- It receives voices, banks and parameter changes only with SYS INFO AVAIL and MEMORY PROTECT INTERNAL off (pp.22, 32). A bank replaces all 32 internal voices.
- It has no dump request: selecting a voice sends it, and FUNCTION 8 → MIDI TRANSMIT? YES sends the bank.
- The manual is a scan with a text layer only on pp.30–32 (the MIDI data format). Read the other pages as images.

## Constraints (from vz10m, unchanged)

- TypeScript, strict, `noUncheckedIndexedAccess`, `erasableSyntaxOnly`, explicit `.ts` imports; tests with `node --test`.
- Bytes are the source of truth: edits go through `set()` and touch only that field; never rebuild a voice from params.
- Don't guess the format: every byte layout cites a source; conflicting facts are flagged `unverified`.
- Nothing in the engine package writes voices or builds SysEx; writing lives in `apps/editor/lib/dx7/`.
- SSR-safe modules; MIDI access only on a click, with `sysex: true`.
- windchime's 1-bit UI language; changelog line for every shipped editor change; package releases get a `CHANGELOG.md` entry.
- Features go through OpenSpec changes and are archived when done.
