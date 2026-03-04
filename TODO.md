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
- [ ] Task 3: Harden sitemap/robots discoverability.
  Scope: add `/sitemap.xml` route, allow `HEAD` for sitemap endpoint, update robots sitemap target.
- [ ] Task 4: Fix navigation semantics/UX issues.
  Scope: avoid nested interactive controls, keep accessibility and keyboard behavior clean.
- [ ] Task 5: Reduce `/cloud` landing payload and improve mobile performance.
  Scope: trim initial SSR payload and lazy-fetch heavy data section(s) without breaking UX.
- [ ] Task 6: Verification + release pass.
  Scope: run a11y tests/smoke checks, update notes, and prepare final ship summary.

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
- Status: Pending
- Finish statement: Pending
- Notes: Pending

### Task 4
- Status: Pending
- Finish statement: Pending
- Notes: Pending

### Task 5
- Status: Pending
- Finish statement: Pending
- Notes: Pending

### Task 6
- Status: Pending
- Finish statement: Pending
- Notes: Pending
