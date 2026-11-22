# Proposal

## Why

DX7 voices need a public list like vz10m's: for sharing between people and machines, and as the library windchime's PATCH picker lists. dmbk-graphql-api's `dx7-voices` change (its PR #46) adds the API side.

## What Changes

- **LIBRARY → SHARED**, from vz10m's `components/Shared.tsx`:
  - the public list (newest first, ALL / YOURS, search);
  - SHARE CURRENT;
  - OPEN;
  - SAVE TO LOCAL, in place of vz10m's ADD TO BANK, since DX7 banks are made in LOCAL;
  - RENAME, UPDATE and DELETE for your own;
  - DEVICE KEY.

  The queries are `dmbkSoundDx7Voices` and the `Dx7Voice` mutations, through the existing `/api/graphql` route.
- **`lib/device.ts`**, copied from vz10m: the device key, stored as `dx7.deviceKey`.
- **`lib/dx7/names.ts`:** the API's obscene-name check with its whitelist, run before a request.
- **Setup:**
  - a `dx7` API client key in Vercel (`DMBK_GRAPHQL_API_KEY`, production and preview, sensitive);
  - the schema pulled (`schemas/dmbk-graphql-api.graphql`) with the DX7 types.

- **LIBRARY → BANKS** (decided after SHARED: banks shared on the API, like ROM cards):
  - public 32-slot banks (`dmbkSoundDx7Banks`; dmbk-graphql-api PR #47), Yamaha's factory ROM1A–ROM4B among them;
  - open a bank: its slots, OPEN a voice, SEND BANK (one VMEM, empty slots as INIT VOICE), .SYX, COPY TO LOCAL;
  - SHARE CHECKED AS BANK: shares LOCAL's checked voices and saves them as a bank, yours to rename or delete.
- **Factory voices:** Yamaha's ROM1A–ROM4B are in the API, as voices (in SHARED, searchable; also in windchime's PATCH picker) and as 8 banks.
- `lib/relay/environment.ts` gives one Relay store to SHARED and BANKS; `lib/relay/problem.ts` holds their shared error wording.

## Non-goals

- Device-only banks (vz10m's SQLite BANKS): banks are shared, by choice.
- Editing a bank's slots one by one: a bank is made from LOCAL's checked voices, then renamed or deleted.

## Capabilities

### Modified Capabilities
- `library`: adds the SHARED and BANKS tabs.
