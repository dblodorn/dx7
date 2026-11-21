# DX7 editor and engine

A browser editor and librarian for the Yamaha DX7 (Mk I voices) over Web MIDI SysEx, and its emulator published as a package (`@dblodorn/yamaha-dx7-engine`) that other apps (windchime first) use as a sound source. Sibling of `~/Desktop/sound/vz10m`, which it copies: same workspace shape, same stack, same UI rules, same engine-package convention (`openspec/specs/engine-packages`, copied from vz10m). When this file doesn't say how something is done, do it the way vz10m's `AGENTS.md` says.

**Status: planning.** Nothing is built yet. The work is in `openspec/changes/`:

1. `scaffold-dx7-workspace`: the pnpm workspace, the editor shell copied from vz10m, the empty engine package, CI and the Vercel project.
2. `dx7-editor-sysex`: the VCED/VMEM codec, MIDI in/out, the voice editor and the local library.

Later changes, in order: the emulator (`dx7-emulator`), sharing and banks (`shared-voices-and-banks`, with a `dx7-voices` change in dmbk-graphql-api), publishing the engine package, and windchime's `add-dx7-synth`.

## Decisions already made

- **One repo, `dblodorn/dx7`**: the editor at `apps/editor` (package `dx7-editor`), the engine at `packages/yamaha-dx7-engine`. Live at `dx7.dmbk.io` once deployed.
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
