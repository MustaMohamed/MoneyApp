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
    '<rootDir>/.worktrees/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated))',
  ],
  // Covers the pure logic layer only. Hooks (*.hook.ts) and router/form
  // utilities require renderHook + expo-router mocks — deferred to M1.5.
  // Trivial UI-only Zustand stores (pure setters, no business logic) are
  // excluded via coveragePathIgnorePatterns to keep thresholds meaningful.
  collectCoverageFrom: [
    'store/**/*.ts',
    'repositories/**/*.ts',
    'database/**/*.ts',
    'utils/responsive.ts',
    'utils/format_amount.ts',
    'utils/format_date.ts',
    'utils/onboarding_nav.ts',
    'app/**/*.helpers.ts',
    'app/**/*.store.ts',
    '!**/__mocks__/**',
    '!database/entities/**',
    '!database/client.ts',
  ],
  coveragePathIgnorePatterns: [
    '/node_modules/',
    'app/_layout\\.store\\.ts',
    'app/\\(onboarding\\)/.+\\.store\\.ts',
    'app/\\(app\\)/settings/.+\\.store\\.ts',
  ],
  coverageThreshold: {
    global: { lines: 80, functions: 95, branches: 100 },
  },
};
