# Proposal

## Why

The DX7 gets the same treatment as the VZ-10M: a browser editor and librarian, and an emulator published as an engine package that windchime (and later apps) can play. vz10m already worked out the workspace shape, the editor shell, the API route, the audio and MIDI plumbing and the publishing workflow. Copying that shell first, with no DX7 code in it, gives every later change (codec, emulator, sharing) a working app, test runner, CI and deploy to land in.

## What Changes

- New public repo `dblodorn/dx7`, a pnpm workspace like vz10m: `apps/editor` (package `dx7-editor`), `packages/yamaha-dx7-engine` (package `@dblodorn/yamaha-dx7-engine`), `openspec/`, `.github/workflows/` and the agent docs at the root.
- The editor shell, copied from vz10m with the VZ parts removed: the 1-bit theme, Knif Mono, the restyled shadcn components, `components/params.tsx`, the changelog page, the help popovers, `lib/audio.ts` (audio started in a click, output device, the iOS silent-switch unlock), `lib/midi.ts`, `lib/play.ts` / `lib/router.ts`, the KEYS floater, `app/api/graphql/route.ts` and the Relay environment.
- The engine package skeleton: `createSynth` / `createOfflineSynth` with vz10m's input checks and worklet loading, a processor that renders silence, `build-worklet.ts`, `rewrite-dts.ts`, `smoke-pack.ts`, MIT `LICENSE`, `README.md`, `CHANGELOG.md`.
- CI: `.github/workflows/publish-yamaha-dx7-engine.yml`, triggered by tags `yamaha-dx7-engine@<version>`; nothing is tagged in this change.
- Deploy: a Vercel project `dx7` (team `db13`) with root directory `apps/editor`, the `NPM_RC`-free build (the editor uses the workspace package), and `dx7.dmbk.io` as a CNAME on DigitalOcean.

## Non-goals (this change)

- Any DX7 format, editing or sound: those are `dx7-editor-sysex` and the emulator change.
- SHARED and BANKS: the route and Relay environment are copied so the shape is in place, but no queries are written until the API has `dx7-voices`.
- A shared base package with vz10m (decided: copy now, extract later).

## Capabilities

### New Capabilities
- `dx7-workspace`: the repo layout, commands, CI and deploy that every later change relies on.

### Existing Capabilities
- `engine-packages` (copied unchanged from vz10m): this change is its first use outside vz10m.
