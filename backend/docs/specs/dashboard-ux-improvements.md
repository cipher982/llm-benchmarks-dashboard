# Dashboard UX Improvements Spec

**Status:** In Progress
**Created:** 2025-12-30
**Protocol:** SDP-1

## Executive Summary

Fix critical bugs and improve first-impression UX for the LLM Benchmarks Dashboard. The core insight: the data product is valuable, but the UX "leads with problems" instead of "leading with answers."

**Goals:**
1. Fix trust-destroying bugs (TTFT units, label inconsistencies)
2. Replace empty landing page with value proposition
3. Reframe `/cloud` page to answer "what should I use?" in 10 seconds

---

## Decision Log

### Decision: TTFT Conversion Location
**Context:** TTFT is stored in seconds in MongoDB, displayed with "(ms)" labels
**Choice:** Convert at display layer (dashboard), not API layer
**Rationale:**
- Avoids breaking existing data in MongoDB
- Avoids breaking any external consumers of the API
- Simpler rollback if issues arise
- Can add `_unit` suffix to API response later if needed
**Revisit if:** External API consumers request consistent units

### Decision: Landing Page Approach
**Context:** Current `/` is client-side redirect, need to add value
**Choice:** Server-side redirect + simple value-prop landing page
**Rationale:**
- Server redirect is faster and SEO-friendly
- Landing page provides context for new users
- Keep it minimal - don't over-engineer
**Revisit if:** User analytics show landing page adds no value

### Decision: Quick-Answer Module Data Source
**Context:** Need to show "fastest models right now" on /cloud
**Choice:** Filter existing table data client-side, not new API endpoint
**Rationale:**
- Data already available from SSR
- Avoids API complexity
- Can be computed from `tableData` with simple sort/filter
**Revisit if:** Performance issues with large datasets

---

## Architecture

### Files Modified

| Phase | File | Change |
|-------|------|--------|
| 1 | `components/tables/cloud/RawCloudTable.tsx` | Convert TTFT seconds→ms |
| 1 | `pages/models/[provider]/[model].tsx` | Convert TTFT seconds→ms |
| 1 | `pages/providers/[provider].tsx` | Convert TTFT seconds→ms |
| 1 | `utils/seoUtils.ts` | Update insight thresholds (s→ms) |
| 2 | `pages/providers/[provider].tsx` | Fix "Median" → "Avg" label |
| 3 | `pages/index.js` → `pages/index.tsx` | Server redirect + landing |
| 4 | `pages/cloud.tsx` | Move lifecycle, add quick-answer |
| 4 | `components/QuickAnswerModule.tsx` | New component |
| 5 | `utils/dataProcessing.ts` | Remove 140 cap or handle gracefully |
| 5 | `components/charts/cloud/SpeedDistChart.tsx` | Dynamic x-domain |

### New Files

| File | Purpose |
|------|---------|
| `components/QuickAnswerModule.tsx` | "Fastest Models Right Now" module |
| `pages/index.tsx` | Landing page (replaces index.js) |

---

## Phase 1: Fix TTFT Unit Mismatch

**Goal:** TTFT values display correctly as milliseconds throughout the dashboard.

### Acceptance Criteria
- [ ] Table "First Token" column shows values in ms (multiply raw by 1000)
- [ ] Model pages show "Avg Time to First Token" in ms
- [ ] Provider pages show "Avg Time to First Token" in ms
- [ ] Insight thresholds in `seoUtils.ts` updated for ms scale
- [ ] Values are believable (e.g., ~500-2000ms, not 0.5-2.0)
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] Pipeline tests pass (`npm run test:pipeline`)

### Test Commands
```bash
cd /Users/davidrose/git/llmbench/llm-benchmarks-dashboard/backend
npx tsc --noEmit
npm run test:pipeline
# Manual: Check http://localhost:3000/cloud table TTFT values
# Manual: Check a model page TTFT value
```

### Validation Script (Pre-Implementation)
```bash
# Verify current TTFT values are in seconds (small numbers like 0.5-3.0)
curl -s "https://llm-benchmarks.com/api/processed?days=3" | jq '.table[:3] | .[].time_to_first_token_mean'
```

### Implementation Status
- [ ] Not started

---

## Phase 2: Fix Mean/Median Label Inconsistency

**Goal:** Labels accurately describe the statistics being displayed.

### Acceptance Criteria
- [ ] Provider pages: Label matches actual calculation (likely "Avg" not "Median")
- [ ] Consistent terminology across all pages ("Avg" or "Mean", pick one)
- [ ] No TypeScript errors

### Test Commands
```bash
cd /Users/davidrose/git/llmbench/llm-benchmarks-dashboard/backend
npx tsc --noEmit
grep -r "Median" pages/providers/
```

### Implementation Status
- [ ] Not started

---

## Phase 3: Replace Landing Page

**Goal:** New users see value proposition, not blank redirect.

### Acceptance Criteria
- [ ] `/` renders actual content (not `return null`)
- [ ] Page includes: headline, subhead, last-updated indicator, CTA to /cloud
- [ ] Server-side data fetch for "last updated" timestamp
- [ ] Page loads in <500ms (no heavy client-side fetching)
- [ ] Mobile responsive
- [ ] No TypeScript errors

### Test Commands
```bash
cd /Users/davidrose/git/llmbench/llm-benchmarks-dashboard/backend
npx tsc --noEmit
npm run build  # Verify SSR works
# Manual: Visit http://localhost:3000/ - should NOT redirect immediately
```

### Implementation Status
- [ ] Not started

---

## Phase 4: Move Lifecycle + Add Quick-Answer Module

**Goal:** `/cloud` leads with answers, not problems.

### Acceptance Criteria
- [ ] Lifecycle snapshot moved below the table (or into collapsible section)
- [ ] New "Fastest Models Right Now" module appears above-the-fold
- [ ] Quick-answer shows top 5 models by tokens/second (active, updated <24h)
- [ ] Each row links to model page
- [ ] Existing functionality unchanged (table, charts work as before)
- [ ] No TypeScript errors
- [ ] Pipeline tests pass

### Test Commands
```bash
cd /Users/davidrose/git/llmbench/llm-benchmarks-dashboard/backend
npx tsc --noEmit
npm run test:pipeline
# Manual: Visit /cloud, verify quick-answer module appears first
# Manual: Verify lifecycle section is below table or collapsible
```

### Implementation Status
- [ ] Not started

---

## Phase 5: Fix Speed Distribution Chart 140 Cap

**Goal:** Chart accurately represents data without misleading clipping.

### Acceptance Criteria
- [ ] Chart x-domain auto-scales to data range (or caps with clear indicator)
- [ ] KDE curves don't extend beyond visible domain
- [ ] If keeping cap: add visual indicator ("Models >140 tok/s: N")
- [ ] Chart/table numbers agree for edge cases
- [ ] No TypeScript errors

### Test Commands
```bash
cd /Users/davidrose/git/llmbench/llm-benchmarks-dashboard/backend
npx tsc --noEmit
npm run test:pipeline
# Manual: Check if any models >140 tok/s exist and how they display
```

### Validation Script (Pre-Implementation)
```bash
# Check how many models exceed 140 tok/s
curl -s "https://llm-benchmarks.com/api/processed?days=30" | \
  jq '[.table[] | select(.tokens_per_second_mean > 140)] | length'
```

### Implementation Status
- [ ] Not started

---

## Test Matrix

| Test | Phase 1 | Phase 2 | Phase 3 | Phase 4 | Phase 5 |
|------|---------|---------|---------|---------|---------|
| `npx tsc --noEmit` | Required | Required | Required | Required | Required |
| `npm run test:pipeline` | Required | - | - | Required | Required |
| `npm run build` | - | - | Required | - | - |
| Manual UI check | Required | Required | Required | Required | Required |

---

## Rollback Plan

Each phase is independently committable and reversible:
- Git revert individual phase commits
- No database migrations required
- No API changes (display-layer only)

---

## Post-Implementation

- [ ] All phases complete
- [ ] Final Codex review passed
- [ ] Spec status updated to "Implemented"
- [ ] Deploy to production via Coolify
- [ ] Verify production behavior matches expectations
