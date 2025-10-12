# Testing Strategy for LLM Benchmarks Backend

This test suite locks in your current API behavior to prevent regressions during optimization.

## Test Files

### `api.baseline.test.js`
- **Purpose**: Validates API endpoint responses and data structure
- **Key Tests**:
  - Data structure validation (speedDistribution, timeSeries, table)
  - Model name quality (no ugly technical names)
  - Consistent model counts across data structures
  - Cache bypass functionality

### `performance.test.js`
- **Purpose**: Establishes performance baselines and catches regressions
- **Current Baselines**:
  - Cold cache: < 5000ms (current ~2700ms)
  - Payload size: < 500KB
- **Key Tests**:
  - Response time tracking
  - Payload size monitoring
  - Concurrent request handling

### `data.snapshot.test.js`
- **Purpose**: Creates snapshots of data structures to catch unintended changes
- **Key Tests**:
  - Model count snapshots
  - Data structure snapshots
  - Model naming quality analysis
  - Density points structure validation

## Running Tests

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:baseline     # API structure tests
npm run test:performance  # Performance benchmarks  
npm run test:snapshots    # Data structure snapshots

# Watch mode for development
npm run test:watch

# Run against production API
TEST_API_URL=https://api.llm-benchmarks.com npm test

# Run against local development
TEST_API_URL=http://localhost:5000 npm test

# Update snapshots after intentional changes
npm test -- --updateSnapshot
```

## Environment Variables

- `TEST_API_URL`: API endpoint to test against (default: https://api.llm-benchmarks.com)
- `VERBOSE_TESTS`: Show detailed console output during tests

## Development Workflow

1. **Before optimization changes**: Run full test suite to establish baseline
   ```bash
   npm test
   ```

2. **During development**: Use watch mode to catch issues immediately
   ```bash
   npm run test:watch
   ```

3. **After changes**: Verify no regressions
   ```bash
   npm run test:baseline
   npm run test:performance
   ```

4. **If structure changes intentionally**: Update snapshots
   ```bash
   npm run test:snapshots -- --updateSnapshot
   ```

## Test Philosophy

These tests focus on:
- **API contracts** - ensuring responses have expected structure
- **Data quality** - no ugly model names, consistent counts
- **Performance** - response times don't regress
- **Stability** - data structures remain consistent

They don't test:
- Internal implementation details
- Specific model names (which change over time)
- Exact counts (which vary with new data)

## Interpreting Failures

### Snapshot failures
- **Expected**: After intentional API changes
- **Action**: Review diff, update snapshots if changes are intentional

### Performance failures  
- **Possible causes**: Database issues, network problems, code regressions
- **Action**: Investigate timing, check server logs

### Structure failures
- **Possible causes**: Model mapping issues, data processing bugs
- **Action**: Check recent changes to data processing logic

### `pipeline.canonical.test.js` ✨ NEW
- **Purpose**: Validates the canonical/display/slug architecture end-to-end
- **Status**: ✅ 21/21 tests passing
- **Key Tests**:
  - Canonical field immutability (never mutates providerCanonical/modelCanonical)
  - Slug generation consistency (always from canonical IDs)
  - Vertex provider mapping (canonical=vertex, display=google, slug=vertex)
  - Display name mapping and grouping
  - Data validation and error handling
  - End-to-end pipeline integration

### `api.canonical-contract.test.js` ✨ NEW
- **Purpose**: Validates API exposes canonical architecture correctly
- **Status**: Requires live API connection
- **Key Tests**:
  - All table rows have canonical/display/slug fields
  - Slugs are URL-safe (lowercase, alphanumeric + hyphens)
  - Vertex 404 regression prevention
  - Slug consistency across providers
  - Data quality validation

## Adding New Tests

When adding new API endpoints or data structures:

1. Add structure validation to `api.baseline.test.js`
2. Add performance baseline to `performance.test.js`
3. Add snapshot test to `data.snapshot.test.js`
4. Add canonical architecture validation to `pipeline.canonical.test.js`
5. Update this README with new baselines

---

# Canonical Architecture Testing (NEW)

## Overview

The canonical/display/slug architecture ensures model links work correctly by maintaining three separate fields:

- **Canonical**: Database identifier for routing (`vertex`, `gpt-4-0613`)
- **Display**: User-friendly UI label (`google`, `gpt-4`)
- **Slug**: URL-safe path from canonical (`vertex`, `gpt-4-0613`)

## Running Canonical Tests

```bash
# Run pipeline integration tests (unit tests)
npm run test:pipeline

# Run API contract tests (integration tests)
npm run test:contract

# Run both canonical test suites
npm run test:canonical

# Test against local API
TEST_API_URL=http://localhost:3000 npm run test:contract
```

## The Bug These Tests Prevent

**Original Issue**: Vertex provider models returned 404 errors

**Root Cause**:
1. Database stores `provider: "vertex"`
2. Mapping changed it to `"google"` for display
3. Slugs generated from display: `createSlug("google")` = `"google"`
4. Frontend linked to `/models/google/gemini-15-pro`
5. Routes expected `/models/vertex/...`
6. **Result**: All vertex models 404'd

**The Fix**:
```typescript
// ❌ BAD (old code):
if (item.provider === "vertex") {
  item.provider = "google";
  item.providerCanonical = "google";  // MUTATED canonical!
}
slug = createSlug(item.providerCanonical);  // "google" ❌

// ✅ GOOD (fixed code):
const providerCanonical = item.providerCanonical ?? item.provider;  // "vertex"
const providerDisplay = getProviderDisplayName(providerCanonical);   // "google"
const providerSlug = createSlug(providerCanonical);  // "vertex" ✅
```

## Data Flow

```
MongoDB → cleanTransformCloud → mapModelNames → processRawTableData → Frontend
  ↓              ↓                    ↓                ↓                 ↓
vertex      providerCanonical    provider =        validates         links to:
stored      = "vertex"           "google"          slugs exist       /models/vertex/...
                                 providerSlug =
                                 "vertex"
```

## Key Test Scenarios

### 1. Canonical Immutability Test

```javascript
test('never mutates providerCanonical field', () => {
  const providers = ['openai', 'anthropic', 'vertex', 'azure'];

  providers.forEach(original => {
    const result = mapModelNames([{providerCanonical: original, ...}]);
    expect(result[0].providerCanonical).toBe(original);  // NEVER changes
  });
});
```

### 2. Slug Generation Test

```javascript
test('generates slugs from canonical fields, not display names', () => {
  const data = [{ providerCanonical: 'vertex', provider: 'google', ... }];
  const result = mapModelNames(data);

  // Slug from canonical "vertex", not display "google"
  expect(result[0].providerSlug).toBe('vertex');  // ✅
  expect(result[0].providerSlug).not.toBe('google');  // ❌
});
```

### 3. Vertex End-to-End Test

```javascript
test('vertex provider flows correctly through entire pipeline', async () => {
  const raw = [{ provider: 'vertex', model_name: 'gemini-1.5-pro' }];

  const processed = cleanTransformCloud(raw);
  expect(processed[0].providerCanonical).toBe('vertex');

  const mapped = mapModelNames(processed);
  expect(mapped[0]).toMatchObject({
    provider: 'google',            // Display
    providerCanonical: 'vertex',   // Canonical (unchanged)
    providerSlug: 'vertex'         // Slug from canonical
  });

  const table = await processRawTableData(mapped);
  const url = `/models/${table[0].providerSlug}/${table[0].modelSlug}`;

  expect(url).toContain('/models/vertex/');  // ✅ Works!
  expect(url).not.toContain('/models/google/');  // ❌ Would 404
});
```

## Debugging Failed Tests

### Pipeline Tests Failing

Check for canonical field mutations:
```bash
grep -r "providerCanonical\s*=" --include="*.ts" utils/
grep -r "modelCanonical\s*=" --include="*.ts" utils/
```

Both should return zero results (except initial assignment).

Check slug generation:
```bash
grep -r "createSlug" --include="*.ts" utils/
```

All `createSlug()` calls should use canonical fields:
```typescript
✅ createSlug(providerCanonical)
✅ createSlug(modelCanonical)
❌ createSlug(provider)
❌ createSlug(model_name)
```

### API Contract Tests Failing

Verify mapping step exists in all API endpoints:
```typescript
// ✅ GOOD: backend/pages/api/processed.ts
const mappedData = await mapModelNames(transformedData, useDbModels);
const tableData = await processRawTableData(mappedData);

// ❌ BAD: Missing mapping step
const tableData = await processRawTableData(transformedData);  // Type error!
```

Check live API response:
```bash
curl http://localhost:3000/api/processed?days=3 | jq '.table[0]'
```

Should return:
```json
{
  "provider": "google",
  "providerCanonical": "vertex",
  "providerSlug": "vertex",
  "model_name": "gemini-1.5-pro",
  "modelCanonical": "gemini-1.5-pro",
  "modelSlug": "gemini-15-pro"
}
```

## Architecture Documentation

For complete details, see:
- **Full Architecture**: `../CLAUDE.md` (root project doc)
- **Type Definitions**: `../types/CloudData.ts`, `../types/ProcessedData.ts`
- **Mapping Logic**: `../utils/modelMapping.ts`, `../utils/modelMappingDB.ts`
- **Provider Metadata**: `../utils/providerMetadata.ts`

## CI/CD Integration

Add to your CI pipeline:

```yaml
# .github/workflows/test.yml
- name: Run canonical architecture tests
  run: npm run test:canonical

- name: Verify TypeScript compilation
  run: npx tsc --noEmit

- name: Run all tests
  run: npm test
```

## Test Coverage Summary

| Test File | Tests | Status | Coverage |
|-----------|-------|--------|----------|
| pipeline.canonical.test.js | 21 | ✅ Passing | Pipeline 0→1 |
| api.canonical-contract.test.js | 15 | 🔌 Needs API | API contracts |
| api.baseline.test.js | 5 | 🔌 Needs API | API structure |
| performance.test.js | 6 | 🔌 Needs API | Performance |
| data.snapshot.test.js | 4 | 🔌 Needs API | Snapshots |

**Total**: 51 tests covering the entire data pipeline