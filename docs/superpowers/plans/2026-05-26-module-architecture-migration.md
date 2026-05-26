# Module Architecture Migration

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:subagent-driven-development` or `superpowers:executing-plans`. **Before touching any module, read its current files, plan the exact moves, and confirm the approach — do not follow stale file lists from this document.**

**Goal:** Migrate MoneyApp from a flat layout into self-contained feature modules under `modules/`, fixing HeroUI compliance and UI consistency issues as each module is touched.

**Architecture:** Each module under `modules/<name>/` owns all its concerns. Everything is internal by default. Only the public API is exposed via the module's `index.ts` barrel.

---

## Target Module Structure

Every module follows this shape (omit folders that don't apply):

```
modules/<name>/
  database/        query files for this domain's tables
  entities/        TypeScript types for DB rows (no logic)
  repositories/    data-access layer
  store/           Zustand stores
  screens/         UI screens (sub-folders per screen)
  components/      shared components owned by this module
  utils/           schemas, helpers, domain utilities
  index.ts         barrel — exports only what other modules need
```

### Stays at root (shared, no module owns it)

```
components/ui/     shared primitives (Button, Sheet, Screen, Input, etc.)
constants/         enums, theme, strings, secure_store_keys
utils/             format_amount, format_date, use_zod_form, responsive, etc.
database/migrations/
database/client.ts
database/app_settings.ts + entities/app_setting.entity.ts
repositories/app_settings.repository.ts
store/sheet_visibility.store.ts   (cross-module FAB coordination)
app/               Expo Router routing only — one-liner re-exports into modules/
```

---

## HeroUI Native — Two Mandatory Rules

### Rule 1 — HeroUI Skill (docs before code)

**Before writing or replacing any HeroUI Native component, invoke the `heroui-native` skill.**

The skill provides the authoritative docs, props, anatomy, and usage examples for every component. Do not rely on memory or existing code patterns — fetch the current docs first:

```bash
# get docs for the specific component you're about to use
node scripts/get_component_docs.mjs <ComponentName>

# list all available components
node scripts/list_components.mjs
```

This applies to: every new HeroUI component introduced, every replacement of a non-HeroUI primitive, and every new `components/ui/` wrapper built on a HeroUI primitive.

### Rule 2 — HeroUI-first building blocks (catalog audit before building)

**Before building any UI element, audit the HeroUI Native catalog.**

- **Direct component exists** → use it (or compose/wrap it — never build a parallel implementation).
- **No direct component** → build a custom one using HeroUI components as building blocks (e.g. `PressableFeedback` for pressable areas, `Text` for typography, `Surface` for surfaces).
- **Layout primitives** (`View`, flex containers) → plain RN `View` is fine — HeroUI has no layout-only equivalent.

Catalog (v1.0.3): Accordion · Alert · Avatar · BottomSheet · Button · Card · Checkbox · Chip · CloseButton · Description · Dialog · **FieldError** · Input · InputGroup · InputOTP · **Label** · LinkButton · ListGroup · Menu · Popover · **PressableFeedback** · Radio · RadioGroup · ScrollShadow · SearchField · Select · Separator · Skeleton · SkeletonGroup · Slider · **Spinner** · SubMenu · **Surface** · **Switch** · Tabs · TagGroup · **Text** · TextArea · TextField · Toast · ControlField

---

## Fix-as-You-Go Rules

Apply to **every file touched** during its module migration. Do not fix files that aren't being moved in the current step.

| Issue | Fix |
|-------|-----|
| `ActivityIndicator` from `react-native` | → `<Spinner>` from `heroui-native` — **fetch Spinner docs first** |
| `Switch` from `react-native` | → `<Switch>` from `heroui-native` — **fetch Switch docs first** (drop `trackColor`/`thumbColor`) |
| Raw `TextInput` from `react-native` | → `<Input>` from `@/components/ui/input` — **fetch Input/TextField docs first** |
| Inline error `Text` / `Animated.Text` / StyleSheet error | → `<FormErrorText message={...} />` |
| Inline label `Text` / StyleSheet label | → `<FormLabelText label={...} />` |
| Inline `SegmentedTabs<Currency>` segment definitions | → `<CurrencySelector>` from `@/modules/currency` |
| Inline `new Intl.NumberFormat(...)` | → `formatAmount()` / `formatCurrencyAmount()` from `@/utils/format_amount` |
| `<Pressable>` from `@/components/ui/pressable` | → `<PressableFeedback>` from `heroui-native` — swap `disabled` → `isDisabled`; use `animation={false}` when a parent `Animated.View` already handles the spring |

---

## Migration Order

Ordered by dependency: hubs first, spokes after. Later modules import from earlier ones via their barrels.

| Step | Module | Why this order |
|------|--------|----------------|
| 0 | **Shared foundations** | New shared components needed by all modules |
| 1 | **currency** | Smallest, no deps — establishes the migration pattern |
| 2 | **accounts** | Hub — transactions, commitments, onboarding import from it |
| 3 | **categories** | Hub — transactions, budget, commitments import from it |
| 4 | **transactions** | Spoke — depends on accounts + categories |
| 5 | **budget** | Spoke — depends on categories |
| 6 | **commitments** | Spoke — depends on accounts + categories + transactions |
| 7 | **dashboard** | Aggregator — reads from accounts, commitments, currency |
| 8 | **settings** | Shell — categories + currency screens already in their modules |
| 9 | **onboarding** | Depends on accounts + currency |
| 10 | **goals** | Stub only |

---

## Step 0 — Shared Foundations

Create these before any module migration. Every module will adopt them.

**What to create:**

| File | What | HeroUI audit result |
|------|------|---------------------|
| `constants/currency.ts` | `CURRENCY_CONFIG` + `CURRENCY_SEGMENTS` (EGP + USD metadata) | n/a — constants |
| `utils/format_amount.ts` *(extend)* | Add `formatCurrencyAmount`, `formatWithCurrencyCode`, `formatExchangeRate` | n/a — utilities |
| `components/ui/form_error_text.tsx` | Unified RHF error display — `<FormErrorText message={errors.x?.message} />` | → thin wrapper over HeroUI **`FieldError`** (`isInvalid={!!message}`) — already animated |
| `components/ui/form_label_text.tsx` | Unified form label — `<FormLabelText label="Name" isOptional />` | → thin wrapper over HeroUI **`Label`** (`isRequired={!isOptional}`) |
| `components/ui/stack_header.tsx` | Stack-screen header: back chevron + centered title + optional right slot | No HeroUI Header component → custom built on HeroUI `Text` + `PressableFeedback` |
| `components/ui/tab_header.tsx` | Tab-screen header: left title + optional subtitle + right action slots | No HeroUI Header component → custom built on HeroUI `Text` + `PressableFeedback` |

**`stack_header.tsx` props:** `title: string` · `onBack?: () => void` (defaults to `router.back()`) · `right?: React.ReactNode`

**`tab_header.tsx` props:** `title: string` · `subtitle?: React.ReactNode` · `actions?: Array<{ icon: string; onPress: () => void; accessibilityLabel: string }>`

**How to execute:** Read `constants/enums.ts`, `utils/format_amount.ts`, and `components/ui/` before writing anything. Match existing file patterns. Fetch HeroUI docs for `FieldError`, `Label`, `Text`, `PressableFeedback` before implementing the wrappers and headers.

---

## Steps 1–10 — Module Migrations

**Each module step follows this process — plan it fresh when you arrive:**

1. **Explore** — read every file currently belonging to this domain. List what moves where.
2. **Plan** — write out the exact file mapping for this module. Identify which fix-as-you-go rules apply and where.
3. **Confirm** — if anything is surprising (unexpected dependencies, files that don't fit the model, redesign needed), surface it before touching code.
4. **Execute** — `git mv` files, update imports (relative within module, `@/modules/<name>` for cross-module), update `app/` re-exports, apply fix-as-you-go rules, create `index.ts` barrel.
5. **Verify** — `npm run typecheck && npm run lint`
6. **Commit** — one commit per module.
7. **PR checkpoint** — pause and ask whether to open a PR or continue to the next module.

### Module ownership hints (non-exhaustive — verify at execution time)

**currency:** `store/currency.store.ts` · `screens/settings/currency/` · new `CurrencySelector` component

**accounts:** `database/accounts.ts` + `account_stats.ts` · `database/entities/account.entity.ts` · `repositories/account.repository.ts` · `store/account.store.ts` · `screens/accounts/` · `components/account_type_pill.tsx` · `components/sheets/account_picker_sheet.tsx` · `utils/schemas/add_account.schema.ts`

**categories:** `database/categories.ts` · `database/entities/category.entity.ts` · `repositories/category.repository.ts` · `store/category.store.ts` · `screens/settings/categories/` · `components/sheets/category_picker_sheet.tsx`

**transactions:** `database/transactions.ts` · `database/entities/transaction.entity.ts` · `repositories/transaction.repository.ts` · `store/transaction.store.ts` · `screens/transactions/` (list, detail, form, filter)

**budget:** `database/budgets.ts` + `budget_stats.ts` · `database/entities/budget.entity.ts` · `repositories/budget.repository.ts` · `store/budget.store.ts` · `screens/budget/` · `utils/schemas/budget.schema.ts`

**commitments:** `database/commitments.ts` + `commitment_payments.ts` · both entities · `repositories/commitment.repository.ts` · `store/commitment.store.ts` · `screens/commitments/` (list, add, detail, edit) · `screens/commitments/commitment_form.shared.ts` + `commitment_status.ts`

**dashboard:** `screens/dashboard/` (all files including store, components, helpers, types)

**settings:** `screens/settings/index.tsx` + `settings.hook.ts` · `screens/settings/about/` (currency + categories screens already live in their modules)

**onboarding:** `store/onboarding.store.ts` + `ready.store.ts` · `screens/onboarding/` (welcome, add_account, more_accounts, ready)

**goals:** stub only — `app/(app)/(tabs)/goals/index.tsx` stays as-is until the goals feature is built

---

## Final Cleanup (after all modules done)

- Remove empty legacy dirs (`screens/`, `repositories/`, `database/entities/`, `components/sheets/`)
- Update the Project Structure section in `CLAUDE.md`
- Run full CI parity: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci && npx --yes expo-doctor && npx expo prebuild --no-install --platform android`
