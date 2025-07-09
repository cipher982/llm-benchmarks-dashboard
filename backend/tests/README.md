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

## Adding New Tests

When adding new API endpoints or data structures:

1. Add structure validation to `api.baseline.test.js`
2. Add performance baseline to `performance.test.js`  
3. Add snapshot test to `data.snapshot.test.js`
4. Update this README with new baselines