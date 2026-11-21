# Tasks

- [x] 1.1 Version 0.1.0; dated `CHANGELOG.md` section; README install section and status. Verify: `pnpm -F @dblodorn/yamaha-dx7-engine build && pnpm -F @dblodorn/yamaha-dx7-engine smoke`, and `node scripts/check-tag.ts yamaha-dx7-engine@0.1.0` passes.
- [x] 1.2 `AGENTS.md` / `CLAUDE.md`: released, and how to release the next version.
- [x] 2.1 After merge: push the tag `yamaha-dx7-engine@0.1.0` on `main`. Verify: the workflow succeeds.
- [x] 2.2 Install from the registry in a scratch project (token from `~/.zshenv`, never printed) and render INIT VOICE. Verify: peak about 0.125.
