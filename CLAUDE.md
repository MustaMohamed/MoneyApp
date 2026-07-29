# MoneyApp

React Native (Expo) personal finance app — local-only, no bank connections.

## Workflow

**Always branch before any work. Never commit to `main`.** (`feat/x`, `refactor/x`, `fix/x`, `perf/x`)

**Autonomous team mode.** The team runs work end-to-end without per-step check-ins. The user is consulted at exactly three points: the **spec sign-off gate**, the **device QA gate**, and the **critical triggers** below. Sarah approves plans on the user's behalf; Tariq returns review verdicts and merge recommendations. **Merge, push, and destructive repository operations always require an explicit user request.**

**CI parity before pushing to a PR branch** — run the chain in `Commands`. CI is the last line of defence, not the first.

## Team

Five personas. Dispatch `@name` (subagent, `.claude/agents/`) for file-producing work; use `[name]` inline (`moneyapp-expert-panel` skill) for advisory consults. Detailed phase mechanics live in Sarah's agent file — skills are authoritative for each phase, personas contribute content.

- **sarah** — orchestration lead: sequences phases, approves plans, owns escalation
- **marcus** — product designer: flows, screens, design system
- **layla** — financial domain: formulas, rules, categories
- **tariq** — technical lead: architecture, plans, review verdicts + merge recommendations
- **dev** — implements per approved plan only; no code without a signed-off spec and Sarah-approved plan

Flow: brainstorm → design doc (`docs/superpowers/specs/YYYY-MM-DD-{feature}-design.md`) → 🛑 **spec sign-off** → plan (`docs/superpowers/plans/YYYY-MM-DD-{feature}.md`, Sarah approves) → execute in an isolated git worktree → code review (Tariq recommends) → 🛑 **device QA** (only the user can walk it).

Domain sovereignty: product/UX → marcus · financial logic → layla · architecture/review → tariq · implementation → dev · sequencing → sarah. Vague request → push back and disambiguate before building. Routine disagreements: the responsible lead decides and records the rationale.

### Critical triggers (wake the user; everywhere else proceed)

1. Product/domain disagreement Marcus and Layla cannot resolve
2. Cross-section impact — a decision binds a future section non-obviously
3. High blast radius — feature-flag flip, V1 deletion, migration with data-loss risk
4. New dependency, native code change, anything outside the established stack
5. User-facing copy with voice/branding weight (field labels and error messages stay team-decided)
6. Scope balloon vs the original brief
7. Auth / secure store / data-loss surface
8. Manual device QA — always

Not critical (team decides): field-level UX, naming, file structure, test approach, code style, sequencing within a section, hex→token swaps, a11y polish, minor dep bumps.

## Tech Stack

Expo (bare workflow via expo-dev-client) · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · expo-secure-store · react-native-reanimated v4 + react-native-worklets · @gorhom/bottom-sheet@^5.2.14 (HeroUI `BottomSheet` engine) · **HeroUI Native v1.0.3 + Unistyles 3 (via Uniwind)** · tailwindcss v4 (CSS-first, no `tailwind.config.js`) · tailwind-variants · Sora + Inter (`@expo-google-fonts`) · MaterialCommunityIcons · `react-native-uuid` · patch-package · oxlint v1 (sole linter) · oxfmt beta (sole formatter) · oxlint-tsgolint (type-aware linting)

## Commands

```bash
npx expo prebuild --clean && npx expo run:android   # local dev build
eas build --profile development --platform android  # cloud dev build
```

**Pre-push CI parity** — mirrors `.github/workflows/pr-checks.yml` step-for-step; stops on first failure. Fix and re-run from the top until green, then push.

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green — safe to push"
```

Gotcha: `expo-doctor` validates against Expo's **live** requirement table, so it can go red with zero commits when Expo moves an SDK requirement. If it fails on a version you didn't touch, that's why — fix with `npx expo install --check` or `expo.install.exclude`.

## Project Structure

```
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
__tests__/            snake_case tests — policy: logic-only .ts (legacy .tsx render tests exist, slated for cleanup)
```

New domain work belongs under `src/modules/<domain>/` using the existing module shape: `database/`, `repositories/`, `store/`, `screens/`, optional `components/`. No `data/` folder. Root `src/store/`, `src/repositories/`, and most `src/database/` domain files are compatibility surfaces — do not add new consumers.

### app/ rules (critical)

- Only `_layout.tsx` and `index.tsx` live here. Exception: `[id]/index.tsx`.
- Every route `index.tsx` is a one-line re-export from the canonical module screen: `export { default } from '@/modules/<domain>/screens/<path>';`
- **Never** colocate `*.hook.ts` / `*.anim.ts` / `*.store.ts` / `*.helpers.ts` next to a route — Expo Router registers every `.ts/.tsx` as a route; files without a default export crash.
- **Never** name a sibling of `_layout.tsx` like `_layout.<anything>.ts` — Expo strips the extension and splits on `.`, silently overwriting `_layout.tsx` in prod builds.

### module screen anatomy

Each folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav, no useState) · `<name>.store.ts` (data — omit if none) · `<name>.state.ts` (UI state — omit if none) · `<name>.anim.ts` (Reanimated only) · `components/`. Sub-screens follow the same anatomy, imported from parent `index.tsx`. Files: `snake_case`. TS identifiers: `camelCase`.

**Zustand store/state shape:** reactive values as top-level fields, actions as top-level functions. `set({ x: v })` for top-level partial updates; functional `set((s) => ...)` only when the next value reads current state; spread nested objects only when updating nested fields. `reset()` is `set(INITIAL_STATE)` or `set(initialState())`. Consumers group reactive reads with `useShallow` and read actions outside render via `useStore.getState().action`. Screen hooks return `{ state: { ...reactive }, ...flat actions }`.

Avoid `Promise.try()` until Hermes support is verified — use explicit `try`/`catch` around `fn(...args)` and normalize with `Promise.resolve(result)`.

## Expo Dev Client (critical)

`expo-dev-client` is required (Unistyles 3 + HeroUI Native need native code). All deps must survive `expo prebuild`; never add Expo Go-only constraints. `ios/` and `android/` are gitignored — regenerated by `npx expo prebuild --clean`. New Architecture (Fabric) is enabled via `expo-build-properties` in `app.json`.

## Styling

HeroUI Native composes Tailwind classes into Unistyles 3 styles at build time via Uniwind. Theme lives in `global.css` as CSS variables (`@theme inline`); Tailwind v4 is CSS-first — no `tailwind.config.js`.

- `cn(...)`: `import { cn } from 'heroui-native'` (no local `cn.ts`). Variants: `tv` from `tailwind-variants`.
- Theme slots: `bg-background`, `text-foreground`, `bg-surface`, `border-separator`, `text-muted`, `text-danger`, … — see `global.css`.
- Runtime hex (account swatches): `style={{ backgroundColor: hex }}` — `className` is build-time only.
- Module-level theme access (outside React): import `Colors`/`GoldTokens`/`CoreTokens` from `constants/theme_tokens.ts`.

### Screen layout (critical gotcha)

**Every full-screen route uses `<Screen>`/`<ScreenScroll>` from `@/components/ui/screen` — never raw `SafeAreaView`.** Uniwind's `flex-1` className does not propagate reliably through `SafeAreaView` on Android Fabric — it collapses the flex chain and breaks all child layouts. `Screen` bakes `flex: 1` into the `style` prop instead. Same rule inside: use `style={{ flex: 1 }}` / `style={{ flexDirection: 'row' }}` for layout-critical containers; keep `className` for colors, padding, gap, typography.

## Components — HeroUI Native (binding: Team Law 7)

**Use a HeroUI Native component wherever one exists — never hand-roll or pull a third-party equivalent.** Building a custom component a HeroUI primitive could cover is a **critical trigger**: sign-off plus a written "no HeroUI primitive fits" justification. Compose/wrap a primitive that almost fits; never build parallel. Standing non-HeroUI exceptions (layout/effect pieces HeroUI lacks): `Screen`/`ScreenScroll`, `HeroShell`, `FAB`, SVG textures — extend that list only with sign-off.

The installed catalog, component docs, `Sheet` wrapper API, and BottomSheet patterns live in the **`heroui-native` skill** — load it before building any UI. Component docs are also at `node_modules/heroui-native/src/components/<name>/<name>.md`.

Bottom-sheet gotchas (the ones that bite):

- `BottomSheet` is declarative (`isOpen` + `onOpenChange`). Handle close via `onOpenChange` — the inner `Content.onClose` only fires on swipe-down, not overlay-press / close-button / programmatic close.
- Scrollables inside sheets come from `@gorhom/bottom-sheet` (`BottomSheetScrollView`/`BottomSheetFlatList`), NOT `react-native`; set `enableOverDrag={false}`, `enableDynamicSizing={false}`, fixed height via `contentContainerClassName="h-full"`.
- Keyboard-aware inputs: `useBottomSheetAwareHandlers()` on `onFocus`/`onBlur` + `keyboardBehavior="extend"` on `Content`.
- Every sheet goes through `components/ui/sheet.tsx` (HeroUI-backed) or HeroUI `BottomSheet` directly. `@gorhom/bottom-sheet` stays in the tree only as HeroUI's rendering engine — never hand-roll a gorhom wrapper.

## Conventions

- **null vs undefined:** `null` = DB-mapped nullable columns only. Absent values elsewhere = `undefined`.
- **Enums:** string enums in `constants/enums.ts` — regular `enum`, not `const enum` (Babel incompatible). Values match SQLite CHECK strings. Validate with `z.nativeEnum()`.
- **Tokens:** all sizing/spacing/radius/color from `constants/theme.ts`, scaled with `ms()`/`msFont()`. Never hardcode.
- **Strings:** all user-visible copy in `constants/strings.ts`.
- **SecureStore keys:** centralised in `constants/secure_store_keys.ts` as `as const`.

## Database Layer

- **Migrations** (`database/migrations/`): one file per DDL change, `NNN_<description>.ts`, exports `{ version, up }`, `CREATE TABLE IF NOT EXISTS`, append to `migrations/index.ts`. **Never edit a shipped migration.**
- **Entities** (`database/entities/`): types only — no logic, no cross-imports from `database/`; may import `@/constants/enums`.
- **Query files** (`database/<domain>.ts`): SQL for one table; first param always `db: SQLiteDatabase`. Verbs: `get*` SELECT · `add*` INSERT · `set*` INSERT OR REPLACE/UPDATE · `update*` UPDATE · `delete*` DELETE. Business logic lives in stores, not queries.
- **Client** (`database/client.ts`): `getDb()` singleton — WAL + foreign keys on. `runMigrations(db)` runs once at startup from `utils/use_layout_init.hook.ts`.
- Account creation defaults: `current_balance = opening_balance`, `is_archived = 0`, `id = uuidv4()`, `created_at = updated_at = new Date().toISOString()`.

## Business Rules

1. `OnboardingComplete` set only on "Open My Dashboard" tap (N4 — flow is N1 welcome → N2 add account → N3 more accounts → N4 ready).
2. Force-close during onboarding → resume from that step on relaunch. Legacy `O*` steps migrate to N1 on first launch.
3. N2 requires ≥1 saved account before proceeding.
4. N3 is skippable once N2 wrote an account.
5. EGP pre-selected on N1 — base currency is chosen in the welcome step.
6. `current_balance = opening_balance` at account creation.
7. Credit card accounts are liabilities (negative net-worth).
8. Account names are unique across all accounts.

## Design System — Cairo Nights

All values in `constants/theme.ts`. Never hardcode.

- **Typography:** Sora (numbers, headings, CTAs) · Inter (body, labels, secondary).
- **Numbers:** `Intl.NumberFormat('en-US', { style: 'decimal' })` → `122,300`.
- **CTA:** `Size.ctaHeight` (52) · `Radius.cta` (13) · gold gradient on midnight-blue text.

## Notion Docs

[PRD](https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa) · [Tech Spec v1.1](https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541) · [QA & Test Plan](https://app.notion.com/p/351c90e418b6817281ebde95a5eac550) · [M1 Cycle Tracker](https://app.notion.com/p/351c90e418b681268bb4c033a59749a9)
