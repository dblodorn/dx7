# Tasks

## 1. Repo

- [ ] 1.1 Create the GitHub repo `dblodorn/dx7` (public, like vz10m) and push `main` with the planning docs. Verify: `gh repo view dblodorn/dx7`.
- [ ] 1.2 pnpm workspace: root `package.json` (scripts fanning out like vz10m's), `pnpm-workspace.yaml`, `tsconfig.base.json`, `.gitignore`. Verify: `pnpm install` on a clean clone.

## 2. Engine package skeleton

- [ ] 2.1 `packages/yamaha-dx7-engine`: `package.json` (0.0.0, exports and publishConfig as vz10m), `tsconfig.json`, `tsconfig.build.json`, MIT `LICENSE`, `README.md`, `CHANGELOG.md`.
- [ ] 2.2 `src/notes.ts`, `src/synth.ts`, `src/offline.ts`, `src/worklet/{messages,processor}.ts` (silent engine, 16 voices), `src/sources/patch-source.ts`; `src/index.ts` exports the common surface. Verify: `pnpm typecheck`.
- [ ] 2.3 `scripts/build-worklet.ts`, `rewrite-dts.ts`, `smoke-pack.ts`; tests for note bookkeeping, input checks and the worklet build. Verify: `pnpm test` and `pnpm -F @dblodorn/yamaha-dx7-engine smoke` pass.

## 3. Editor shell

- [ ] 3.1 `apps/editor` from vz10m (see `design.md` table): theme, font, `components/ui/*`, `params.tsx`, changelog page, help, `lib/audio.ts`, `lib/midi.ts`, `lib/play.ts`, `lib/router.ts`, KEYS floater, route + Relay environment, `lib/store.ts` (`dx7.*`). Verify: `pnpm build` passes.
- [ ] 3.2 `components/Editor.tsx` shell and `Library.tsx` with LOCAL (empty) and RESOURCES. Verify: Playwright at 390 px and 1280 px: no console errors or hydration warnings, no horizontal scroll; SOUND starts audio and KEYS sends notes to the silent engine (worklet instance counted).

## 4. CI and deploy

- [ ] 4.1 `.github/workflows/publish-yamaha-dx7-engine.yml` from vz10m's (tag prefix `yamaha-dx7-engine@`, version check, typecheck, test, build, smoke). Verify: the workflow parses (`gh workflow list` after push); no tag pushed.
- [ ] 4.2 Vercel project `dx7` (team `db13`), root `apps/editor`; DNS `dx7` CNAME on DigitalOcean; `homepage` in the repo. Verify: `https://dx7.dmbk.io` serves the shell.
- [ ] 4.3 `AGENTS.md` / `CLAUDE.md`: commands, layout and constraints as built. Verify: they match the tree.
