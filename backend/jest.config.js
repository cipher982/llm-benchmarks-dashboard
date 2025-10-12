module.exports = {
  testEnvironment: 'node',
  testMatch: [
    '**/tests/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  collectCoverageFrom: [
    'pages/api/**/*.{js,ts}',
    'utils/**/*.{js,ts}',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  testTimeout: 30000,
  verbose: true,
  // Handle ES modules and Next.js specific imports
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1'
  },
  // Transform TypeScript files using Next.js built-in transformation
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['next/dist/build/swc/jest-transformer', {}]
  },
  // Add file extensions to resolve
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json']
};