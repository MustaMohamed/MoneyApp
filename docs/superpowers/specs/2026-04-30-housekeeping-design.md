# Sub-project B — Housekeeping Design Spec
**Date:** 2026-04-30
**Wave:** 1 (parallel with Sub-project A)
**Scope:** SecureStore key constants + screen sub-component extraction

---

## Goal

Two independent housekeeping improvements with no logic changes:
1. Replace SecureStore string key literals with typed constants
2. Extract screen-local sub-components into colocated `components/` subfolders

---

## Part 1 — SecureStore Key Constants

### New File: `constants/secure_store_keys.ts`

```typescript
export const SecureStoreKeys = {
  OnboardingComplete:   'onboarding_complete',
  OnboardingStep:       'onboarding_step',
  BaseCurrency:         'base_currency',
  SecurityChoice:       'security_choice',
  SecuritySetupSkipped: 'security_setup_skipped',
} as const;
```

`as const` gives each value a literal type — typos caught at compile time.

### Files to Modify

**`store/onboarding.store.ts`** — the only file that calls SecureStore.

Replace all 9 string key literals:

| Call site | Before | After |
|---|---|---|
| `setStep` | `'onboarding_step'` | `SecureStoreKeys.OnboardingStep` |
| `setBaseCurrency` | `'base_currency'` | `SecureStoreKeys.BaseCurrency` |
| `setSecurityChoice` (×2) | `'security_choice'`, `'security_setup_skipped'` | `SecureStoreKeys.SecurityChoice`, `SecureStoreKeys.SecuritySetupSkipped` |
| `completeOnboarding` | `'onboarding_complete'` | `SecureStoreKeys.OnboardingComplete` |
| `loadOnboardingState` (×4) | all four key strings | all four constants |

No logic changes. No new behaviour.

---

## Part 2 — Sub-component Extraction

### Rule

If a component is used only within one screen and not shared, it lives in a `components/`
subfolder inside that screen's folder. One component per file, `snake_case.tsx`.

### Extraction Map

| Component | Current location | New location |
|---|---|---|
| `CurrencyRow` | `app/(onboarding)/currency/index.tsx` | `app/(onboarding)/currency/components/currency_row.tsx` |
| `SecurityPill` | `app/(onboarding)/security/index.tsx` | `app/(onboarding)/security/components/security_pill.tsx` |
| `TypePill` | `app/(onboarding)/add_account/index.tsx` | `app/(onboarding)/add_account/components/type_pill.tsx` |
| `AccountRow` | `app/(onboarding)/more_accounts/index.tsx` | `app/(onboarding)/more_accounts/components/account_row.tsx` |

### What Moves With Each Component

Each component file gets:
- The component function itself
- Local types used **only** by that component:
  - `CurrencyRow` → takes `RowConfig` with it (used only by `CurrencyRow`)
  - `SecurityPill` → takes `PillConfig` with it (used only by `SecurityPill`)
  - `TypePill` → takes `TypeOption` with it (used only by `TypePill`)
  - `AccountRow` → `IconName` type (if only used by `AccountRow`)
- Animation values/styles that belong exclusively to the component

Shared types (used by both the screen and the sub-component) stay in `index.tsx` and are
imported by the component file.

### Import Update

Each screen's `index.tsx` adds:
```typescript
import { CurrencyRow } from './components/currency_row';
// etc.
```

### Folder Structure After

```
app/(onboarding)/
├── currency/
│   ├── components/
│   │   └── currency_row.tsx
│   ├── index.tsx            (CurrencyScreen only)
│   ├── currency.anim.ts
│   ├── currency.hook.ts
│   └── currency.store.ts
├── security/
│   ├── components/
│   │   └── security_pill.tsx
│   ├── index.tsx            (SecurityScreen only)
│   ├── security.anim.ts
│   ├── security.hook.ts
│   ├── security.store.ts
│   └── security.helpers.ts
├── add_account/
│   ├── components/
│   │   └── type_pill.tsx
│   ├── index.tsx            (AddAccountScreen only)
│   ├── add_account.anim.ts
│   └── add_account.hook.ts
└── more_accounts/
    ├── components/
    │   └── account_row.tsx
    ├── index.tsx            (MoreAccountsScreen only)
    ├── more_accounts.anim.ts
    └── more_accounts.hook.ts
```

---

## Testing

No new tests needed. No logic changes.
`npm run typecheck` catches any broken imports.
`npm test` confirms no regressions.

---

## Out of Scope

- `welcome/` and `ready/` screens — single component each, nothing to extract
- Shared components (`progress_dots`, `geo_illustration`) — already in top-level `components/`, no change
