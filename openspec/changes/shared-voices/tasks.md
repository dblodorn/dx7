# Tasks

- [x] 1.1 `components/Shared.tsx`, `lib/device.ts`, `lib/dx7/names.ts`, the SHARED tab, help and changelog. Verify: typecheck, Relay compiles 7 operations, build.
- [x] 1.2 Playwright against `next start` with `/api/graphql` stubbed by operation name. Verify: the list shows; SHARE CURRENT posts 208 base64 characters with a 43-character key and the voice appears marked YOURS; an obscene name is refused before any request; SAVE TO LOCAL adds to LOCAL; OPEN loads the voice; no errors.
- [x] 1.3 `dx7` API client key in Vercel (`DMBK_GRAPHQL_API_KEY`, production and preview, sensitive), never printed.
- [ ] 1.4 After dmbk-graphql-api #46 deploys: `pnpm schema:pull` against production (no diff expected), then on https://dx7.dmbk.io share a test voice, see it listed as YOURS, delete it.
