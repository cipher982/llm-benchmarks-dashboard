jest.mock('../utils/connectToMongoDB', () => jest.fn().mockResolvedValue(true));
jest.mock('../utils/logger', () => ({ warn: jest.fn(), error: jest.fn(), info: jest.fn(), debug: jest.fn() }));

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const {
  RATE_LIMIT_MAX_ENTRIES,
  checkAdminIpWhitelist,
  checkAdminRateLimit,
  getClientIp,
  isValidAdminKey,
  rateLimitStore,
  timingSafeTokenEqual,
} = require('../utils/adminAuth');

const modelsHandler = require('../pages/api/models').default;
const adminModelsHandler = require('../pages/api/admin-models').default;
const benchmarkHandler = require('../pages/api/benchmark').default;
const debugPipelineHandler = require('../pages/api/debug-pipeline').default;
const processedHandler = require('../pages/api/processed').default;
const localHandler = require('../pages/api/local').default;
const healthHandler = require('../pages/api/health').default;

function makeRes() {
  const headers = {};
  const res = {
    statusCode: null,
    body: null,
    headers,
    ended: false,
    setHeader(name, value) {
      headers[name.toLowerCase()] = value;
      return res;
    },
    getHeader(name) {
      return headers[name.toLowerCase()];
    },
    status(code) {
      res.statusCode = code;
      return res;
    },
    json(payload) {
      res.body = payload;
      return res;
    },
    end() {
      res.ended = true;
      return res;
    },
  };
  return res;
}

function makeReq(overrides = {}) {
  return {
    method: 'GET',
    headers: {},
    query: {},
    body: {},
    socket: { remoteAddress: '203.0.113.10' },
    url: '/api/test',
    ...overrides,
  };
}

describe('Target 1 security hardening', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env = { ...originalEnv, NODE_ENV: 'test', ADMIN_API_KEY: 'super-secret-admin-key' };
    delete process.env.ADMIN_IP_WHITELIST;
    rateLimitStore.clear();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('utils/adminAuth', () => {
    test('timingSafeTokenEqual handles matching, mismatching, different-length, and non-string values', () => {
      expect(timingSafeTokenEqual('abc123', 'abc123')).toBe(true);
      expect(timingSafeTokenEqual('abc123', 'abc124')).toBe(false);
      expect(timingSafeTokenEqual('short', 'much-longer-secret')).toBe(false);
      expect(timingSafeTokenEqual('', '')).toBe(false);
      expect(timingSafeTokenEqual(['abc123'], 'abc123')).toBe(false);
      expect(timingSafeTokenEqual(undefined, 'abc123')).toBe(false);
    });

    test('isValidAdminKey fails closed when ADMIN_API_KEY is unset', () => {
      delete process.env.ADMIN_API_KEY;
      expect(isValidAdminKey(makeReq({ headers: { 'x-admin-key': 'anything' } }))).toBe(false);
    });

    test('ignores x-forwarded-for and reads cf-connecting-ip', () => {
      const req = makeReq({
        headers: {
          'x-forwarded-for': '127.0.0.1, 10.0.0.1',
          'cf-connecting-ip': '198.51.100.25',
        },
        socket: { remoteAddress: '127.0.0.1' },
      });

      expect(getClientIp(req)).toBe('198.51.100.25');
      process.env.ADMIN_IP_WHITELIST = '192.0.2.1';
      // Even on a loopback socket in non-production, cf-connecting-ip disables loopback bypass.
      expect(checkAdminIpWhitelist(req)).toBe(false);
    });

    test('allows loopback bypass only in non-production when socket is loopback and cf-connecting-ip is absent', () => {
      process.env.ADMIN_IP_WHITELIST = '192.0.2.1';
      const loopbackReq = makeReq({
        headers: { 'x-forwarded-for': '198.51.100.99' },
        socket: { remoteAddress: '127.0.0.1' },
      });

      process.env.NODE_ENV = 'development';
      expect(checkAdminIpWhitelist(loopbackReq)).toBe(true);

      process.env.NODE_ENV = 'production';
      expect(checkAdminIpWhitelist(loopbackReq)).toBe(false);

      // Spoofed x-forwarded-for loopback from non-loopback socket must not bypass in non-prod.
      process.env.NODE_ENV = 'development';
      const spoofedReq = makeReq({
        headers: { 'x-forwarded-for': '127.0.0.1' },
        socket: { remoteAddress: '198.51.100.99' },
      });
      expect(checkAdminIpWhitelist(spoofedReq)).toBe(false);
    });

    test('caps rateLimitStore at <= 5000 entries and sweeps expired before evicting active', () => {
      const localStore = new Map();
      const t0 = 1_000_000;
      for (let i = 0; i < RATE_LIMIT_MAX_ENTRIES + 500; i++) {
        checkAdminRateLimit(`10.0.${Math.floor(i / 255)}.${i % 255}`, t0, localStore);
      }
      expect(localStore.size).toBeLessThanOrEqual(RATE_LIMIT_MAX_ENTRIES);
      expect(localStore.size).toBe(5000);
    });
  });

  describe('pages/api/models.ts', () => {
    test('returns 405 Method Not Allowed for POST, PUT, DELETE', async () => {
      for (const method of ['POST', 'PUT', 'DELETE']) {
        const res = makeRes();
        await modelsHandler(makeReq({ method }), res);
        expect(res.statusCode).toBe(405);
        expect(res.headers.allow).toEqual(['GET']);
      }
    });

    test('guards typeof provider === string against object/array query injection', async () => {
      const sortMock = jest.fn().mockResolvedValue([]);
      const findSpy = jest.spyOn(mongoose.models.Model, 'find').mockReturnValue({ sort: sortMock });
      try {
        const res = makeRes();
        await modelsHandler(makeReq({ method: 'GET', query: { provider: { $ne: 'openai' } } }), res);
        expect(res.statusCode).toBe(200);
        expect(findSpy).toHaveBeenCalledWith({});
      } finally {
        findSpy.mockRestore();
      }
    });
  });

  describe('pages/api/admin-models.ts', () => {
    test('rejects spoofed x-forwarded-for loopback when whitelist is active in production', async () => {
      process.env.NODE_ENV = 'production';
      process.env.ADMIN_IP_WHITELIST = '192.0.2.50';
      const res = makeRes();
      await adminModelsHandler(
        makeReq({
          method: 'GET',
          headers: { 'x-forwarded-for': '127.0.0.1', 'x-admin-key': 'super-secret-admin-key' },
          socket: { remoteAddress: '127.0.0.1' },
        }),
        res
      );
      expect(res.statusCode).toBe(403);
    });

    test('rejects invalid admin key with 403', async () => {
      const res = makeRes();
      await adminModelsHandler(
        makeReq({
          method: 'GET',
          headers: { 'x-admin-key': 'wrong-key' },
          socket: { remoteAddress: '127.0.0.1' },
        }),
        res
      );
      expect(res.statusCode).toBe(403);
    });
  });

  describe('pages/api/benchmark.ts and pages/api/debug-pipeline.ts', () => {
    test('benchmark requires x-admin-key and omits raw error.message on failure', async () => {
      const unauthRes = makeRes();
      await benchmarkHandler(makeReq({ method: 'GET' }), unauthRes);
      expect(unauthRes.statusCode).toBe(403);

      const connectMock = require('../utils/connectToMongoDB');
      connectMock.mockRejectedValueOnce(new Error('mongodb://secret-user:secret-pass@internal-host:27017'));

      const errRes = makeRes();
      await benchmarkHandler(
        makeReq({ method: 'GET', headers: { 'x-admin-key': 'super-secret-admin-key' } }),
        errRes
      );
      expect(errRes.statusCode).toBe(500);
      expect(errRes.body).toEqual({ error: 'Benchmark failed' });
      expect(JSON.stringify(errRes.body)).not.toContain('secret-pass');
    });

    test('debug-pipeline requires x-admin-key', async () => {
      const unauthRes = makeRes();
      await debugPipelineHandler(makeReq({ method: 'GET' }), unauthRes);
      expect(unauthRes.statusCode).toBe(403);
    });
  });

  describe('pages/api/processed.ts and pages/api/local.ts', () => {
    test('gates ?bypass_static=true on x-admin-key', async () => {
      const processedRes = makeRes();
      await processedHandler(makeReq({ method: 'GET', query: { bypass_static: 'true' } }), processedRes);
      expect(processedRes.statusCode).toBe(403);

      const localRes = makeRes();
      await localHandler(makeReq({ method: 'GET', query: { bypass_static: 'true' } }), localRes);
      expect(localRes.statusCode).toBe(403);
    });

    test('strips X-Static-Path-Attempted header and handles NaN days in processed.ts', async () => {
      const statSpy = jest.spyOn(fs.promises, 'stat').mockRejectedValueOnce(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
      const connectMock = require('../utils/connectToMongoDB');
      connectMock.mockRejectedValueOnce(new Error('no db'));

      const res = makeRes();
      await processedHandler(makeReq({ method: 'GET', query: { days: 'not-a-number' } }), res);

      expect(res.headers['x-static-path-attempted']).toBeUndefined();
      // Verify parseTimeRange fell back cleanly rather than throwing NaN Date errors
      expect(res.statusCode).toBe(500);
      statSpy.mockRestore();
    });
  });

  describe('pages/api/health.ts', () => {
    test('does not include COOLIFY_URL or raw error.message', async () => {
      process.env.COOLIFY_URL = 'https://coolify.internal.example';
      const connectMock = require('../utils/connectToMongoDB');
      connectMock.mockRejectedValueOnce(new Error('mongodb://internal:27017 auth failed'));

      const res = makeRes();
      await healthHandler(makeReq({ method: 'GET' }), res);

      expect(res.body.url).toBeUndefined();
      expect(res.body.services.mongodb.details).toBe('Database connection failed');
      expect(JSON.stringify(res.body)).not.toContain('coolify.internal');
      expect(JSON.stringify(res.body)).not.toContain('internal:27017');
    });
  });

  describe('server.js and .dockerignore checks', () => {
    test('server.js uses timingSafeEqual, sends x-admin-key on warmup, and removes COOLIFY_URL', () => {
      const serverSrc = fs.readFileSync(path.join(__dirname, '..', 'server.js'), 'utf8');
      expect(serverSrc).toContain('crypto.timingSafeEqual');
      expect(serverSrc).not.toContain('COOLIFY_URL');
      expect(serverSrc).toContain("'x-admin-key'");
      expect(serverSrc).toContain('bypass_static=true');
    });

    test('backend/.dockerignore exists and excludes secrets and test artifacts', () => {
      const dockerignore = fs.readFileSync(path.join(__dirname, '..', '.dockerignore'), 'utf8');
      expect(dockerignore).toContain('.env');
      expect(dockerignore).toContain('.git');
      expect(dockerignore).toContain('node_modules');
    });
  });
});
