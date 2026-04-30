# Code Quality & Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extract pure logic from onboarding hooks into colocated helper files, write tests for all new and previously untested logic, rename existing test files to snake_case, and add coverage reporting with pre-commit/pre-push quality gates.

**Architecture:** Pure functions are extracted from `ready.hook.ts` and `security.hook.ts` into sibling `.helpers.ts` files — colocated with their feature, not in `utils/`. Hooks import helpers instead of inlining the logic. No behavior changes. Quality tooling (husky + lint-staged) is wired up last, after tests pass.

**Tech Stack:** Jest 29, jest-expo, TypeScript strict, husky v9, lint-staged, better-sqlite3 (existing)

---

## File Map

| Action | File | Responsibility |
|---|---|---|
| Create | `app/(onboarding)/ready/ready.helpers.ts` | `computeTotalBalance`, `resolveSecurityLabel` |
| Create | `app/(onboarding)/security/security.helpers.ts` | `canProceed` type guard |
| Create | `__tests__/ready_helpers.test.ts` | Tests for ready helpers |
| Create | `__tests__/security_helpers.test.ts` | Tests for security helpers |
| Create | `__tests__/responsive.test.ts` | Tests for `ms`, `msFont`, `responsiveScale` |
| Modify | `app/(onboarding)/ready/ready.hook.ts` | Import helpers, remove inlined logic |
| Modify | `app/(onboarding)/security/security.hook.ts` | Import `canProceed`, remove inlined guard |
| Modify | `jest.config.js` | Add `collectCoverageFrom` + `coverageThreshold` |
| Modify | `package.json` | Add `test:coverage` script, `lint-staged` config, `prepare` script |
| Rename | `__tests__/onboardingStore.test.ts` → `__tests__/onboarding_store.test.ts` | snake_case alignment |
| Rename | `__tests__/accountStore.test.ts` → `__tests__/account_store.test.ts` | snake_case alignment |
| Rename | `__tests__/numberFormat.test.ts` → `__tests__/number_format.test.ts` | snake_case alignment |
| Create | `.husky/pre-commit` | Run lint-staged on staged files |
| Create | `.husky/pre-push` | Run full test suite + typecheck |

---

## Task 1: Rename test files to snake_case

**Files:**
- Rename: `__tests__/onboardingStore.test.ts` → `__tests__/onboarding_store.test.ts`
- Rename: `__tests__/accountStore.test.ts` → `__tests__/account_store.test.ts`
- Rename: `__tests__/numberFormat.test.ts` → `__tests__/number_format.test.ts`

- [ ] **Step 1: Rename with git mv to preserve history**

```bash
git mv __tests__/onboardingStore.test.ts __tests__/onboarding_store.test.ts
git mv __tests__/accountStore.test.ts __tests__/account_store.test.ts
git mv __tests__/numberFormat.test.ts __tests__/number_format.test.ts
```

- [ ] **Step 2: Verify all tests still pass**

```bash
npm test
```

Expected: all previously passing tests pass, no failures. Jest will pick up the renamed files automatically since `testPathIgnorePatterns` targets directories, not filenames.

- [ ] **Step 3: Commit**

```bash
git add -A
git commit -m "test: rename test files to snake_case"
```

---

## Task 2: Extract and test ready helpers (TDD)

**Files:**
- Create: `__tests__/ready_helpers.test.ts`
- Create: `app/(onboarding)/ready/ready.helpers.ts`
- Modify: `app/(onboarding)/ready/ready.hook.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/ready_helpers.test.ts`:

```typescript
import { computeTotalBalance, resolveSecurityLabel } from '@/app/(onboarding)/ready/ready.helpers';
import { Strings } from '@/constants/strings';
import type { Account } from '@/store/account_store';

const account = (opening_balance: number): Account => ({
  id: '1',
  name: 'Test',
  type: 'bank',
  currency: 'EGP',
  opening_balance,
  current_balance: opening_balance,
  color: null,
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  is_archived: 0,
  sort_order: 0,
  created_at: '2026-04-30T00:00:00.000Z',
  updated_at: '2026-04-30T00:00:00.000Z',
});

describe('computeTotalBalance', () => {
  it('returns 0 for an empty account list', () => {
    expect(computeTotalBalance([])).toBe(0);
  });

  it('returns the opening_balance of a single account', () => {
    expect(computeTotalBalance([account(5000)])).toBe(5000);
  });

  it('sums opening_balance across multiple accounts', () => {
    expect(computeTotalBalance([account(1000), account(500)])).toBe(1500);
  });
});

describe('resolveSecurityLabel', () => {
  it('null → Strings.o6SecuritySkipped', () => {
    expect(resolveSecurityLabel(null)).toBe(Strings.o6SecuritySkipped);
  });

  it('"skip" → Strings.o6SecuritySkipped', () => {
    expect(resolveSecurityLabel('skip')).toBe(Strings.o6SecuritySkipped);
  });

  it('"pin" → Strings.o6SecurityEnabled', () => {
    expect(resolveSecurityLabel('pin')).toBe(Strings.o6SecurityEnabled);
  });

  it('"biometric" → Strings.o6SecurityEnabled', () => {
    expect(resolveSecurityLabel('biometric')).toBe(Strings.o6SecurityEnabled);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest __tests__/ready_helpers.test.ts
```

Expected: FAIL — `Cannot find module '@/app/(onboarding)/ready/ready.helpers'`

- [ ] **Step 3: Create `app/(onboarding)/ready/ready.helpers.ts`**

```typescript
import { Strings } from '@/constants/strings';
import type { SecurityChoice } from '@/store/onboarding_store';
import type { Account } from '@/store/account_store';

export function computeTotalBalance(accounts: Account[]): number {
  return accounts.reduce((sum, a) => sum + a.opening_balance, 0);
}

export function resolveSecurityLabel(choice: SecurityChoice | null): string {
  return choice === null || choice === 'skip'
    ? Strings.o6SecuritySkipped
    : Strings.o6SecurityEnabled;
}
```

- [ ] **Step 4: Run to verify the new tests pass**

```bash
npx jest __tests__/ready_helpers.test.ts
```

Expected: PASS — 7 tests pass.

- [ ] **Step 5: Update `app/(onboarding)/ready/ready.hook.ts` to use the helpers**

Replace the full file content with:

```typescript
import { useAccountStore } from '@/store/account_store';
import { useOnboardingStore } from '@/store/onboarding_store';
import { useReadyStore } from './ready.store';
import { Strings } from '@/constants/strings';
import { computeTotalBalance, resolveSecurityLabel } from './ready.helpers';

type SummaryRow = { label: string; value: string; gold: boolean };

export function useReady() {
  const baseCurrency = useOnboardingStore((s) => s.baseCurrency);
  const securityChoice = useOnboardingStore((s) => s.securityChoice);
  const completeOnboarding = useOnboardingStore((s) => s.completeOnboarding);
  const accounts = useAccountStore((s) => s.accounts);
  const completing = useReadyStore((s) => s.completing);
  const setCompleting = useReadyStore((s) => s.setCompleting);

  const total = computeTotalBalance(accounts);
  const formattedTotal = new Intl.NumberFormat('en-US').format(total);
  const securityValue = resolveSecurityLabel(securityChoice);

  const rows: SummaryRow[] = [
    { label: Strings.o6Currency, value: baseCurrency, gold: true },
    { label: Strings.o6Accounts, value: `${accounts.length} accounts`, gold: false },
    { label: Strings.o6TotalBalance, value: `${formattedTotal} ${baseCurrency}`, gold: true },
    { label: Strings.o6Security, value: securityValue, gold: false },
  ];

  const handleComplete = async () => {
    if (completing) return;
    setCompleting(true);
    try {
      await completeOnboarding();
    } finally {
      setCompleting(false);
    }
  };

  return { rows, completing, handleComplete };
}
```

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 7: Commit**

```bash
git add __tests__/ready_helpers.test.ts "app/(onboarding)/ready/ready.helpers.ts" "app/(onboarding)/ready/ready.hook.ts"
git commit -m "feat: extract ready helpers and add tests"
```

---

## Task 3: Extract and test security helpers (TDD)

**Files:**
- Create: `__tests__/security_helpers.test.ts`
- Create: `app/(onboarding)/security/security.helpers.ts`
- Modify: `app/(onboarding)/security/security.hook.ts`

- [ ] **Step 1: Write the failing test**

Create `__tests__/security_helpers.test.ts`:

```typescript
import { canProceed } from '@/app/(onboarding)/security/security.helpers';

describe('canProceed', () => {
  it('returns false when no choice has been made', () => {
    expect(canProceed(null)).toBe(false);
  });

  it('returns true for "pin"', () => {
    expect(canProceed('pin')).toBe(true);
  });

  it('returns true for "biometric"', () => {
    expect(canProceed('biometric')).toBe(true);
  });

  it('returns true for "skip"', () => {
    expect(canProceed('skip')).toBe(true);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

```bash
npx jest __tests__/security_helpers.test.ts
```

Expected: FAIL — `Cannot find module '@/app/(onboarding)/security/security.helpers'`

- [ ] **Step 3: Create `app/(onboarding)/security/security.helpers.ts`**

`canProceed` is a TypeScript type guard so the hook retains type narrowing after the check.

```typescript
import type { SecurityChoice } from '@/store/onboarding_store';

export function canProceed(selected: SecurityChoice | null): selected is SecurityChoice {
  return selected !== null;
}
```

- [ ] **Step 4: Run to verify the new tests pass**

```bash
npx jest __tests__/security_helpers.test.ts
```

Expected: PASS — 4 tests pass.

- [ ] **Step 5: Update `app/(onboarding)/security/security.hook.ts` to use the helper**

Replace the full file content with:

```typescript
import { useRouter } from 'expo-router';
import { useSecurityStore } from './security.store';
import { useOnboardingStore } from '@/store/onboarding_store';
import { backOrReplace } from '@/utils/onboarding_nav';
import type { SecurityChoice } from '@/store/onboarding_store';
import { canProceed } from './security.helpers';

export function useSecurity() {
  const router = useRouter();
  const setStep = useOnboardingStore((s) => s.setStep);
  const setSecurityChoice = useOnboardingStore((s) => s.setSecurityChoice);
  const savedChoice = useOnboardingStore((s) => s.securityChoice);
  const storeSelected = useSecurityStore((s) => s.selected);
  const setSelected = useSecurityStore((s) => s.setSelected);

  // Fall back to globally saved choice on cold start / resume
  const selected: SecurityChoice | null = storeSelected ?? savedChoice;

  const onContinue = async () => {
    if (!canProceed(selected)) return;
    await setSecurityChoice(selected);
    await setStep('O4');
    router.push('/(onboarding)/add_account');
  };

  const onBack = () => backOrReplace(router, '/(onboarding)/currency');

  return { selected, setSelected, onContinue, onBack };
}
```

- [ ] **Step 6: Run the full test suite**

```bash
npm test
```

Expected: all tests pass, no regressions.

- [ ] **Step 7: Commit**

```bash
git add __tests__/security_helpers.test.ts "app/(onboarding)/security/security.helpers.ts" "app/(onboarding)/security/security.hook.ts"
git commit -m "feat: extract security canProceed helper and add tests"
```

---

## Task 4: Test `utils/responsive.ts`

**Files:**
- Create: `__tests__/responsive.test.ts`

No changes to `utils/responsive.ts` — tests cover existing code only.

- [ ] **Step 1: Write the test**

Create `__tests__/responsive.test.ts`:

```typescript
import { PixelRatio } from 'react-native';
import { ms, msFont, responsiveScale } from '@/utils/responsive';

describe('responsiveScale', () => {
  it('is clamped within [0.85, 1.15]', () => {
    expect(responsiveScale).toBeGreaterThanOrEqual(0.85);
    expect(responsiveScale).toBeLessThanOrEqual(1.15);
  });
});

describe('ms', () => {
  it('ms(0) is always 0', () => {
    expect(ms(0)).toBe(0);
  });

  it('ms(n) returns Math.round(n * responsiveScale)', () => {
    expect(ms(16)).toBe(Math.round(16 * responsiveScale));
    expect(ms(24)).toBe(Math.round(24 * responsiveScale));
  });
});

describe('msFont', () => {
  it('msFont(n) snaps n * responsiveScale to the nearest physical pixel', () => {
    expect(msFont(14)).toBe(PixelRatio.roundToNearestPixel(14 * responsiveScale));
    expect(msFont(11)).toBe(PixelRatio.roundToNearestPixel(11 * responsiveScale));
  });
});
```

- [ ] **Step 2: Run to verify it passes**

```bash
npx jest __tests__/responsive.test.ts
```

Expected: PASS — 4 tests pass. `Dimensions` and `PixelRatio` are already mocked by `jest-expo`.

- [ ] **Step 3: Run the full test suite**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add __tests__/responsive.test.ts
git commit -m "test: add coverage for responsive.ts utilities"
```

---

## Task 5: Add coverage reporting

**Files:**
- Modify: `jest.config.js`
- Modify: `package.json`

- [ ] **Step 1: Update `jest.config.js`**

Replace the full file with:

```js
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
  ],
  modulePathIgnorePatterns: ['<rootDir>/.claude/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|react-native-reanimated))',
  ],
  collectCoverageFrom: [
    'store/**/*.ts',
    'db/**/*.ts',
    'utils/**/*.ts',
    'app/**/*.helpers.ts',
    'app/**/*.hook.ts',
    '!**/__mocks__/**',
  ],
  coverageThreshold: {
    global: { lines: 75, functions: 75, branches: 70 },
  },
};
```

- [ ] **Step 2: Add `test:coverage` script to `package.json`**

In the `"scripts"` block, add after the `"test"` line:

```json
"test:coverage": "jest --coverage"
```

The scripts block becomes:

```json
"scripts": {
  "start": "expo start",
  "android": "expo start --android",
  "ios": "expo start --ios",
  "web": "expo start --web",
  "typecheck": "tsc --noEmit",
  "lint": "expo lint",
  "lint:fix": "expo lint --fix",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "test": "jest",
  "test:coverage": "jest --coverage"
}
```

- [ ] **Step 3: Run coverage and verify thresholds pass**

```bash
npm run test:coverage
```

Expected: all tests pass and coverage summary shows:
- Lines ≥ 75%
- Functions ≥ 75%
- Branches ≥ 70%

If any threshold fails, check the uncovered branches in the coverage report (`coverage/lcov-report/index.html`) and either add a missing test case or adjust the threshold with a comment explaining why.

- [ ] **Step 4: Commit**

```bash
git add jest.config.js package.json
git commit -m "chore: add coverage reporting with thresholds"
```

---

## Task 6: Add pre-commit and pre-push quality gates

**Files:**
- Modify: `package.json` (add `lint-staged` config + `prepare` script)
- Create: `.husky/pre-commit`
- Create: `.husky/pre-push`

- [ ] **Step 1: Install husky and lint-staged**

```bash
npm install --save-dev husky lint-staged
```

- [ ] **Step 2: Initialise husky**

```bash
npx husky init
```

This creates `.husky/pre-commit` with a default `npm test` line and adds `"prepare": "husky"` to `package.json`.

- [ ] **Step 3: Replace `.husky/pre-commit` with lint-staged call**

Overwrite `.husky/pre-commit` with:

```sh
npx lint-staged
```

- [ ] **Step 4: Create `.husky/pre-push`**

Create `.husky/pre-push` with:

```sh
npm test && npm run typecheck
```

- [ ] **Step 5: Add `lint-staged` config to `package.json`**

Add the following top-level key to `package.json` (alongside `"scripts"`, `"dependencies"`, etc.):

```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

- [ ] **Step 6: Verify pre-commit hook runs correctly**

Stage any `.ts` file and run:

```bash
git add jest.config.js
npx lint-staged
```

Expected: ESLint and Prettier run on the staged file with no errors.

- [ ] **Step 7: Run the full test suite one last time**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 8: Commit everything**

```bash
git add package.json package-lock.json .husky/pre-commit .husky/pre-push
git commit -m "chore: add husky pre-commit and pre-push quality gates"
```

---

## Done

After all tasks complete, verify the full quality pipeline end-to-end:

```bash
npm run test:coverage   # all thresholds pass
npm run typecheck       # no type errors
npm run lint            # no lint errors
npm run format:check    # no formatting issues
```

Push to `chore/improve-code-quality-testing` and open a PR against `main`.
