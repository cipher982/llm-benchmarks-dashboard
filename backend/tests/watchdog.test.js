/**
 * The watchdog endpoint is the only thing an observer off this host can read,
 * so a field-name drift here is invisible: the endpoint keeps returning 200
 * with an empty `failing` list and the dead man reports calm.
 *
 * These fix the two things that cannot be caught by reading the code — the
 * shape `bench_check_runs` actually stores, and that an unreadable database
 * reports unknown rather than zero.
 */

jest.mock('../utils/connectToMongoDB', () => jest.fn().mockResolvedValue(true));
jest.mock('../utils/logger', () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }));

const mongoose = require('mongoose');
const handler = require('../pages/api/watchdog').default;

// Exactly as production stores it, verified against bench_check_runs.
const CHECK_RUN = {
  checked_at: new Date('2026-08-05T01:08:57.195Z'),
  threshold_version: 2,
  cadence_seconds: 900,
  results: [
    { name: 'no_work_for_disabled_models', ok: true, evaluated: true, violation_count: 0 },
    { name: 'no_case_duplicate_models', ok: false, evaluated: true, violation_count: 3 },
    { name: 'discovery_is_current', ok: false, evaluated: false, error: 'provider_catalog unreadable' },
  ],
};

const makeRes = () => {
  const res = { statusCode: null, body: null };
  res.status = code => {
    res.statusCode = code;
    return res;
  };
  res.json = payload => {
    res.body = payload;
    return res;
  };
  return res;
};

const cursor = doc => ({
  sort: () => cursor(doc),
  limit: () => cursor(doc),
  next: async () => doc,
});

const connectMongo = collections => {
  Object.defineProperty(mongoose.connection, 'readyState', { value: 1, configurable: true });
  Object.defineProperty(mongoose.connection, 'db', {
    configurable: true,
    value: {
      admin: () => ({ ping: async () => ({ ok: 1 }) }),
      collection: name => collections[name] || { find: () => cursor(null) },
    },
  });
};

describe('watchdog endpoint', () => {
  test('separates a failing invariant from one that could not be evaluated', async () => {
    connectMongo({
      bench_check_runs: { find: () => cursor(CHECK_RUN) },
      metrics_cloud_v2: { find: () => cursor({ run_ts: new Date() }), countDocuments: async () => 42 },
      models: { countDocuments: async () => 180, distinct: async () => ['openai', 'groq'] },
    });

    const res = makeRes();
    await handler({}, res);

    expect(res.body.invariants.reachable).toBe(true);
    expect(res.body.invariants.failing).toEqual(['no_case_duplicate_models']);
    expect(res.body.invariants.unevaluable).toEqual(['discovery_is_current']);
    expect(res.body.invariants.threshold_version).toBe(2);
    expect(res.body.catalogue.enabled_models).toBe(180);
    expect(res.statusCode).toBe(200);
  });

  test('an unreadable database reports unknown, never zero', async () => {
    Object.defineProperty(mongoose.connection, 'readyState', { value: 0, configurable: true });
    Object.defineProperty(mongoose.connection, 'db', { value: undefined, configurable: true });

    const res = makeRes();
    await handler({}, res);

    // Zeros would read as "the catalogue is empty", a different emergency that
    // would send someone looking in the wrong place.
    expect(res.body.catalogue.enabled_models).toBeNull();
    expect(res.body.catalogue.reachable).toBe(false);
    expect(res.body.invariants.reachable).toBe(false);
    expect(res.statusCode).toBe(503);
  });
});
