# `public/design/`

`data.json` is a real 14-day extract, written by `scripts/design/extract-mock-data.mjs`
from `public/api/processed-14days.json`.

It started as the input to the Phase 1 bake-off mocks, so the five directions
were compared against real benchmark numbers rather than flattering
placeholders. The mocks are gone — the direction was chosen and ported — but
the extract stayed, because `utils/designFixtures.ts` now builds the offline
fixtures from it. Those are what let `/status`, `/providers/[provider]` and
`/models/[provider]/[model]` render under `npm run design:dev` without a
database.

So this file is load-bearing for design iteration, not a leftover. Regenerate
it with:

```bash
node scripts/design/extract-mock-data.mjs
```

It is served publicly, which is fine: every number in it is already published
through `/api/processed`.
