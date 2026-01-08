# SEO 404 Fix - Master Spec

**Problem**: Google Search Console reports 361 pages with 404 errors.
**Root Cause**: Sitemap exposes all models from DB, but many return 404 (deprecated/thin content).
**Goal**: Only index pages with meaningful content (30+ days of data span).

## Decision Criteria

| Model State | Data Span | Action | Sitemap | Meta |
|-------------|-----------|--------|---------|------|
| Active | 30+ days | Full page | Yes | index,follow |
| Active | < 30 days | Thin page | No | noindex |
| Deprecated | 30+ days | Full page + banner | Yes | index,follow |
| Deprecated | < 30 days | Thin page + banner | No | noindex |
| Stale/Failing | Any | Thin page + notice | No | noindex |

## Phases

### Phase 1: Enhanced Inventory Query
**File**: `utils/modelService.ts`

- [ ] Modify `fetchInventory()` to calculate `firstRunAt` and `latestRunAt` per model
- [ ] Add `dataSpanDays` computed field: `(latestRunAt - firstRunAt) / (1000*60*60*24)`
- [ ] Join with `model_status` collection to get lifecycle status
- [ ] Add fields to `ProviderModelEntry`: `firstRunAt`, `dataSpanDays`, `lifecycleStatus`

**Query changes**:
```javascript
// Current: only gets latestRunAt
$group: { _id: {...}, latestRunAt: { $max: "$run_ts" } }

// New: get both first and last
$group: {
  _id: {...},
  latestRunAt: { $max: "$run_ts" },
  firstRunAt: { $min: "$run_ts" }
}

// Then lookup model_status
$lookup: {
  from: "model_status",
  let: { p: "$provider", m: "$model_name" },
  pipeline: [...],
  as: "lifecycle"
}
```

### Phase 2: Filtered Sitemap
**File**: `pages/api/sitemap.ts`

- [ ] Import FLAGGED_STATUSES from lifecycleSummary
- [ ] Filter inventory to only models where:
  - `dataSpanDays >= 30` AND
  - `lifecycleStatus` not in FLAGGED_STATUSES (or is null/active)
- [ ] Add debug logging for filtered count

### Phase 3: Model Page Enhancements
**File**: `pages/models/[provider]/[model].tsx`

- [ ] Add `ModelPageData.lifecycleStatus` and `ModelPageData.dataSpanDays`
- [ ] Add deprecation banner component when `lifecycleStatus === 'deprecated'`
- [ ] Add `noindex` meta tag when `dataSpanDays < 30` OR `lifecycleStatus` is flagged
- [ ] Update SEO metadata to reflect deprecation status

**File**: `types/ModelPages.ts`

- [ ] Add to `ProviderModelEntry`: `firstRunAt?: string`, `dataSpanDays?: number`, `lifecycleStatus?: string`
- [ ] Add to `ModelPageData`: `lifecycleStatus?: string`, `dataSpanDays?: number`, `isDeprecated?: boolean`

### Phase 4: Update modelService
**File**: `utils/modelService.ts`

- [ ] Update `getModelPageData()` to pass through lifecycle info
- [ ] Handle case where model exists but has thin content gracefully

## Testing

1. **Unit test**: Verify inventory query returns correct data span
2. **Integration test**: Verify sitemap excludes thin/flagged models
3. **Manual test**: Check a known deprecated model shows banner
4. **Manual test**: Check thin content page has noindex

## Progress Tracking

| Phase | Status | Notes |
|-------|--------|-------|
| Phase 1 | Complete | Types + inventory query updated with dataSpanDays, lifecycleStatus |
| Phase 2 | Complete | Sitemap now filters to 30+ day span, excludes flagged (except deprecated) |
| Phase 3 | Complete | DeprecationBanner component created, noindex meta implemented |
| Phase 4 | Complete | getModelPageData returns lifecycle info |
| Type Check | Pass | No TypeScript errors |
| Codex Review | Complete | Issues found and fixed |

## Codex Review Fixes Applied

1. **Sitemap recency check**: Added `RECENCY_WINDOW_DAYS` filter to ensure models have recent data (prevents 404s from stale models)
2. **$lookup determinism**: Added `$sort: { computed_at: -1 }` and `$limit: 1` to ensure consistent lifecycle status retrieval
3. **Shared constants**: Exported `SEO_MIN_DATA_SPAN_DAYS` from modelService.ts, imported in sitemap.ts
4. **FLAGGED_STATUSES**: Now imported from lifecycleSummary.ts instead of duplicating
5. **NaN guard**: Added `Number.isFinite()` check when computing dataSpanDays
6. **never_succeeded**: Added to BANNER_STATUSES and DeprecationBanner messages

## Files Modified

1. `types/ModelPages.ts` - Added: firstRunAt, dataSpanDays, lifecycleStatus, isDeprecated, shouldNoIndex
2. `utils/modelService.ts` - Enhanced fetchInventory() with $lookup to model_status, calculates dataSpanDays
3. `pages/api/sitemap.ts` - Filters inventory to 30+ day span, excludes flagged except deprecated
4. `pages/models/[provider]/[model].tsx` - Added DeprecationBanner import/usage, dynamic robots meta
5. `components/model/DeprecationBanner.tsx` - New component with status-specific messaging

## Rollback Plan

All changes are additive. To rollback:
1. Revert sitemap filter (show all models again)
2. Remove noindex logic
3. Keep deprecation banner (no harm)
