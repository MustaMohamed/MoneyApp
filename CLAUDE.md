# MoneyApp — Claude Code Project Context

## Coding Conventions

- **null vs undefined:** `null` only for DB-mapped nullable columns. Use `undefined` for all other absent values in TypeScript.
- **Enums:** All domain enums live in `constants/enums.ts` as TypeScript string enums (not `const enum` — Babel/Expo incompatible; not string union types). Validate with `z.nativeEnum()`.
- **SecureStore keys:** Always use `SecureStoreKeys.*` from `constants/secure_store_keys.ts` — never bare string literals.
- **File naming:** `snake_case` for all filenames. TypeScript identifiers (functions, hooks, types) stay `camelCase`.
- **No hardcoded numbers:** Import all sizing/spacing/color tokens from `constants/theme.ts`.
- **No hardcoded strings:** All user-visible copy lives in `constants/strings.ts`.
- **Form validation:** Use `useZodForm` from `utils/use_zod_form.hook.ts` — never import `zodResolver` directly. Zod global error map is registered once in `utils/zod_config.ts`, imported in `app/_layout.hook.ts`.

---

## What This Project Is

MoneyApp is a React Native (Expo) personal finance app. It helps users track
expenses, accounts, budgets, bills, debt, and saving goals — without connecting
to or controlling real bank accounts. All data is stored locally on device.

---

## Current Build Scope — M1 Onboarding ONLY

**You are building the onboarding flow and nothing else.**

M1 scope = screens O1 through O6:
- O1 — Welcome
- O2 — Base Currency selection
- O3 — Security setup (UI only — no actual PIN logic)
- O4 — Add First Account (form + validation + SQLite write)
- O5 — Add More Accounts (list + add another + done)
- O6 — Ready (summary + completion)

After O6, the user lands on a `PlaceholderDashboard` screen.
**Do not build any dashboard, transaction, budget, bill, or settings screens.**
Those are M1.5 scope — a separate module that has not started yet.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React Native via Expo (managed workflow) |
| Language | TypeScript (strict) |
| Navigation | Expo Router v3 (file-based routing under `app/`) |
| Local DB | expo-sqlite |
| State | Zustand v5 |
| Form | React Hook Form v7 + Zod v4 + @hookform/resolvers |
| Secure storage | expo-secure-store |
| Animation | react-native-reanimated |
| Fonts | Sora + Inter via @expo-google-fonts |
| Icons | MaterialCommunityIcons via @expo/vector-icons |
| UUID | react-native-uuid |

**Not used in M1:** axios, expo-local-authentication, expo-notifications, ExchangeRate-API. Do not install or import these.

---

## Project Structure

```
app/
  _layout.tsx                  # Expo Router root layout — useFonts, SafeAreaProvider
  _layout.hook.ts              # DB init, zod_config import, onboarding rehydration
  _layout.store.ts             # { ready, setReady }
  index.tsx                    # Thin redirect — reads global store, no local state
  dashboard/
    index.tsx                  # PlaceholderDashboard — no changes until M1.5
  (onboarding)/
    _layout.tsx                # Thin redirect on complete; reads global store only
    welcome/
      index.tsx
      welcome.anim.ts
    currency/
      index.tsx
      currency.hook.ts
      currency.store.ts
      currency.anim.ts
      components/currency_row.tsx
    security/
      index.tsx
      security.hook.ts
      security.store.ts
      security.anim.ts
      security.helpers.ts
      components/security_pill.tsx
    add_account/
      index.tsx
      add_account.hook.ts      # RHF + Zod schema factory, handleSave
      add_account.anim.ts
      components/type_pill.tsx
    more_accounts/
      index.tsx
      more_accounts.hook.ts
      more_accounts.anim.ts
      components/account_row.tsx
    ready/
      index.tsx
      ready.hook.ts
      ready.store.ts
      ready.anim.ts
      ready.helpers.ts         # computeTotalBalance, resolveSecurityLabel

components/
  progress_dots/
    index.tsx
    progress_dots.anim.ts
  geo_illustration/
    index.tsx

constants/
  enums.ts                     # All domain enums — single source of truth
  secure_store_keys.ts         # SecureStoreKeys as const object
  strings.ts                   # All user-visible copy
  theme.ts                     # Cairo Nights design tokens

store/
  onboarding.store.ts          # Step tracking, currency, security choice
  account.store.ts             # addAccount + loadAccounts

db/
  init.ts                      # Opens DB, creates accounts + app_settings tables

utils/
  onboarding_nav.ts            # backOrReplace helper
  responsive.ts                # ms(), msFont() scaling utilities
  use_first_mount_entering.hook.ts
  use_zod_form.hook.ts         # Wraps useForm + zodResolver — use this, not zodResolver directly
  zod_config.ts                # Global Zod error map

__tests__/                     # All test files in snake_case
```

### Component anatomy

Each screen folder follows a strict four-file split:

- **`index.tsx`** — UI template only. No `useState`, no `useSharedValue`. Imports from co-located `*.hook.ts` and `*.anim.ts`.
- **`<name>.hook.ts`** — Logic, RHF/Zod schema, store wiring, navigation. Calls `useZodForm`, never `zodResolver` directly.
- **`<name>.store.ts`** — Zustand for local non-form UI state. Created only when needed (`add_account` has no store — everything is in RHF). Always includes `reset()`.
- **`<name>.anim.ts`** — Reanimated shared values + animated styles only. No business logic.
- **`components/`** — Sub-components used only by this screen (colocated, not in global `components/`).

---

## Domain Enums (`constants/enums.ts`)

```typescript
export enum AccountType {
  Bank            = 'bank',
  SmartWallet     = 'smart_wallet',
  PhysicalWallet  = 'physical_wallet',
  PhysicalSavings = 'physical_savings',
  CreditCard      = 'credit_card',
}

export enum OnboardingStep { O1='O1', O2='O2', O3='O3', O4='O4', O5='O5', O6='O6' }
export enum SecurityChoice { Pin='pin', Biometric='biometric', Skip='skip' }
export enum Currency { EGP='EGP', USD='USD' }
```

Enum values match SQLite CHECK constraints exactly. Always use enum members (`AccountType.Bank`), never bare strings.

---

## SecureStore Keys (`constants/secure_store_keys.ts`)

```typescript
export const SecureStoreKeys = {
  OnboardingComplete:   'onboarding_complete',
  OnboardingStep:       'onboarding_step',
  BaseCurrency:         'base_currency',
  SecurityChoice:       'security_choice',
  SecuritySetupSkipped: 'security_setup_skipped',
} as const;
```

**Critical rule:** `OnboardingComplete` is set to `'true'` ONLY when the user taps "Open My Dashboard" on O6. Never set it earlier.

**Resume logic:** On app launch, if `OnboardingComplete !== 'true'`, read `OnboardingStep` and navigate to that screen. The user resumes exactly where they left off after a force-close.

---

## Database — M1 Tables Only

M1 creates exactly **two tables**. Do not create any other tables in M1.

```sql
CREATE TABLE IF NOT EXISTS accounts (
  id                TEXT PRIMARY KEY,
  name              TEXT NOT NULL,
  type              TEXT NOT NULL
                      CHECK(type IN ('bank','smart_wallet','physical_wallet','physical_savings','credit_card')),
  currency          TEXT NOT NULL CHECK(currency IN ('EGP','USD')),
  opening_balance   REAL NOT NULL DEFAULT 0,
  current_balance   REAL NOT NULL DEFAULT 0,
  color             TEXT,
  credit_limit      REAL,
  revolving_balance REAL,
  minimum_payment   REAL,
  statement_due_day INTEGER,
  interest_tracking INTEGER NOT NULL DEFAULT 0,
  apr               REAL,
  is_archived       INTEGER NOT NULL DEFAULT 0,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  created_at        TEXT NOT NULL,
  updated_at        TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS app_settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
```

**Rules:**
- `current_balance` = `opening_balance` on account creation
- `is_archived` = 0 on creation
- `id` = UUID v4 (react-native-uuid)
- `created_at` / `updated_at` = ISO 8601 string (`new Date().toISOString()`)
- Enable WAL mode and foreign keys on DB open

---

## Account Form — O4 Validation Rules

| Field | Rule | Error message key |
|---|---|---|
| name | Required | `Strings.errNameRequired` |
| name | Max 30 chars | `Strings.errNameTooLong` |
| name | Unique across all accounts | `Strings.errNameDuplicate` |
| balance | Required, >= 0 | `Strings.errInvalidAmount` |
| credit_limit | Required if type = credit_card | `Strings.errCreditLimitRequired` |
| apr | Required if interest_tracking = true | `Strings.errAprRequired` |

**CC conditional fields** (only shown when type = `AccountType.CreditCard`):
`revolving_balance`, `credit_limit`, `minimum_payment`, `statement_due_day`, `interest_tracking` toggle, `apr` (only shown when `interest_tracking` is true)

Schema factory pattern — schema is rebuilt when `accounts` list changes (duplicate-name check):

```typescript
const accounts = useAccountStore(s => s.accounts);
const schema = useMemo(() => createAddAccountSchema(accounts), [accounts]);
const form = useZodForm(schema, { defaultValues: { ... } });
```

---

## Design System — Cairo Nights

### Dark Mode Colors
```
bg:        #0F1923   (Midnight background)
surface:   #1A2535   (Card/input surface)
surfaceEl: #243044   (Elevated element)
border:    #2A3A4F   (Border / divider)
text1:     #F0EBE3   (Primary text)
text2:     #6B7F99   (Secondary / muted text)
gold:      #D4A44C   (Dark mode gold — display values)
positive:  #4CAF82   (Positive amounts, success)
negative:  #E05A42   (Negative, error, debt)
```

### Shared
```
cairoGold:    #C9973A   (Primary CTA background, active states)
midnightBlue: #1B2B4B   (Primary CTA text color)
```

### Fonts
- **Sora** — all numbers, headings, CTAs, account names, balances
- **Inter** — all body copy, labels, descriptions, secondary text

### Spacing scale: `Spacing.xxs/xs/sm/md/lg/xl/xxl` = 4 · 8 · 12 · 16 · 20 · 24 · 32
### Border radius: `Radius.sm/md/lg/xl/pill/cta` = 8 · 12 · 16 · 28 · 11 · 13

### CTA Button Pattern (all screens)
- Height: 52 (`Size.ctaHeight`)
- Border radius: 13 (`Radius.cta`)
- Font: Sora Bold (`FontFamily.soraBold`), size 15 (`Type.bodyStrong`)
- Background: linear-gradient(`#C9973A` → `#D4A44C`)
- Text color: `#1B2B4B`
- Fixed to bottom: `paddingTop: Spacing.xs`, `paddingHorizontal: Spacing.sm`, `paddingBottom: Spacing.md`
- Border top: `1px solid #1A2535`

All numeric values are sourced from `constants/theme.ts` and scaled via `ms()` / `msFont()` in `utils/responsive.ts`. **Never hardcode numbers — import tokens.**

---

## Animation Reference — Per Screen

### O1 Welcome — Entrance sequence
```typescript
// Illustration: FadeInDown.duration(600)
// Headline + subtext: FadeInUp.delay(400).duration(500)
// CTA button: FadeInUp.delay(600).duration(400)
```

### O2 Currency — Row selection
```typescript
// Row tap: scale 1.0 → 1.02 → 1.0 via withSequence(withTiming, withTiming)
// Gold border: withTiming(1, { duration: 200 })
// Checkmark: withSpring(1, { damping: 12, stiffness: 180 })
// Deselect: withTiming(0, { duration: 150 })
```

### O3 Security — Pill selection
```typescript
// Icon scale: withSequence(withSpring(1.08), withSpring(1.0))
// Border color: interpolateColor #2A3A4F → #C9973A via withTiming(200ms)
// "Best" badge: FadeIn.delay(300).duration(250)
```

### O4 Add Account — Conditional fields + feedback
```typescript
// Type pill tap: scale 1.0 → 1.03 → 1.0 via withSpring
// CC fields appear: entering={FadeInDown.duration(250)} exiting={FadeOutUp.duration(200)}
// APR field: entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(150)}
// Validation errors: entering={FadeInDown.duration(150)} exiting={FadeOutUp.duration(100)}
// Save button press: scale 1.0 → 0.97 → 1.0 via withSequence(withTiming(80ms), withSpring)
```

### O5 More Accounts — Stagger entrance
```typescript
// Each row: FadeInRight.delay(index * 80).duration(300)
// New row added: FadeInRight.duration(250) — no delay
```

### O6 Ready — Completion sequence
```typescript
// Checkmark ring: ZoomIn.springify().damping(10).stiffness(100)
// Headline: FadeInUp.delay(200).duration(400)
// Subtitle: FadeInUp.delay(300).duration(350)
// Summary rows: FadeInUp.delay(400 + index * 80).duration(300)
// CTA button: FadeInUp.delay(700).duration(400)
// Total sequence: ~1.4 seconds
```

### Progress Dots — On activation
```typescript
// Scale: withSequence(withSpring(1.3, {damping:8}), withSpring(1.0, {damping:12}))
// Color: interpolateColor [#243044 → #C9973A] via withTiming(200ms)
```

### Navigation — O1 special case
```typescript
// O1 → O2: animation: 'fade' (not slide_from_right)
// All other screens: default slide_from_right
```

---

## Icons — MaterialCommunityIcons (filled style)

| Location | Icon name | Color |
|---|---|---|
| O3 — Security header | `shield-account` | #C9973A |
| O3 — PIN option | `lock` | #C9973A |
| O3 — Biometric option | `fingerprint` | #378ADD |
| O3 — Skip option | `chevron-right` | #6B7F99 |
| O4 — Bank type | `bank` | #C9973A (active) / #6B7F99 |
| O4 — Smart Wallet | `cellphone-nfc` | #6B7F99 |
| O4 — Physical Wallet | `wallet` | #6B7F99 |
| O4 — Physical Savings | `piggy-bank` | #6B7F99 |
| O4 — Credit Card | `credit-card` | #6B7F99 |
| O5 — Account rows | type-matched icon | #C9973A (first) / #6B7F99 |
| O6 — Ready checkmark | `check-circle` | #4CAF82 |
| Nav — back arrow | `chevron-left` | #6B7F99 |

---

## 12 Account Color Presets (`AccountColors` in `constants/theme.ts`)

```
#1B2B4B  #C9973A  #3D7A5F  #C0442A
#4A2545  #185FA5  #D4830A  #2D7D6E
#7B3F8C  #C45C2A  #4A6FA5  #7A8B3C
```

Index 0 is the default. Selected state: 2px solid `#C9973A` border + scale 1.1.

---

## Number Formatting Rule

**ALL amounts must use `en-US` comma formatting.**

```
122300  →  122,300    ✅
1500000 →  1,500,000  ✅
1,22,300            ❌  NEVER
```

Use `Intl.NumberFormat('en-US', { style: 'decimal' })` for all balance displays.

---

## Key Business Rules

1. `OnboardingComplete` set ONLY on O6 "Open My Dashboard" tap
2. Force-close at any step → resume from that step on relaunch
3. O4 cannot be skipped — must save at least 1 account
4. O5 is fully skippable after O4 has written at least 1 account
5. EGP is pre-selected on O2 — Continue always valid
6. Security screen (O3) is UI only — no PIN entry, no biometric auth in M1
7. `current_balance` = `opening_balance` at creation time
8. Credit card = liability (negative net worth) — not calculated in M1
9. Duplicate account names are not allowed — validate in Zod schema via `superRefine`

---

## Testing

- All test files in `__tests__/` use `snake_case` naming
- Test the pure logic layer: `*.helpers.ts`, stores, `utils/responsive.ts`
- Do not test hooks via `renderHook` or UI screens — high mocking cost, deferred to M1.5
- Run coverage: `npm run test:coverage` (thresholds: 80% lines, 95% functions, 100% branches on the logic layer)

---

## Definition of Done — M1

Do not tag `m1-complete` until ALL of these pass on both Android and iOS:

- [ ] O1→O6 full flow completes without errors
- [ ] Force-close at each step → relaunch → resumes from correct step
- [ ] O6 CTA sets `onboarding_complete = true` in SecureStore AND app_settings DB
- [ ] Relaunch after O6 → PlaceholderDashboard (onboarding never shown again)
- [ ] All 5 account types can be added with correct fields
- [ ] All validation errors show inline below the correct field
- [ ] CC fields show/hide correctly based on type + interest toggle
- [ ] 12 color dots visible on O4
- [ ] O5 account rows show type icons (not colored dots)
- [ ] `accounts` and `app_settings` tables exist with correct schema
- [ ] All amounts formatted as 122,300 — never 1,22,300
- [ ] No hardcoded strings (all copy in `constants/strings.ts`)
- [ ] O1 entrance sequence plays on mount
- [ ] O2 row selection: scale pulse + gold border + checkmark spring
- [ ] O3 pill selection: border color interpolation + icon scale
- [ ] O4 CC fields animate in/out on type change
- [ ] O4 validation errors animate in/out inline
- [ ] O5 account rows stagger in on mount
- [ ] O6 completion sequence plays fully end-to-end
- [ ] Progress dots scale + interpolate color on step advance
- [ ] All animations run at 60fps on mid-range Android

---

## Notion Documentation

- PRD: https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa
- Tech Spec v1.1: https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541
- QA & Test Plan: https://app.notion.com/p/351c90e418b6817281ebde95a5eac550
- M1 Cycle Tracker: https://app.notion.com/p/351c90e418b681268bb4c033a59749a9
