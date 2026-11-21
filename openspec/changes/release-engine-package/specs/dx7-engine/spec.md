# Spec Delta

## ADDED Requirements

### Requirement: Released on GitHub Packages
The engine SHALL be published as `@dblodorn/yamaha-dx7-engine` on GitHub Packages, starting at 0.1.0, by the tag workflow only. The published tarball SHALL include `LICENSE` and `NOTICE`, and its license field SHALL name both MIT and Apache-2.0.

#### Scenario: Install from the registry
- **WHEN** a project outside the workspace with a `read:packages` token runs `pnpm add @dblodorn/yamaha-dx7-engine@0.1.0` and renders INIT VOICE offline
- **THEN** it gets sound, and `node_modules/@dblodorn/yamaha-dx7-engine/NOTICE` exists
