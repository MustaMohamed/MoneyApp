# Architecture

## Project Structure

```text
src/app/              ROUTING ONLY — _layout.tsx and index.tsx files only
src/modules/<domain>/ canonical feature code: database, repositories, store, screens, components
src/components/ui/    shared UI primitives and wrappers
src/components/       legacy/shared compatibility wrappers only
src/constants/        enums.ts · secure_store_keys.ts · strings.ts · theme.ts
src/store/            backward-compat re-exports; avoid new consumers
src/repositories/     backward-compat re-exports plus shared app settings repo
src/database/         client.ts · migrations/ · compatibility query/entity stubs
src/test_helpers/     test-only helpers imported through @/test_helpers
src/utils/            responsive.ts · use_zod_form.hook.ts · use_layout_init.hook.ts · onboarding_nav.ts
patches/              patch-package diffs for third-party library fixes
__tests__/            snake_case test files (logic layer only)
```

New domain work belongs under `src/modules/<domain>/` using the existing module shape: `database/`, `repositories/`, `store/`, `screens/`, and optional `components/`. Do not introduce a `data/` folder. Root `src/store/`, `src/repositories/`, and most `src/database/` domain files are compatibility surfaces for old import paths; do not add new module consumers to those roots.

### src/app/ rules (critical)

- Only `_layout.tsx` and `index.tsx` live here. Exception: `[id]/index.tsx`.
- Every route `index.tsx` is a one-line re-export from the canonical module screen, for example: `export { default } from '@/modules/<domain>/screens/<path>';`
- **Never** colocate `*.hook.ts` / `*.anim.ts` / `*.store.ts` / `*.helpers.ts` next to a route — Expo Router registers every `.ts/.tsx` as a route; files without a default export crash.
- **Never** name a sibling of `_layout.tsx` like `_layout.<anything>.ts` — Expo strips the extension and splits on `.`, silently overwriting `_layout.tsx` in prod builds.

### module screen anatomy

Each module screen folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav, no useState) · `<name>.store.ts` (data: form drafts, selections, fetched results — omit if none) · `<name>.state.ts` (UI state: visibility, loading, errors, tab selection — omit if none) · `<name>.anim.ts` (Reanimated only) · `components/` (per-component `.state.ts` lives next to its `.tsx` when the component had local state)

Sub-screens (non-route drawers like `transactions/filter/`) follow the same anatomy, imported from parent `index.tsx`.

Files: `snake_case`. TS identifiers: `camelCase`.

**Legacy Zustand store/state shape:** Existing `.store.ts` and `.state.ts` Zustand stores expose reactive values as top-level fields; actions stay as top-level functions. Use `set({ x: v })` for top-level partial updates; use functional `set((s) => ({ x: s.x + 1 }))` only when the next value reads current state. Spread nested objects only when updating nested fields, for example `set((s) => ({ draft: { ...s.draft, x: v } }))`. `reset()` is `set(INITIAL_STATE)` or `set(initialState())`. Consumers group reactive reads with `useStore(useShallow((s) => ({ x: s.x, y: s.y })))` and read actions outside render with `useStore.getState().action`. Screen hooks still return `{ state: { ...reactive values... }, ...flat actions }`; screen consumers destructure `state` and read fields via `state.x`.

**Signals rollback:** `@preact/signals-react` and its Babel transform are not installed. Reintroducing Signals requires a new approved plan, dependency change, and migration guidance update.

Avoid `Promise.try()` in helpers until Hermes support is verified. For sync/async wrapping that must invoke the function immediately, use explicit `try`/`catch` around `fn(...args)` and then normalize the returned value with `Promise.resolve(result)`.

## Conventions

- **null vs undefined:** `null` = DB-mapped nullable columns only. Absent values elsewhere = `undefined`.
- **Enums:** String enums in `src/constants/enums.ts` — regular `enum`, not `const enum` (Babel incompatible). Values match SQLite CHECK strings. Validate with `z.nativeEnum()`.
- **Tokens:** All sizing/spacing/radius/color from `src/constants/theme.ts`, scaled with `ms()` / `msFont()`. Never hardcode hex/spacing/radius.
- **Strings:** All user-visible copy in `src/constants/strings.ts`.
- **SecureStore keys:** Centralised in `src/constants/secure_store_keys.ts` as `as const`.

## Database Layer

**Migrations** (`src/database/migrations/`): One file per DDL change, named `NNN_<description>.ts`. Exports `{ version, up }`. `CREATE TABLE IF NOT EXISTS`. Append to `migrations/index.ts`. **Never edit a shipped migration.**

**Entities** (`src/database/entities/<domain>.entity.ts`): Types only — no logic, no functions, no cross-imports from `src/database/`. May import from `@/constants/enums`.

**Query files** (`src/database/<domain>.ts`): SQL for one table. First param always `db: SQLiteDatabase`. Verbs: `get*` SELECT · `add*` INSERT · `set*` INSERT OR REPLACE/UPDATE · `update*` UPDATE · `delete*` DELETE. Business logic lives in stores, not here.

**Client** (`src/database/client.ts`): `getDb()` singleton — opens `moneyapp.db`, enables WAL + foreign keys. `runMigrations(db)` called once at startup from `src/utils/use_layout_init.hook.ts`.

Account creation defaults: `current_balance = opening_balance`, `is_archived = 0`, `id = uuidv4()`, `created_at = updated_at = new Date().toISOString()`.

## Business Rules

1. `OnboardingComplete` set only on "Open My Dashboard" tap (N4 — the 4-step flow is N1 welcome → N2 add account → N3 more accounts → N4 ready).
2. Force-close during onboarding → resume from that step on relaunch. Legacy `O*` steps persisted before the §2 V2 promotion migrate to N1 on first launch.
3. N2 (Add Account) requires ≥1 saved account before proceeding.
4. N3 (More Accounts) is skippable once N2 wrote an account.
5. EGP pre-selected on N1 — base currency is chosen in the welcome step.
6. `current_balance = opening_balance` at account creation.
7. Credit card accounts are liabilities (negative net-worth).
8. Account names are unique across all accounts.
