# Proposal

## Why

The emulator plays in the editor (checked on production). Windchime can only use it once `@dblodorn/yamaha-dx7-engine` is published, as `@dblodorn/casio-vz-engine@0.1.0` was for the VZ.

## What Changes

- `packages/yamaha-dx7-engine`:
  - version 0.1.0;
  - `CHANGELOG.md` gets a dated 0.1.0 section;
  - the README gains install instructions (GitHub Packages needs a `read:packages` token, as for the VZ package) and drops "not released yet".
- After merge, push the tag `yamaha-dx7-engine@0.1.0`. The workflow checks the tag, runs typecheck, test, build and smoke, then publishes.
- `AGENTS.md`: the release is recorded, with how to cut the next one.

## Non-goals

- Windchime adopting the engine: its own change in the windchime repo (`add-dx7-synth`).
- Reference calibration (issue #6). A calibration change after this is released as at least 0.2.0.

## Capabilities

### Modified Capabilities
- `dx7-engine`: adds the release requirement.
