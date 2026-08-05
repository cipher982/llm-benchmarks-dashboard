/**
 * The design fixtures serve synthesised data. Nothing about how they are gated
 * is allowed to drift, because the failure mode is the site quietly publishing
 * invented benchmark numbers as if they were measurements.
 */

const { designFixturesEnabled } = require('../utils/designFixtures');

describe('design fixture gate', () => {
  it('stays off unless explicitly asked for', () => {
    expect(designFixturesEnabled({})).toBe(false);
    expect(designFixturesEnabled({ DESIGN_FIXTURES: '0' })).toBe(false);
    expect(designFixturesEnabled({ DESIGN_FIXTURES: 'true' })).toBe(false);
  });

  it('does not turn on merely because no database is configured', () => {
    // The obvious gate — "no MONGODB_URI, so serve fixtures" — would mean a
    // production deploy that lost its connection string starts serving
    // fabricated status and model data instead of failing loudly.
    expect(designFixturesEnabled({ MONGODB_URI: '' })).toBe(false);
    expect(designFixturesEnabled({})).toBe(false);
  });

  it('turns on for the design server', () => {
    expect(designFixturesEnabled({ DESIGN_FIXTURES: '1' })).toBe(true);
  });

  it('never turns on in production, whatever the flag says', () => {
    expect(designFixturesEnabled({ DESIGN_FIXTURES: '1', NODE_ENV: 'production' })).toBe(false);
  });
});
