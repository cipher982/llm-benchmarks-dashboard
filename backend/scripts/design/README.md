# Design iteration pipeline

Render → capture → look → edit → repeat, without a human in the loop for the
capture step.

## Why it is shaped this way

A vision model downscales any image whose long side exceeds roughly 1568px.
`/cloud` in production is 22,015px tall and `/status` is 26,376px. A single
`fullPage` screenshot of either arrives as an unreadable smear, which is why
reviewing "the site" has in practice meant reviewing the fold.

So every route is captured three ways:

| Output | What it is | Who reads it |
|---|---|---|
| `tiles/NN-<heading>.png` | viewport-sized slices, 60px overlap, native resolution | the model — legible text, full page coverage |
| `overview.png` | half-scale full-page capture | quick composition check on short pages |
| `full.png` | native-resolution full page | archive, spot zooming |

Tiles are named after the nearest heading above them, so `manifest.json` and
`INDEX.md` give a reading order that maps to the page's actual sections rather
than to pixel offsets.

Captures are made deterministic so two runs differ only where the design
changed: the clock is frozen at a fixed instant, animations and transitions are
zeroed, analytics hosts are aborted, fonts and images are awaited, and the
Next.js dev overlay is hidden.

## Commands

```bash
npm run design:dev                                  # dev server on :3111, no Mongo needed

npm run design:shoot -- --label before              # capture local, all routes, all viewports
npm run design:shoot -- --label after --routes cloud --viewports desktop
npm run design:shoot -- --label prod --base https://llm-benchmarks.com
npm run design:refs                                 # Modal / OpenRouter reference boards

npm run design:review -- --label after --against before   # side-by-side HTML
```

Output lands in `.design/shots/<label>/` (gitignored). `review.mjs` writes a
single scrollable HTML page — open it in a browser to scroll the whole site,
or pass `--against` to pin a baseline next to every tile.

## Flags

`--label` output directory · `--base` origin (default `http://localhost:3111`)
· `--routes` comma-separated ids from `routes.json` · `--viewports`
`desktop,mobile` · `--routesFile` alternate config (`refs.json` holds external
reference sites) · `--settle` extra ms to wait for charts · `--scheme`
`light|dark`.

Routes whose `path` is an absolute URL ignore `--base`, which is how the
reference board captures third-party sites through the same code path.

## Known gap

`/providers/[provider]` and `/models/[provider]/[model]` return 500 locally —
they query MongoDB directly with no static or fixture fallback. Until that is
fixed they can only be captured against production, so design changes to those
templates cannot be iterated locally. See the redesign epic, Phase 0.
