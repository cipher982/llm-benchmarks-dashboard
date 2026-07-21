const { hasConfiguredMongoUri } = require('../utils/buildMode');

describe('build database configuration', () => {
  test.each([
    [{}, false],
    [{ MONGODB_URI: '' }, false],
    [{ MONGODB_URI: '   ' }, false],
    [{ MONGODB_URI: 'mongodb://localhost:27017/benchmarks' }, true],
  ])('detects configured Mongo URI for %p', (env, expected) => {
    expect(hasConfiguredMongoUri(env)).toBe(expected);
  });
});
