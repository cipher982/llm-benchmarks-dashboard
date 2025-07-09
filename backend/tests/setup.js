/**
 * Jest setup file
 */

// Global test configuration
global.console = {
  ...console,
  // Suppress some log output during tests unless running in verbose mode
  log: process.env.VERBOSE_TESTS ? console.log : jest.fn(),
  debug: process.env.VERBOSE_TESTS ? console.debug : jest.fn(),
  // Keep error and warn
  error: console.error,
  warn: console.warn,
  info: console.info
};

// Set test environment variables
process.env.NODE_ENV = 'test';