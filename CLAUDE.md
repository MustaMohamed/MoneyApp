# MoneyApp — Project Reference

MoneyApp is a React Native (Expo) personal finance app — local-only data, no bank connections. Tracks expenses, accounts, budgets, bills, debt, and saving goals.

## Workflow Rules

- **Always create a new git branch before any new work.** Never commit to `main`. One branch per feature/refactor/fix (e.g. `feat/transactions`, `refactor/database-module`).

## Tech Stack

Expo (managed) · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · React Hook Form v7 + Zod v4 · expo-secure-store · react-native-reanimated · Sora + Inter (`@expo-google-fonts`) · MaterialCommunityIcons · `react-native-uuid`.

---

## Project Structure

The codebase splits **routing** from **screen code**. `app/` is what Expo Router scans; `screens/` is where the actual UI lives. This prevents Expo Router's `require.context` from registering colocated `.ts` files as routes.

```
app/        ROUTING ONLY — only _layout.tsx and index.tsx files
screens/    UI, hooks, stores, anims, helpers, components per screen
components/ globally shared components
constants/  enums.ts · secure_store_keys.ts · strings.ts · theme.ts
store/      Zustand stores (one per domain)
database/   client.ts · migrations/ · entities/ · <domain>.ts query files
utils/      responsive.ts · use_zod_form.hook.ts · use_layout_init.hook.ts · onboarding_nav.ts
__tests__/  snake_case test files for the logic layer
```

### Routing convention (`app/`)

- **Only** `_layout.tsx` and `index.tsx` files live under `app/`. Dynamic segments like `[id]/index.tsx` are the one exception.
- Every `index.tsx` in `app/` is a one-line wrapper: `export { default } from '@/screens/<path>';`
- **Never** colocate `*.hook.ts` / `*.anim.ts` / `*.store.ts` / `*.helpers.ts` / `components/*.tsx` next to a route. Expo Router's `require.context` registers every `.ts`/`.tsx` in `app/` as a route — files without a default export crash.
- **Never** name a sibling of `_layout.tsx` like `_layout.<anything>.ts`. Expo Router strips the extension and splits on `.`, so `_layout.hook.ts` is treated as a layout file and silently overwrites `_layout.tsx` in production builds. Layout helpers go in `utils/` or `store/`.

### Screen anatomy (`screens/`)

Each screen folder has up to four files plus a `components/` subfolder:

- **`index.tsx`** — UI template. `export default function ScreenName()`. No `useState`, no `useSharedValue`. Wires together hook + anim outputs.
- **`<name>.hook.ts`** — Logic, RHF/Zod schema, store reads, navigation. Uses `useZodForm` from `utils/use_zod_form.hook.ts`.
- **`<name>.store.ts`** — Zustand for local non-form UI state only. Includes `reset()`. Omitted when not needed (form state lives in RHF).
- **`<name>.anim.ts`** — Reanimated shared values + animated styles. No business logic.
- **`components/`** — Sub-components used only by this screen.

Sub-screens that aren't separate routes (drawers like `transactions/filter/`, `transactions/transaction_form/`) follow the same anatomy and are imported from their parent's `index.tsx`.

Files are `snake_case`. TypeScript identifiers are `camelCase`.

---

## Conventions

- **null vs undefined:** `null` is reserved for DB-mapped nullable columns. Everywhere else, absent values are `undefined`.
- **Enums:** TypeScript string enums in `constants/enums.ts` — regular `enum`, not `const enum` (Babel/Expo incompatible). Values match SQLite CHECK constraint strings exactly. Validate with `z.nativeEnum()`.
- **SecureStore keys:** All keys centralised in `constants/secure_store_keys.ts` as a typed `as const` object.
- **Tokens:** All sizing, spacing, radius, color values come from `constants/theme.ts`, scaled by `ms()` / `msFont()` from `utils/responsive.ts`.
- **Strings:** All user-visible copy lives in `constants/strings.ts`.

---

## Database Layer

### Migrations (`database/migrations/`)

- One file per DDL change. Naming `NNN_<description>.ts` (zero-padded).
- Each migration exports `{ version: number, up: string }`.
- Every `CREATE TABLE` uses `IF NOT EXISTS` — migrations are idempotent.
- `migrations/index.ts` exports `MIGRATIONS` as an ordered array — append new entries here.
- Runner tracks applied versions in `schema_migrations` (`version` PK INTEGER, `applied_at` TEXT).
- **Never edit a shipped migration.** Add a new numbered file.

### Entities (`database/entities/`)

Type-only DB representation. No logic, no functions, no imports from other `database/` files. May import from `@/constants/enums`. One `<domain>.entity.ts` per table.

### Query executors (`database/<domain>.ts`)

Each file owns the SQL for one table. Functions take `db: SQLiteDatabase` as the first parameter — no internal `getDb()` calls. Verb convention:

| Verb | SQL |
|---|---|
| `get*` | SELECT |
| `add*` | INSERT |
| `set*` | INSERT OR REPLACE / UPDATE |
| `update*` | UPDATE |
| `delete*` | DELETE |

These are not repositories — they execute SQL and return typed results. Business logic lives in stores.

### Client (`database/client.ts`)

`getDb()` is a singleton — opens `moneyapp.db`, enables WAL + foreign keys, returns the same promise on repeat calls. `runMigrations(db)` is called once at startup from `utils/use_layout_init.hook.ts`.

### Account row defaults at creation

`current_balance = opening_balance`, `is_archived = 0`, `id = uuidv4()`, `created_at = updated_at = new Date().toISOString()`.

---

## Business Rules

1. `OnboardingComplete` flag is set only when the user taps "Open My Dashboard" on O6.
2. Force-close at any onboarding step → resume from that step on relaunch.
3. O4 requires saving at least 1 account before proceeding.
4. O5 is skippable once O4 has written an account.
5. EGP is pre-selected on O2.
6. O3 security setup is UI only — no actual PIN or biometric logic yet.
7. `current_balance = opening_balance` at account creation.
8. Credit card accounts are liabilities (negative net-worth contribution).
9. Account names are unique across all accounts.

---

## Design System — Cairo Nights

All values in `constants/theme.ts`. Never hardcode hex/spacing/radius — import from theme and scale with `ms()` / `msFont()`.

- **Typography:** Sora (numbers, headings, CTAs, balances) · Inter (body, labels, secondary).
- **Number formatting:** `Intl.NumberFormat('en-US', { style: 'decimal' })` — `122,300` not `1,22,300`.
- **CTA button:** `Size.ctaHeight` (52), `Radius.cta` (13), gold gradient on midnight-blue text.

---

## Testing

Test files live in `__tests__/` (`snake_case`). Coverage targets the logic layer only — `*.helpers.ts`, stores, `utils/responsive.ts`.

```
npm run test:coverage    # thresholds: 80% lines / 95% functions / 100% branches
```

---

## Notion Documentation

- [PRD](https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa)
- [Tech Spec v1.1](https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541)
- [QA & Test Plan](https://app.notion.com/p/351c90e418b6817281ebde95a5eac550)
- [M1 Cycle Tracker](https://app.notion.com/p/351c90e418b681268bb4c033a59749a9)
