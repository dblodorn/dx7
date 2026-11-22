# Tasks

- [x] 1.1 `components/Shared.tsx`, `lib/device.ts`, `lib/dx7/names.ts`, the SHARED tab, help and changelog. Verify: typecheck, Relay compiles 7 operations, build.
- [x] 1.2 Playwright against `next start` with `/api/graphql` stubbed by operation name. Verify: the list shows; SHARE CURRENT posts 208 base64 characters with a 43-character key and the voice appears marked YOURS; an obscene name is refused before any request; SAVE TO LOCAL adds to LOCAL; OPEN loads the voice; no errors.
- [x] 1.3 `dx7` API client key in Vercel (`DMBK_GRAPHQL_API_KEY`, production and preview, sensitive), never printed.
- [x] 2.1 `components/Banks.tsx`, the BANKS tab, the shared Relay store and error wording, help and changelog. Verify: Relay compiles 15 operations; typecheck; build.
- [x] 2.2 Playwright with the API stubbed and MIDI faked. Verify: ROM1A opens to 32 slots; SEND BANK sends 4104 bytes; .SYX downloads ROM1A.syx; COPY TO LOCAL adds 32; SHARE CHECKED AS BANK saves two voices then a 32-slot bank with them, shown as YOURS; a slot opens its voice; no errors.
- [ ] 1.4 After dmbk-graphql-api #46 and #47 deploy: `pnpm schema:pull` against production (no diff expected), then on https://dx7.dmbk.io share a test voice, see it listed as YOURS, delete it; open the ROM1A bank and play a voice from it. Done 2026-11-21: the schema matches production; a test voice was shared, listed as YOURS and deleted; ROM1A opened in BANKS, downloaded as a 4104-byte bank, and BRASS 1 played from it.
