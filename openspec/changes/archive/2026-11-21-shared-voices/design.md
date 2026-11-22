# Design

The copy follows vz10m's SHARED exactly (Relay pagination fragment, `@connection` with the creatorKey/search filters, prepending a save unless the list already has it or is a search, `@deleteEdge`, the error wording by API code, the device-key panel), with the DX7's names: 10 characters and printable ASCII (no forced uppercase, matching the editor's NAME field), `Dx7Voice`, `dmbkSoundDx7Voices`.

The schema file was pulled from a local run of dmbk-graphql-api's `dx7-voices` branch, since production doesn't have the DX7 types until that PR deploys. `pnpm schema:pull` against production after the deploy gives the same file.

SHARED only works in production once the API PR is deployed. Before that, the list shows COULD NOT LOAD and saves fail, and nothing else in the editor depends on it.
