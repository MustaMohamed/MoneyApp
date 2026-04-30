# MoneyApp — Project Reference

## Workflow Rules

- **Always create a new git branch before starting any new work.** Never commit directly to `main`. Every feature, refactor, or fix gets its own branch (e.g., `refactor/database-module`, `feat/transactions`). Create and switch to the branch before making any file changes.

---

MoneyApp is a React Native (Expo) personal finance app for tracking expenses, accounts, budgets, bills, debt, and saving goals. All data is stored locally on device — no bank connections.

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

---

## Project Structure

```
app/
  _layout.tsx                  # Expo Router root layout — useFonts, SafeAreaProvider
  _layout.hook.ts              # DB init, zod_config import, onboarding rehydration
  _layout.store.ts             # { ready, setReady }
  index.tsx                    # Thin redirect — reads global store
  dashboard/
    index.tsx                  # PlaceholderDashboard
  (onboarding)/
    _layout.tsx
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
      add_account.hook.ts
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
      ready.helpers.ts

components/
  progress_dots/
    index.tsx
    progress_dots.anim.ts
  geo_illustration/
    index.tsx

constants/
  enums.ts                     # All domain enums
  secure_store_keys.ts         # SecureStoreKeys as const
  strings.ts                   # All user-visible copy
  theme.ts                     # Cairo Nights design tokens

store/
  onboarding.store.ts
  account.store.ts

database/
  migrations/
    001_create_accounts.ts       # { version: 1, up: 'CREATE TABLE IF NOT EXISTS accounts ...' }
    002_create_app_settings.ts   # { version: 2, up: 'CREATE TABLE IF NOT EXISTS app_settings ...' }
    index.ts                     # export const MIGRATIONS = [migration001, migration002]
  entities/
    account.entity.ts            # Account interface (DB column representation)
    app_setting.entity.ts        # AppSetting interface
  accounts.ts                    # getAccounts(db), addAccount(db, data)
  app_settings.ts                # getSetting(db, key), setSetting(db, key, value)
  client.ts                      # getDb(), runMigrations(db)

utils/
  onboarding_nav.ts
  responsive.ts                # ms(), msFont() scaling
  use_first_mount_entering.hook.ts
  use_zod_form.hook.ts         # useForm + zodResolver wrapper
  zod_config.ts                # Global Zod error map (imported once in _layout.hook.ts)

__tests__/                     # snake_case filenames
```

### Component anatomy

Each screen folder has up to four files with strict responsibilities:

- **`index.tsx`** — UI template. No `useState`, no `useSharedValue`. Wires together hook and anim outputs.
- **`<name>.hook.ts`** — Logic, RHF/Zod schema, store reads, navigation. Uses `useZodForm` from `utils/use_zod_form.hook.ts`.
- **`<name>.store.ts`** — Zustand for local non-form UI state only. Includes `reset()`. Omitted when not needed (`add_account` has none — form state lives entirely in RHF).
- **`<name>.anim.ts`** — Reanimated shared values and animated styles. No business logic.
- **`components/`** — Sub-components used only by this screen, colocated here rather than in global `components/`.

File naming is `snake_case`. TypeScript identifiers are `camelCase`.

---

## Conventions

**null vs undefined:** `null` is used only for DB-mapped nullable columns. Everywhere else in TypeScript code, absent values are `undefined`.

**Enums:** All domain enums are TypeScript string enums in `constants/enums.ts` (regular `enum`, not `const enum` — Babel/Expo incompatible). Enum values match SQLite CHECK constraint strings exactly. Zod validation uses `z.nativeEnum()`.

**SecureStore keys:** All key strings are centralised in `constants/secure_store_keys.ts` as a typed `as const` object.

**Tokens:** All sizing, spacing, radius, and color values come from `constants/theme.ts`, scaled by `ms()` / `msFont()` in `utils/responsive.ts`.

**Strings:** All user-visible copy lives in `constants/strings.ts`.

---

## Database Layer Conventions

### Migrations (`database/migrations/`)

- One file per DDL operation. Naming: `NNN_<description>.ts` (zero-padded, e.g. `001`, `002`).
- Every migration exports `{ version: number, up: string }`.
- Every `CREATE TABLE` statement must use `IF NOT EXISTS` — migrations are idempotent.
- `migrations/index.ts` exports `MIGRATIONS` as an ordered array — append new entries here when adding a migration.
- The migration runner (`client.ts`) tracks applied versions in a `schema_migrations` table (`version` INTEGER PK, `applied_at` TEXT).
- Never edit an already-shipped migration. Add a new numbered file instead.

```typescript
// migrations/001_create_accounts.ts
export const migration001 = {
  version: 1,
  up: `CREATE TABLE IF NOT EXISTS accounts (...);`,
};
```

### Entities (`database/entities/`)

- Type definitions only — no logic, no functions.
- No imports from other `database/` files. May import from `@/constants/enums`.
- File naming: `<domain>.entity.ts` (e.g. `account.entity.ts`).
- These are the DB representation layer — fields and types mirror the SQLite columns exactly.

### Query Executor Files (`database/<domain>.ts`)

- Each file owns all SQL for one domain table (e.g. `accounts.ts` → `accounts` table).
- Functions receive `db: SQLiteDatabase` as their first parameter — no internal `getDb()` calls.
- Verb convention:

| Verb | SQL operation |
|---|---|
| `get*` | SELECT |
| `add*` | INSERT |
| `set*` | INSERT OR REPLACE / UPDATE |
| `update*` | UPDATE |
| `delete*` | DELETE |

- These are **not** repositories. They execute SQL and return typed results. Business logic lives in the store layer (or a future repository layer).

### Client (`database/client.ts`)

- Owns the `getDb()` singleton and `runMigrations(db)`.
- `getDb()` opens `moneyapp.db`, enables WAL mode and foreign keys, returns the same promise on repeat calls.
- `runMigrations(db)` is called once at app startup in `_layout.hook.ts`.

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

`OnboardingComplete` is set to `'true'` only when the user taps "Open My Dashboard" on O6.

On app launch, if `OnboardingComplete !== 'true'`, the app reads `OnboardingStep` and resumes from that screen.

---

## Database Schema

Two tables. WAL mode and foreign keys enabled on open.

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

On account creation: `current_balance = opening_balance`, `is_archived = 0`, `id` = UUID v4, timestamps = `new Date().toISOString()`.

---

## Account Form — Validation Rules

| Field | Rule | Error key |
|---|---|---|
| name | Required | `Strings.errNameRequired` |
| name | Max 30 chars | `Strings.errNameTooLong` |
| name | Unique across accounts | `Strings.errNameDuplicate` |
| balance | Required, >= 0 | `Strings.errInvalidAmount` |
| credit_limit | Required when `type = CreditCard` | `Strings.errCreditLimitRequired` |
| apr | Required when `interest_tracking = true` | `Strings.errAprRequired` |

CC-only fields (visible when `type = AccountType.CreditCard`): `revolving_balance`, `credit_limit`, `minimum_payment`, `statement_due_day`, `interest_tracking` toggle. `apr` additionally requires `interest_tracking = true`.

Schema factory — rebuilt when `accounts` list changes (duplicate-name check):

```typescript
const schema = useMemo(() => createAddAccountSchema(accounts), [accounts]);
const form = useZodForm(schema, { defaultValues: { ... } });
```

---

## Business Rules

1. `OnboardingComplete` set only on O6 "Open My Dashboard" tap
2. Force-close at any step → resume from that step on relaunch
3. O4 requires saving at least 1 account before proceeding
4. O5 is skippable once O4 has written an account
5. EGP is pre-selected on O2
6. O3 security setup is UI only — no actual PIN or biometric logic
7. `current_balance = opening_balance` at creation
8. Credit card accounts are liabilities (negative net worth contribution)
9. Account names are unique across all accounts

---

## Design System — Cairo Nights

### Colors
```
bg:          #0F1923   Midnight background
surface:     #1A2535   Card / input surface
surfaceEl:   #243044   Elevated element
border:      #2A3A4F   Border / divider
text1:       #F0EBE3   Primary text
text2:       #6B7F99   Secondary / muted text
gold:        #D4A44C   Display values
cairoGold:   #C9973A   CTAs, active states
positive:    #4CAF82   Positive amounts
negative:    #E05A42   Errors, debt
midnightBlue:#1B2B4B   CTA text
```

### Typography
- **Sora** — numbers, headings, CTAs, account names, balances
- **Inter** — body copy, labels, descriptions, secondary text

### Scale
- Spacing: `xxs/xs/sm/md/lg/xl/xxl` = 4 · 8 · 12 · 16 · 20 · 24 · 32
- Radius: `sm/md/lg/xl/pill/cta` = 8 · 12 · 16 · 28 · 11 · 13

### CTA Button
- Height: `Size.ctaHeight` (52)
- Radius: `Radius.cta` (13)
- Font: `FontFamily.soraBold`, `Type.bodyStrong` (15)
- Background: `linear-gradient(#C9973A → #D4A44C)`
- Text: `#1B2B4B`
- Bottom bar: `paddingTop: Spacing.xs`, `paddingHorizontal: Spacing.sm`, `paddingBottom: Spacing.md`, `borderTopColor: #1A2535`

### Number formatting
All amounts use `en-US` comma formatting: `Intl.NumberFormat('en-US', { style: 'decimal' })`.
`122300 → 122,300` ✅ `1,22,300` ❌

---

## Animation Reference

### O1 Welcome
```typescript
// Illustration: FadeInDown.duration(600)
// Headline + subtext: FadeInUp.delay(400).duration(500)
// CTA: FadeInUp.delay(600).duration(400)
```

### O2 Currency — row selection
```typescript
// Row tap: scale 1.0 → 1.02 → 1.0 via withSequence(withTiming, withTiming)
// Gold border: withTiming(1, { duration: 200 })
// Checkmark: withSpring(1, { damping: 12, stiffness: 180 })
// Deselect: withTiming(0, { duration: 150 })
```

### O3 Security — pill selection
```typescript
// Icon scale: withSequence(withSpring(1.08), withSpring(1.0))
// Border color: interpolateColor #2A3A4F → #C9973A, withTiming(200ms)
// "Best" badge: FadeIn.delay(300).duration(250)
```

### O4 Add Account
```typescript
// Type pill tap: scale 1.0 → 1.03 → 1.0 via withSpring
// CC fields: entering={FadeInDown.duration(250)} exiting={FadeOutUp.duration(200)}
// APR field: entering={FadeInDown.duration(200)} exiting={FadeOutUp.duration(150)}
// Errors: entering={FadeInDown.duration(150)} exiting={FadeOutUp.duration(100)}
// Save press: scale 1.0 → 0.97 → 1.0 via withSequence(withTiming(80ms), withSpring)
```

### O5 More Accounts
```typescript
// Existing rows: FadeInRight.delay(index * 80).duration(300)
// New row: FadeInRight.duration(250)
```

### O6 Ready
```typescript
// Checkmark: ZoomIn.springify().damping(10).stiffness(100)
// Headline: FadeInUp.delay(200).duration(400)
// Subtitle: FadeInUp.delay(300).duration(350)
// Summary rows: FadeInUp.delay(400 + index * 80).duration(300)
// CTA: FadeInUp.delay(700).duration(400)
```

### Progress Dots
```typescript
// Scale: withSequence(withSpring(1.3, {damping:8}), withSpring(1.0, {damping:12}))
// Color: interpolateColor [#243044 → #C9973A], withTiming(200ms)
```

### Navigation
```typescript
// O1 → O2: animation: 'fade'
// All other transitions: default slide_from_right
```

---

## Icons — MaterialCommunityIcons (filled)

| Location | Icon | Color |
|---|---|---|
| O3 header | `shield-account` | #C9973A |
| O3 PIN | `lock` | #C9973A |
| O3 Biometric | `fingerprint` | #378ADD |
| O3 Skip | `chevron-right` | #6B7F99 |
| O4 Bank | `bank` | #C9973A active / #6B7F99 |
| O4 Smart Wallet | `cellphone-nfc` | #6B7F99 |
| O4 Physical Wallet | `wallet` | #6B7F99 |
| O4 Physical Savings | `piggy-bank` | #6B7F99 |
| O4 Credit Card | `credit-card` | #6B7F99 |
| O5 rows | type-matched | #C9973A first / #6B7F99 |
| O6 checkmark | `check-circle` | #4CAF82 |
| Back arrow | `chevron-left` | #6B7F99 |

---

## Account Color Presets

`AccountColors` in `constants/theme.ts` — 12 values, index 0 is the default:

```
#1B2B4B  #C9973A  #3D7A5F  #C0442A
#4A2545  #185FA5  #D4830A  #2D7D6E
#7B3F8C  #C45C2A  #4A6FA5  #7A8B3C
```

Selected state: 2px `#C9973A` border, scale 1.1.

---

## Testing

Test files live in `__tests__/` with `snake_case` names. The test layer covers pure logic: `*.helpers.ts`, stores, and `utils/responsive.ts`. Coverage: `npm run test:coverage` — thresholds 80% lines / 95% functions / 100% branches on the logic layer.

---

## Notion Documentation

- PRD: https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa
- Tech Spec v1.1: https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541
- QA & Test Plan: https://app.notion.com/p/351c90e418b6817281ebde95a5eac550
- M1 Cycle Tracker: https://app.notion.com/p/351c90e418b681268bb4c033a59749a9
