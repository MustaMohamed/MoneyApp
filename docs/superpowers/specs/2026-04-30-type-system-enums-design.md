# Sub-project A — Type System & Enums Design Spec
**Date:** 2026-04-30
**Wave:** 1 (parallel with Sub-project B)
**Scope:** Convert string union types to TypeScript enums; enforce null/undefined convention

---

## Goal

Replace all string union domain types with TypeScript enums centralised in `constants/enums.ts`.
Enforce a clear null vs undefined boundary: `null` only for DB-mapped nullable columns,
`undefined` everywhere else in business logic.

---

## Null / Undefined Convention

| Context | Value | Reason |
|---|---|---|
| DB-mapped nullable columns (`Account.color`, `Account.credit_limit`, `Account.apr`, etc.) | `null` | SQLite returns `null` for NULL columns |
| All other absent/optional values in TypeScript code | `undefined` | Natural TypeScript ergonomics; `??`, `?.`, optional params |
| SecureStore boundary (`getItemAsync` returns `string \| null`) | absorb `null`, emit `undefined` | Convert at the read boundary, keep business logic `undefined`-clean |

**CLAUDE.md addition:** *"Use `null` only for DB-mapped nullable columns. Use `undefined` for all other absent values in TypeScript code."*

---

## New File: `constants/enums.ts`

Single source of truth for all domain enums. All stores, hooks, helpers, and tests import from here.

```typescript
export enum AccountType {
  Bank            = 'bank',
  SmartWallet     = 'smart_wallet',
  PhysicalWallet  = 'physical_wallet',
  PhysicalSavings = 'physical_savings',
  CreditCard      = 'credit_card',
}

export enum OnboardingStep {
  O1 = 'O1',
  O2 = 'O2',
  O3 = 'O3',
  O4 = 'O4',
  O5 = 'O5',
  O6 = 'O6',
}

export enum SecurityChoice {
  Pin       = 'pin',
  Biometric = 'biometric',
  Skip      = 'skip',
}

export enum Currency {
  EGP = 'EGP',
  USD = 'USD',
}
```

**Why regular `enum`, not `const enum`:** Expo uses Babel, which does not support `const enum`
inlining. Regular enums compile to a runtime object and are safe.

---

## Files to Modify

### `store/account.store.ts`
- Remove `AccountType` union type definition
- Import `AccountType`, `Currency` from `@/constants/enums`
- `Account.currency` field: `'EGP' | 'USD'` → `Currency`
- `Account.type` field: already uses `AccountType` — update import source only

### `store/onboarding.store.ts`
- Remove `OnboardingStep`, `SecurityChoice`, `Currency` union type definitions
- Import all three from `@/constants/enums`
- `OnboardingState.securityChoice`: `SecurityChoice | null` → `SecurityChoice | undefined`
- `useOnboardingStore` initial state: `securityChoice: null` → `securityChoice: undefined`
- Simplify guard functions (see below)
- `loadOnboardingState`: missing/invalid SecureStore values → `undefined` (not `null`)

### Guard Functions (onboarding.store.ts)

Before:
```typescript
function isOnboardingStep(v: string | null): v is OnboardingStep {
  return v === 'O1' || v === 'O2' || v === 'O3' || v === 'O4' || v === 'O5' || v === 'O6';
}
function isCurrency(v: string | null): v is Currency {
  return v === 'EGP' || v === 'USD';
}
function isSecurityChoice(v: string | null): v is SecurityChoice {
  return v === 'pin' || v === 'biometric' || v === 'skip';
}
```

After:
```typescript
function isOnboardingStep(v: string | null): v is OnboardingStep {
  return Object.values(OnboardingStep).includes(v as OnboardingStep);
}
function isCurrency(v: string | null): v is Currency {
  return Object.values(Currency).includes(v as Currency);
}
function isSecurityChoice(v: string | null): v is SecurityChoice {
  return Object.values(SecurityChoice).includes(v as SecurityChoice);
}
```

### `app/(onboarding)/add_account/add_account.hook.ts`
- Remove import of `AccountType` from `@/store/account.store`
- Add import of `AccountType`, `Currency` from `@/constants/enums`
- Update string literal comparisons to enum members:
  - `selected_type === 'credit_card'` → `selected_type === AccountType.CreditCard` (used in Zod schema refinements for conditional CC field validation)

### `app/(onboarding)/security/security.helpers.ts`
- Remove import of `SecurityChoice` from `@/store/onboarding.store`
- Import `SecurityChoice` from `@/constants/enums`
- `canProceed` return type and logic unchanged

### `app/(onboarding)/ready/ready.helpers.ts`
- Remove import of `SecurityChoice` from `@/store/onboarding.store`
- Import `SecurityChoice` from `@/constants/enums`
- `resolveSecurityLabel`: replace string literal comparisons with enum members
  - `choice === 'skip'` → `choice === SecurityChoice.Skip`

### Hook files (currency.hook.ts, security.hook.ts, more_accounts.hook.ts, ready.hook.ts, _layout.hook.ts)
- Update imports of `Currency`, `SecurityChoice`, `OnboardingStep` to come from `@/constants/enums`

### Screen files (index.tsx in each onboarding screen)
- Update any string literal comparisons against enum values to use enum members
- Update local type references (`type RowConfig = { code: Currency; ... }` etc.)

### Test files
- `__tests__/account.store.test.ts` — update `type: 'bank' as const` → `type: AccountType.Bank`
- `__tests__/onboarding.store.test.ts` — update step/currency/securityChoice literals
- `__tests__/add_account.schema.test.ts` — update `selected_type: 'bank'` → `AccountType.Bank`
- `__tests__/ready.helpers.test.ts` — update securityChoice string literals
- `__tests__/security.helpers.test.ts` — update choice string literals

### `db/init.ts`
- No changes. CHECK constraints use raw strings (`'bank'`, `'EGP'`). Enum values serialise
  to their string form so constraints are satisfied unchanged. SQLite reads are cast with
  `as Account` — safe because constraints guarantee values match enum members.

---

## Null/Undefined Changes Summary

| Field / Variable | Before | After |
|---|---|---|
| `OnboardingState.securityChoice` | `SecurityChoice \| null` | `SecurityChoice \| undefined` |
| Initial store state `securityChoice` | `null` | `undefined` |
| `loadOnboardingState` → missing security choice | `null` | `undefined` |
| `Account.color` | `string \| null` | unchanged |
| `Account.credit_limit` | `number \| null` | unchanged |
| `Account.revolving_balance` | `number \| null` | unchanged |
| `Account.minimum_payment` | `number \| null` | unchanged |
| `Account.statement_due_day` | `number \| null` | unchanged |
| `Account.apr` | `number \| null` | unchanged |

---

## Testing

No new test files needed. Existing tests updated to use enum members instead of string literals.
`npm run typecheck` is the primary validation — TypeScript will catch any missed reference.
`npm test` confirms no runtime regressions.

---

## Out of Scope

- `interest_tracking: 0 | 1` and `is_archived: 0 | 1` — SQLite integer booleans, not domain enums. Left as-is.
- Sub-project C (repository layer) will handle the DB read boundary mapping properly.
  For now, `getAllAsync<Account>()` casts with `as Account`.
