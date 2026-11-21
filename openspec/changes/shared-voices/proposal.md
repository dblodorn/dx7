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

## Non-goals

- A BANKS tab (vz10m's SQLite banks): DX7 banks are LOCAL's checked voices.
- Factory ROM voices in SHARED: decided separately.

## Capabilities

### Modified Capabilities
- `library`: adds the SHARED tab.
