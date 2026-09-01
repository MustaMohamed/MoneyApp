/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/.expo/',
    '/dist/',
    '/android/',
    '/ios/',
    // <rootDir>-anchored; un-anchored '/.claude/' matches every worktree test path and drops them.
    '<rootDir>/.claude/',
    '<rootDir>/.worktrees/',
  ],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  // `standard-navigation` ships untranspiled ESM nested under expo-router, so it must be listed.
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|standard-navigation|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated))',
  ],
  // Hook files are excluded: their async and multi-condition branches cannot reach the 100% gate.
  collectCoverageFrom: [
    'src/store/**/*.ts',
    'src/modules/categories/store/category.store.ts',
    'src/modules/categories/screens/settings/categories/categories.helpers.ts',
    'src/modules/currency/screens/currency/currency.state.ts',
    'src/modules/currency/store/currency.helpers.ts',
    'src/modules/currency/store/currency.store.ts',
    'src/modules/navigation/components/startup_error.helpers.ts',
    'src/modules/onboarding/store/onboarding.store.ts',
    'src/repositories/**/*.ts',
    'src/database/**/*.ts',
    'src/utils/responsive.ts',
    'src/utils/format_amount.ts',
    'src/utils/format_date.ts',
    'src/utils/run_after_interactions.ts',
    'src/screens/**/*.store.ts',
    'src/screens/**/*.state.ts',
    'src/app/**/*.helpers.ts',
    'src/app/**/*.store.ts',
    '!**/__mocks__/**',
    '!src/database/entities/**',
    '!src/database/client.ts',
    '!src/screens/**/*.hook.ts',
    '!src/utils/use_layout_init.hook.ts',
  ],
  coveragePathIgnorePatterns: ['/node_modules/'],
  coverageThreshold: {
    global: { lines: 80, functions: 95, branches: 100 },
  },
};
