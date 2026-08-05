/**
 * The gate function being correct is already pinned by
 * `tests/designFixtures.test.js`. What that cannot catch is a *new* call site
 * that reaches for fixture data without asking whether fixtures are on — which
 * is the failure mode that actually matters, because its consequence is the
 * site publishing synthesised benchmark numbers as though they were measured.
 *
 * So: every module that imports a `getFixture*` must also import and call
 * `designFixturesEnabled`.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SEARCH_DIRS = ['pages', 'utils', 'components', 'hooks'];

function walk(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe('design fixture call sites', () => {
  const files = SEARCH_DIRS
    .map((d) => path.join(ROOT, d))
    .filter((d) => fs.existsSync(d))
    .flatMap(walk)
    // The fixture module defines the helpers; it is not a consumer of them.
    .filter((f) => !f.endsWith(path.join('utils', 'designFixtures.ts')));

  const consumers = files.filter((f) => /getFixture[A-Z]\w*/.test(fs.readFileSync(f, 'utf8')));

  it('finds the known consumers, so the scan is not silently matching nothing', () => {
    expect(consumers.length).toBeGreaterThanOrEqual(4);
  });

  it.each(consumers.map((f) => [path.relative(ROOT, f), f]))(
    '%s gates its fixture use',
    (_rel, file) => {
      const src = fs.readFileSync(file, 'utf8');
      expect(src).toMatch(/designFixturesEnabled/);
      expect(src).toMatch(/designFixturesEnabled\s*\(/);
    },
  );
});
