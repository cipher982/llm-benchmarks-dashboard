# Epic: llm-benchmarks.com redesign

Status: scoping · Owner: David · Created 2026-08-03

## Why

The site currently wears a Windows NT costume: `#3B6EA5` desktop blue behind
`#ECE9D8` beige panels, 2px outset/inset borders, an `MS Sans Serif` stack, and
a 12px base font size. The costume is not the whole problem. Underneath it the
information design has drifted badly, and that is what actually reads as cheap.

Evidence, captured 2026-08-03 from production (`.design/shots/prod/`):

| Finding | Detail |
|---|---|
| `/cloud` is 22,015px tall | 27 viewport-screens of scroll; 22 of them are stacked per-model time-series charts, one model per chart, no ranking, no grid, no compare |
| `/status` is 26,376px tall | a single ungrouped wall of provider sections and prose |
| Speed Distribution is unreadable | ~120 overlapping KDE curves with overlapping direct labels, plus a broken x-axis that runs 0–140 linearly and then crams 150–650 into the right margin |
| Emoji as typography | every section heading is wrapped in emoji (`☁️ Cloud Benchmarks ☁️`, `📚 Full Results 📚`) |
| No colour system | 19 provider colours picked ad hoc (`bedrock` orange, `openai` black, `fireworks` magenta) doing double duty as chart series and brand identity |
| Everything is 12px | `typography.sizes.base = 0.75rem`, so measured values — the reason the site exists — are the same size as boilerplate prose |

Two smaller things found while wiring up the capture pipeline, worth folding
into the work rather than tracking separately:

- `components/tables/TanStackTable.tsx:293` renders `<th>` inside a `<div>`,
  which throws a React hydration error on every page carrying the table.
- `components/theme/theme.ts` carries ~70 lines of `MuiDataGrid` overrides that
  set white text on the beige surface. `@mui/x-data-grid` is a dependency but
  `DataGrid` is not used by any page — the block is dead, and so is the
  dependency.

## What good looks like

The site is a measuring instrument. Cron jobs sample token throughput from
~40 providers and the site reports what they measured. The redesign should make
the measured numbers the most prominent thing on every page, make the charts
legible enough to draw a conclusion from, and cut the scroll depth by roughly an
order of magnitude on `/cloud` and `/status`.

## Non-goals

- No framework migration. Next.js pages router, MUI, and Recharts stay.
- No change to the canonical/display/slug contract or the five-step pipeline in
  `AGENTS.md`. Slugs and URLs do not move; the SEO surface is intact.
- No new data. Everything proposed renders from what MongoDB already stores.
- No CMS, no design tool round-trip, no component library adoption.

## The design problem, stated honestly

Every agent asked to make a site "look good" in 2026 converges on the same
handful of looks. The ones to stay away from, because they are now the template
rather than a choice:

- warm off-white or bone backgrounds, serif or script display type, oversized
  letter-spaced lowercase headings — the "editorial AI boutique" look
- dark navy or slate with a violet gradient, glassmorphism panels, Inter
- neo-brutalist thick black borders with hard offset shadows and primary colours
- mesh or aurora gradient blobs behind a centred hero with gradient text
- `rounded-2xl` cards on `bg-white/5` with a hairline border and a lucide icon
  in a circle
- Space Grotesk, Geist, Satoshi, Manrope, or Inter as the "technical" typeface

What Modal and OpenRouter actually do, from the reference board
(`.design/shots/refs/`):

**Modal** — true black ground, one saturated accent (spring green) used
sparingly and only for emphasis, a geometric sans set very large in the hero and
very small everywhere else, generous vertical whitespace as the only structure,
hairline borders in near-black grey, tiny letter-spaced all-caps micro-labels
above each block, and pill buttons. Colour appears roughly three times per
screen.

**OpenRouter** — near-monochrome light ground, the ranked list as the primary
visual form, tiny provider logo marks instead of colour coding, deltas in green
and red as the only colour on the page, no card borders at all in the ranking
sections. Whitespace and typographic hierarchy do all the work.

The shared trait is restraint plus density: neutral ground, one accent, data
first, chrome nearly absent. Neither site has decorative elements.

## Proposed direction

One organising idea, derived from the site's own content rather than from a
visual trend: **the page is a readout**.

- **Ground.** Near-black neutral (`#0B0C0E`) with panels one step up
  (`#121316`), hairline `#1F2226` rules. Cool and neutral, not navy, not slate,
  not warm.
- **Numbers are the typography.** Every measured value is set in a monospace
  with tabular figures, at a larger size than the prose around it. The
  grotesk/mono pairing is what makes a page read as an instrument rather than a
  landing page, and it is a typographic decision rather than a decorative one.
- **One accent, plus a strict semantic set.** The accent marks measured values
  and nothing else. Separately, three semantic colours for health state
  (healthy / degraded / dead) on `/status`. Provider identity moves to a
  monochrome mark plus a 2px rule, retiring the 19-colour rainbow. Chart series
  colour is assigned per-view from an ordered categorical ramp, not per-provider
  forever.
- **A tick grid as the structural motif.** Fine measurement ticks in the page
  chrome, section rules that behave like axis ticks, charts whose gridlines are
  continuous with the layout. It is honest to the content and it is not a look
  that falls out of a prompt.
- **The ridgeline as signature.** The Speed Distribution becomes a ridgeline
  plot — one row per model, sorted, small — instead of 120 curves in one frame.
  That silhouette then recurs at small size: a sparkline column in the results
  table, a miniature ridge in the header. The site's memorable visual element is
  a rendering of its own data.

Because the site is read in daylight as a reference, a light "spec sheet"
variant of the same token set is worth building in the same pass rather than
retrofitting later.

**This direction is a proposal, not a decision.** Phase 1 exists to test it
against alternatives with real content before any of it is committed to.

## Phases

### Phase 0 — iteration pipeline (done, one gap open)

Built: `scripts/design/shoot.mjs`, `review.mjs`, `routes.json`, `refs.json`,
`README.md`; npm scripts `design:dev|shoot|refs|review`; `.design/` gitignored.
Captures every route at desktop and mobile as heading-labelled tiles plus a
half-scale overview and a native-resolution full page, with the clock frozen,
motion zeroed, analytics blocked and the dev overlay hidden. `review.mjs` emits
one scrollable HTML page and takes `--against <label>` for before/after.
Baselines captured: `prod`, `refs` (Modal, OpenRouter).

Open gap: `/providers/[provider]` and `/models/[provider]/[model]` return 500
locally because they query MongoDB with no static or fixture fallback. Add a
fixture path so those two templates can be iterated offline — otherwise a
third of the site's page templates can only be reviewed against production.

### Phase 1 — direction bake-off

Build three static mock routes under `/design/<variant>`, each rendering the
**real** `/cloud` content from the existing static JSON, so the comparison is
about design and not about lorem ipsum:

1. the readout direction above (dark)
2. a light high-contrast spec-sheet direction, closer to OpenRouter
3. one deliberate outlier, chosen once directions 1 and 2 are on screen

Capture all three with the pipeline, review side by side, pick one. Typeface
candidates get chosen here and only here; the shortlist deliberately excludes
the six faces named above. Output: a chosen direction and a written rationale.

Delete the mock routes at the end of the phase.

### Phase 2 — token and primitive layer

`components/design-system/index.ts` and `components/theme/theme.ts` are already
the single source of truth for colour, type, spacing and component overrides,
which is what makes this tractable — most of the site follows a token change.

- replace the palette, type scale, spacing scale and radii; raise base font size
- restructure `colors` into ground / surface / rule / text / accent / semantic
  rather than the current Win98 vocabulary
- drop the three-hue chart mapping in favour of an ordered categorical ramp with
  a documented contrast floor, per the `dataviz` skill
- rewrite the primitives in `components/design-system/components.tsx` and
  `components/StyledComponents.tsx`: `DesktopWindow`, `Window`, `TitleBar`,
  `create3DBorder`, `createButtonStyles` all encode bevelled Win98 chrome and
  need replacing rather than retuning
- delete the dead `MuiDataGrid` override block and drop `@mui/x-data-grid`
- add the light/dark token split

### Phase 3 — charts

The largest single win, and mostly independent of Phase 2.

- **Speed Distribution** (`components/charts/cloud/SpeedDistChart.tsx`) →
  ridgeline, sorted, top-N with the rest collapsed, one linear axis with
  outliers handled explicitly rather than by squashing the right margin
- **Time Series** (`components/charts/cloud/TimeSeries.tsx`) → small-multiples
  grid with a shared y-scale and a compare mode, replacing 22 stacked
  full-width charts. This alone should take `/cloud` from ~22,000px to under
  4,000px
- sparkline column in the results table so the table carries trend
- `components/charts/cloud/SpeedCompareChart.tsx` and
  `components/charts/local/SpeedGpuScatterChart.tsx` restyled to match
- honour `processCloud.ts`'s `tokens_per_second_timestamps` alignment — the
  parallel-array contract in `AGENTS.md` must survive the rework

### Phase 4 — pages

In dependency order: `/cloud` (`pages/cloud.tsx`, 764 lines, carries
`CloudDecisionHero` and `QuickAnswerModule`) → `/status` (needs grouping and
collapse before styling; 26,000px of prose is a structure problem) →
`/local` → `/providers/[provider]` and `/models/[provider]/[model]` (blocked on
the Phase 0 fixture gap) → the three `/guides/*` pages → `NavBar`,
`SiteFooter`. Emoji come out of headings throughout.

### Phase 5 — verification

- `npm run test:pure` and `test:integration` green; the canonical-contract and
  pipeline tests are the guard that the redesign did not disturb the data path
- `npm run test:a11y` (axe) plus `tests/contrast-checker.js` against the new
  palette, dark and light
- mobile pass at 390px across every route
- capture `after` and diff against `prod` in `review.mjs`
- production build screenshot pass, since dev-only overlays and unminified CSS
  can mask layout issues

## Risks

- **`/status` is a structure problem wearing a styling problem.** Restyling
  26,000px of ungrouped prose yields a prettier 26,000px. Phase 4 must be
  allowed to cut and group content, not just skin it.
- **Retiring per-provider colours** loses continuity for anyone reading the
  charts habitually. Worth doing anyway; worth stating.
- **Two of five page templates cannot be iterated locally** until the Phase 0
  gap closes. Everything touching those templates should wait for it.
- **Recharts limits.** Ridgeline and small-multiples may need d3 directly —
  `d3` is already a dependency, so this is a local decision inside Phase 3, not
  a new one.

## Decisions taken (2026-08-03)

1. **Dark-first.** Ship the near-black neutral ground. Tokens are structured as
   semantic pairs so a light variant is possible later, but it is not built in
   this epic.
2. **Free, self-hostable typefaces only.** The shortlist deliberately excludes
   Inter, Geist, Satoshi, Manrope, Space Grotesk and Roboto, all of which now
   read as the default output of a generated site.
3. **Restructure freely.** `/status` may group, collapse and drop content.
   `/cloud`'s 22 stacked per-model charts become a small-multiples grid with
   drill-down. Target: `/cloud` under ~4,000px, `/status` under ~4,500px.

## Direction chosen: Console (2026-08-03)

Variant D. With a hard constraint attached, which governs every later phase:

**The site is raw dense data. It sells nothing.** No hero, no funnel, no
value proposition, no "here's why this matters" copy. Screen space spent on
prose that a reader already understood from the page title is waste. The first
viewport must be measurement, not introduction.

Concretely, what this rules out:

- opening headline + deck constructions ("Token throughput, measured every two
  hours" over three lines of explanation) — roughly 30% of the first viewport
  for content carrying no data
- benefit framing on any figure ("Best for long generations and bulk completion
  work", "Best where responsiveness is what users feel")
- restating the same number in two places because one of them is a "hero" —
  the first Console draft printed peak throughput, best TTFT and tightest spread
  in the meter strip and then again in a leaders panel directly below
- section descriptions that paraphrase the section heading

What replaces it: more measured values per screen. Where a panel currently
repeats a number, it gets a different cut of the data instead — provider-level
aggregates, percentiles, sample counts, coverage.

Prose survives only where it states something the numbers cannot: the sampling
method, the collection interval, and what a derived column actually means.

## Phase 1 progress

Three variants built as standalone pages under `public/design/`, all rendering
the real 14-day extract (`scripts/design/extract-mock-data.mjs`) so the
comparison is about design rather than about flattering placeholder numbers.
Shared chart geometry lives in `public/design/charts.js` and carries no colours
of its own — every stroke resolves through `currentColor` or a custom property,
so each variant restyles identical geometry from its own sheet.

| | Hypothesis | Type | Length | Signature |
|---|---|---|---|---|
| **A — Readout** | panels and charts as hero; Modal-adjacent restraint | Archivo + Spline Sans Mono | 3,957px | tick-rule motif, ridgeline with a label rail, accent bar under the mean column |
| **B — Ledger** | table as hero, chrome removed entirely; OpenRouter-adjacent density | Familjen Grotesk + Fragment Mono | 3,233px | no panels or borders anywhere, two-column ranked list, min·mean·max strip inside each row |
| **C — Trace** | one signature visual plus editorial scale contrast | Archivo (variable width) + Martian Mono | 3,617px | full-bleed ridgeline as the opening image on a sequential warm ramp, 76px numerals |

All three land between 3,200px and 4,000px against production's 22,015px, which
is the restructure decision showing up rather than anything about the styling.

Console was chosen, then rebuilt against the raw-data constraint above:

| Removed | Replaced with |
|---|---|
| leaders panel reprinting peak throughput, best TTFT and tightest spread — all three already in the meter strip | per-provider aggregates: models, median, p90, best, median spread, median TTFT |
| ~230px of dead column below the provider table | throughput × spread scatter, all 113 models, coloured by state |
| 6-cell meter strip | 8 cells: models, providers, samples, median, p90, max, median spread, median TTFT |
| footer tagline | column definitions — what spread, TTFT and n actually mean |

The full page is now 2,114px at 1440×900, against production's 22,015px. The
first viewport carries eight global aggregates, a 22-model distribution, nine
provider aggregate rows, a 113-model scatter and the first six result rows. No
sentence appears above the fold.

Still to do in this phase: port the direction onto the real components, then
delete the mocks and the `public/design/` extract.
