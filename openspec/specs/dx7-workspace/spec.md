# dx7-workspace Specification

## Purpose
Defines the DX7 repo's layout, commands, CI and deploy, so every later change has an app, a package, tests and a release path to land in.

## Requirements

### Requirement: Workspace layout
The repo SHALL be a pnpm workspace with the editor at `apps/editor` (package `dx7-editor`) and the engine at `packages/yamaha-dx7-engine` (package `@dblodorn/yamaha-dx7-engine`). The editor SHALL depend on the engine as a workspace package and import its source, so every engine change is heard in the editor before it is published.

#### Scenario: Editor uses the workspace engine
- **WHEN** a file in `packages/yamaha-dx7-engine/src` changes and `pnpm dev` is running
- **THEN** the editor picks up the change without publishing or reinstalling

### Requirement: Root commands
From the root, `pnpm dev`, `pnpm build`, `pnpm test`, `pnpm typecheck` and `pnpm relay` SHALL run across the workspace as they do in vz10m. `pnpm test` SHALL run every package's `test/*.test.ts` with `node --test`, without a build step other than the worklet bundle.

#### Scenario: Clean clone
- **WHEN** the repo is cloned and `pnpm install && pnpm typecheck && pnpm test && pnpm build` is run
- **THEN** every step passes with no token or environment variable set

### Requirement: Silent engine skeleton
Until the emulator lands, the engine package SHALL offer the common surface of `engine-packages` (`createSynth`, `createOfflineSynth`, `loadVoice`, notes, `dispose`) with an engine that renders silence, accepts 155-byte voices, and rejects any other length on the main thread.

#### Scenario: Wrong length
- **WHEN** a host calls `loadVoice` with 128 bytes
- **THEN** the call throws and nothing is posted to the worklet

### Requirement: Publishing workflow
A tag `yamaha-dx7-engine@<version>` SHALL publish the package to GitHub Packages only when the tag matches `package.json` and typecheck, test, build and smoke all pass.

#### Scenario: Mismatched tag
- **WHEN** `yamaha-dx7-engine@0.2.0` is pushed while `package.json` says `0.1.0`
- **THEN** the workflow fails before publishing

### Requirement: Deploy
Every push to `main` SHALL deploy the editor to production at `https://dx7.dmbk.io` from `apps/editor`, without a GitHub Packages token.

#### Scenario: Push to main
- **WHEN** a commit lands on `main`
- **THEN** Vercel builds `apps/editor` and `dx7.dmbk.io` serves it
