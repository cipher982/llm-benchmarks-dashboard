# SEO + UX/UI Iteration TODO

Last updated: 2026-03-04
Repository: `llm-benchmarks-dashboard`

## Execution Rules
- Work one task at a time.
- Commit each atomic task before starting the next.
- After each task, mark it done and append completion notes in the audit log section.

## Tasks
- [x] Task 1: Fix critical accessibility/data integrity issues on landing pages.
  Scope: empty anchor text fallbacks, heading hierarchy order, main landmark semantics.
- [x] Task 2: Add complete SEO head metadata to `/cloud`, `/local`, `/status`.
  Scope: canonical, robots, OG, Twitter, consistent title/description handling.
- [x] Task 3: Harden sitemap/robots discoverability.
  Scope: add `/sitemap.xml` route, allow `HEAD` for sitemap endpoint, update robots sitemap target.
- [x] Task 4: Fix navigation semantics/UX issues.
  Scope: avoid nested interactive controls, keep accessibility and keyboard behavior clean.
- [x] Task 5: Reduce `/cloud` landing payload and improve mobile performance.
  Scope: trim initial SSR payload and lazy-fetch heavy data section(s) without breaking UX.
- [x] Task 6: Verification + release pass.
  Scope: run a11y tests/smoke checks, update notes, and prepare final ship summary.
- [x] Task 7: Add core Umami outcome tracking events.
  Scope: `cloud_page_view`, `provider_click`, `model_click`, `status_click`, `github_click`, `drose_click`.
- [x] Task 8: Add conversion-first hero block on `/cloud`.
  Scope: quick paths for lowest latency, highest throughput, and most stable (7D) with CTA actions.
- [x] Task 9: Verify growth iteration and finalize audit notes.
  Scope: lint/build/smoke checks and completion summary.
- [x] Task 10: Expand cloud funnel instrumentation for actionable conversion analysis.
  Scope: track recommendation readiness and table interaction events needed for weekly KPI attribution.
- [x] Task 11: Add automated weekly Umami KPI digest job in `sauron-jobs`.
  Scope: query live Umami Postgres metrics and email a weekly conversion digest for llm-benchmarks.
- [x] Task 12: Verify automation SQL + finalize growth audit log updates.
  Scope: run live SQL checks, lint/build where applicable, and close this iteration with notes.

---

## Completion Audit Log

### Task 1
- Status: Completed
- Finish statement: Completed landing-page semantic/a11y integrity fixes and removed known empty-link outputs in table modules.
- Notes: Updated model link labels to fallback safely when `model_name` is missing, changed section heading components to use `h2` instead of `h4`, converted `MainContainer` to `main` and removed nested app-level `MainContainer`, and added `aria-label` on local-page loading spinner. Build completed successfully (`npm --prefix backend run build`) with existing external Mongo timeout warnings during static path generation but no compile/type errors.

### Task 2
- Status: Completed
- Finish statement: Completed shared SEO metadata rollout for all top-level landing routes (`/cloud`, `/local`, `/status`).
- Notes: Added `buildStaticPageSeoMetadata` helper in `seoUtils.ts` and wired full head tags (canonical, robots, OG, Twitter, JSON-LD, keywords) into all page states (loading/error/success where applicable) for Cloud, Local, and Status pages. Lint passes with one pre-existing warning in `pages/admin.tsx`.

### Task 3
- Status: Completed
- Finish statement: Completed sitemap endpoint hardening and crawler discoverability improvements.
- Notes: Exported sitemap generator for reuse, added `HEAD` support with proper `Allow` header on `/api/sitemap`, created public `/sitemap.xml` route via SSR page, and updated `robots.txt` to the canonical sitemap URL. Lint passes with unchanged pre-existing warning in `pages/admin.tsx`.

### Task 4
- Status: Completed
- Finish statement: Completed navigation semantic cleanup for the status CTA without changing visual behavior.
- Notes: Replaced the nested `<a><button /></a>` pattern with a single styled anchor CTA under `Link` in `NavBar.tsx`, preventing invalid nested interactive controls while preserving keyboard and screen-reader semantics. Lint passes with the same pre-existing admin warning.

### Task 5
- Status: Completed
- Finish statement: Completed first-pass `/cloud` payload reduction by moving heavy time-series data off initial SSR props.
- Notes: Removed `initialTimeSeriesData` from `getServerSideProps`, fetches time-series client-side on mount, added dedicated time-series error state to prevent full-page failure, and kept chart section visible with loading/error/empty states. Local Next telemetry showed `/cloud` page data warning drop from ~397kB to ~307kB after change (~90kB reduction).

### Task 6
- Status: Completed
- Finish statement: Completed final verification pass, shipped remaining metadata polish, and prepared this TODO as an audit-ready work log.
- Notes: Added real manifest metadata (`name`, `short_name`, `description`, `start_url`, theme/background colors). Verification run: `npm --prefix backend run lint` (passes with one pre-existing warning in `pages/admin.tsx`), `npm --prefix backend run build` (passes; provider/model static-path generation logs Mongo timeout warnings in this environment but build completes), and local smoke checks confirmed `/cloud` now renders canonical/robots/JSON-LD with valid heading order, no empty links, and one `<main>` landmark. Production probe still showed old `/sitemap.xml` behavior at check time, indicating deployment propagation lag outside this local git ship step.

### Task 7
- Status: Completed
- Finish statement: Completed core Umami outcome event instrumentation across cloud landing and global navigation interactions.
- Notes: Added shared tracker helper (`utils/analytics.ts`) and wired events: `cloud_page_view` on `/cloud` mount, `provider_click` and `model_click` in cloud tables/quick-answer links, and `status_click`/`github_click`/`drose_click` in navbar actions. Verification: lint/build pass with unchanged pre-existing admin hook warning and expected intermittent Mongo timeout logs during static path generation.

### Task 8
- Status: Completed
- Finish statement: Completed conversion-first quick-path hero on `/cloud` and connected it to actionable navigation and table workflow.
- Notes: Added `CloudDecisionHero` component with three recommendation cards (lowest TTFT, highest throughput, most stable 7D), linked cards to provider/model landing pages with Umami tracking, and wired CTA behavior to force full table into 7-day mode then scroll directly to the full results section. Added dedicated quick-path fetch/state in `cloud.tsx` using `include=table&days=7&hideFlagged=true` and resilience states (loading/error/empty) without impacting primary page render. Verification: lint/build pass with unchanged pre-existing admin hook warning and known Mongo timeout logs during static-path generation; local smoke check confirmed hero title and `full-results-section` anchor are present in rendered `/cloud` HTML.

### Task 9
- Status: Completed
- Finish statement: Completed final growth-iteration verification pass and closed this TODO as an auditable task log.
- Notes: Verification run after Task 8 ship: `npm --prefix backend run lint` passes with unchanged pre-existing warning in `pages/admin.tsx`; `npm --prefix backend run build` passes with known intermittent Mongo timeout logs during provider/model static path generation in local env but successful Next build output; local `/cloud` smoke probes confirmed quick-path hero markers (`Pick A Path In 10 Seconds`), loading state (`Loading 7-day recommendations`), and full results anchor (`full-results-section`) in rendered HTML. No additional regressions identified in the modified files.

### Task 10
- Status: Completed
- Finish statement: Completed second-pass cloud funnel event coverage for conversion attribution.
- Notes: Added `quick_paths_loaded` (fires once when quick-path recommendations are available), `table_days_change` (time-range control interaction), and `table_status_filter_change` (lifecycle filter interaction) in `backend/pages/cloud.tsx`. Shipped in `llm-benchmarks-dashboard` commit `2a08f31`. Verification: `npm --prefix backend run lint` and `npm --prefix backend run build` pass with unchanged pre-existing admin hook warning and known intermittent Mongo timeout logs in static path generation.

### Task 11
- Status: Completed
- Finish statement: Completed weekly automated KPI digest implementation using `sauron-jobs` conventions.
- Notes: Added new job module at `~/git/sauron-jobs/jobs/llm_benchmarks/umami_weekly_digest.py` and registered `llm-bench-umami-weekly` in `~/git/sauron-jobs/manifest.py` (Monday cron). Job uses SSH+psql live Umami queries for funnel counts, source breakdowns, quick-path usage, top model clicks, and top paths, then sends a digest email via `send_digest_email`. Shipped in `sauron-jobs` commit `c1baeda`.

### Task 12
- Status: Completed
- Finish statement: Completed live-query verification of automation SQL and finalized this extended audit log.
- Notes: Live Umami schema and query checks were run directly against `clifford` (`website_event` + `event_data` tables) including all new digest SQL clauses; command results validated expected columns and successful query execution. Additional verification: `uv run python -m py_compile` on `sauron-jobs` changed files passed, and dashboard lint/build checks remained green with unchanged known warnings.
