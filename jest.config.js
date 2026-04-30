/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.expo/',
    '/dist/',
    '/android/',
    '/ios/',
    '/.claude/',
    '/.worktrees/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated))',
  ],
  // Covers the pure logic layer only. Hooks (*.hook.ts) and router/form
  // utilities require renderHook + expo-router mocks — deferred to M1.5.
  collectCoverageFrom: [
    'store/**/*.ts',
    'database/**/*.ts',
    'utils/responsive.ts',
    'app/**/*.helpers.ts',
    '!**/__mocks__/**',
  ],
  coverageThreshold: {
    global: { lines: 80, functions: 95, branches: 100 },
  },
};
