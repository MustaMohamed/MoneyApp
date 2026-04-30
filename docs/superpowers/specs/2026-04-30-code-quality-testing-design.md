# Code Quality & Stability — Design Spec
**Date:** 2026-04-30
**Scope:** M1 onboarding logic layer — test expansion + quality tooling

---

## Goal

Improve quality and stability by:
1. Extracting testable pure logic from hooks into colocated `.helpers.ts` files
2. Writing tests for those helpers, plus the untested `utils/responsive.ts`
3. Renaming existing test files to match the project's `snake_case` convention
4. Adding coverage reporting with thresholds
5. Adding pre-commit and pre-push quality gates via `husky` + `lint-staged`

---

## Naming Conventions

| Pattern | Rule |
|---|---|
| `*.helpers.ts` | Feature-scoped helpers, colocated with the feature |
| `utils/*.ts` | Generic, cross-feature shared utilities |
| `__tests__/*.test.ts` | All test files in `snake_case` |

---

## Section 1 — Extractions & New Tests

### 1a. `app/(onboarding)/ready/ready.helpers.ts`

Extract two pure functions from `ready.hook.ts`:

```typescript
export function computeTotalBalance(accounts: Account[]): number
// accounts.reduce((sum, a) => sum + a.opening_balance, 0)

export function resolveSecurityLabel(choice: SecurityChoice | null): string
// null | 'skip' → Strings.o6SecuritySkipped; 'pin' | 'biometric' → Strings.o6SecurityEnabled
```

`ready.hook.ts` imports these instead of inlining them. No behavior change.

**Test file:** `__tests__/ready_helpers.test.ts`

| Case | Assertion |
|---|---|
| `computeTotalBalance([])` | → `0` |
| single account, balance 5000 | → `5000` |
| two accounts, 1000 + 500 | → `1500` |
| `resolveSecurityLabel(null)` | → `Strings.o6SecuritySkipped` |
| `resolveSecurityLabel('skip')` | → `Strings.o6SecuritySkipped` |
| `resolveSecurityLabel('pin')` | → `Strings.o6SecurityEnabled` |
| `resolveSecurityLabel('biometric')` | → `Strings.o6SecurityEnabled` |

---

### 1b. `app/(onboarding)/security/security.helpers.ts`

Extract one pure function from `security.hook.ts`:

```typescript
export function canProceed(selected: SecurityChoice | null): boolean
// selected === null → false; any valid choice → true
```

`security.hook.ts` calls `canProceed(selected)` instead of inlining the check.

**Test file:** `__tests__/security_helpers.test.ts`

| Case | Assertion |
|---|---|
| `canProceed(null)` | → `false` |
| `canProceed('pin')` | → `true` |
| `canProceed('biometric')` | → `true` |
| `canProceed('skip')` | → `true` |

---

### 1c. `utils/responsive.ts` — new tests only, no changes to source

Uses the exported `responsiveScale` constant as ground truth rather than hardcoding a mock width.

**Test file:** `__tests__/responsive.test.ts`

| Case | Assertion |
|---|---|
| `ms(0)` | → `0` |
| `ms(n)` | → `Math.round(n * responsiveScale)` |
| `msFont(n)` | → `PixelRatio.roundToNearestPixel(n * responsiveScale)` |
| `responsiveScale` | within `[0.85, 1.15]` |

`Dimensions` and `PixelRatio` are already mocked by `jest-expo` — no extra setup needed.

---

### 1d. Test file renames (snake_case alignment)

| Old | New |
|---|---|
| `__tests__/onboardingStore.test.ts` | `__tests__/onboarding_store.test.ts` |
| `__tests__/accountStore.test.ts` | `__tests__/account_store.test.ts` |
| `__tests__/numberFormat.test.ts` | `__tests__/number_format.test.ts` |
| `__tests__/add_account_schema.test.ts` | unchanged |
| `__tests__/schema.test.ts` | unchanged |

---

## Section 2 — Quality Tooling

### 2a. Coverage reporting

Add to `jest.config.js`:

```js
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
```

Add to `package.json` scripts:

```json
"test:coverage": "jest --coverage"
```

UI screens (`.tsx`) are excluded — coverage measures the logic layer only. Thresholds are conservative to be achievable immediately, tightened as coverage grows.

---

### 2b. Pre-commit & pre-push gates

**Dependencies (dev):** `husky`, `lint-staged`

**pre-commit** — runs `lint-staged` (fast):
```json
"lint-staged": {
  "*.{ts,tsx}": ["eslint --fix", "prettier --write"]
}
```

**pre-push** — runs full test suite + type check:
```bash
npm test && npm run typecheck
```

`tsc --noEmit` is whole-project and slow — it belongs on pre-push alongside tests, not pre-commit.

---

## Out of Scope

- Hook tests via `renderHook` (high mocking cost, low signal for glue hooks)
- `currency.hook.ts`, `more_accounts.hook.ts`, `add_account.hook.ts` hooks — logic is either trivial or already tested via the schema
- UI component tests — M1.5+ scope
- Dashboard, transaction, budget screens — not built yet
