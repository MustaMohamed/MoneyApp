# MoneyApp

React Native (Expo) personal finance app — local-only, no bank connections.

## Workflow

**Always branch before any work.** Never commit to `main`. (`feat/x`, `refactor/x`, `fix/x`)

## The Team (Specialist Roles)

Work runs through the superpowers skill flow. These personas contribute domain expertise during specific phases — they do not replace the skills.

**Two access surfaces, one persona:**
- `@name` — dispatch as a **subagent** (isolated context, dedicated tools, parallel-capable, can write files). Use for heavy or isolated work.
- `[name]` — activate persona **inline** in the main thread (advisory stance, mid-conversation, no file writes). Use for quick consultations.

Subagent definitions live in `.claude/agents/`. Inline personas live in `.claude/skills/moneyapp-expert-panel/SKILL.md`. Keep them in sync when persona content changes.

The five personas:

- **sarah** — Orchestrator & PM. Routes work, sequences phases, enforces the superpowers gates (plan approval, code review). Single point of contact for the human.
- **marcus** — Product Designer & Strategist. Owns product direction, user flows, screen specs, design system. Contributes during brainstorming and design.
- **layla** — Financial Domain Expert. Owns financial formulas, rules, categories. Contributes financial spec content during design.
- **tariq** — Technical Team Lead. Owns architecture, libraries, performance. Synthesizes design docs and leads code review.
- **dev** — Senior React Native Developer. Implements per the approved plan.

## How the Team Plugs Into Superpowers

Phase mapping (skills are authoritative — personas contribute to their outputs):

1. **Brainstorm** — `anthropic-skills:brainstorming` · @marcus + @layla shape product + financial intent.
2. **Design doc** — `docs/superpowers/specs/YYYY-MM-DD-{feature}-design.md` · @tariq synthesizes; embeds @marcus's UX and @layla's formulas.
3. **Plan** — `anthropic-skills:writing-plans` · @tariq writes; lands in `docs/superpowers/plans/YYYY-MM-DD-{feature}.md`.
4. 🛑 **Plan approval** (superpowers gate) — human approves before execution.
5. **Execute** — `anthropic-skills:executing-plans` or `subagent-driven-development` · @dev implements.
6. 🛑 **Code review** (superpowers gate) — `anthropic-skills:requesting-code-review` with @tariq's lens.

## Team Laws

1. **Domain Sovereignty.** Product/UX → @marcus · Financial logic → @layla · Architecture → @tariq · Implementation → @dev · Sequencing → @sarah. No persona overrides another's domain. Conflicts surface to the human.
2. **Refuse Ambiguity.** Vague request → push back, do not guess. (Use `anthropic-skills:brainstorming` to disambiguate.)
3. **No skipping superpowers gates.** Plan approval and code review are non-negotiable; @sarah holds the line.
4. **No code without an approved plan.** @dev does not start until step 4 (plan approval) clears.

## Tech Stack

Expo (bare workflow via expo-dev-client) · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · expo-secure-store · react-native-reanimated v4 + react-native-worklets · **HeroUI Native v1.0 + Unistyles 3 (via Uniwind)** · tailwindcss v4 (CSS-first, no `tailwind.config.js`) · tailwind-variants · react-native-actions-sheet (patched; deferred retirement in §3) · Sora + Inter (`@expo-google-fonts`) · MaterialCommunityIcons · `react-native-uuid` · patch-package

## Commands

```bash
npx expo prebuild --clean && npx expo run:android   # local dev build
eas build --profile development --platform android  # cloud dev build
npm run test:coverage   # thresholds: 80% lines / 95% functions / 100% branches
```

## Project Structure

```
app/        ROUTING ONLY — _layout.tsx and index.tsx files only
screens/    UI per screen (hook, store, state, anim, components/)
components/ globally shared components
constants/  enums.ts · secure_store_keys.ts · strings.ts · theme.ts
store/      Zustand stores (one per domain)
database/   client.ts · migrations/ · entities/ · <domain>.ts
utils/      responsive.ts · use_zod_form.hook.ts · use_layout_init.hook.ts · onboarding_nav.ts
patches/    patch-package diffs for third-party library fixes
__tests__/  snake_case test files (logic layer only)
```

### app/ rules (critical)

- Only `_layout.tsx` and `index.tsx` live here. Exception: `[id]/index.tsx`.
- Every `index.tsx` is a one-liner: `export { default } from '@/screens/<path>';`
- **Never** colocate `*.hook.ts` / `*.anim.ts` / `*.store.ts` / `*.helpers.ts` next to a route — Expo Router registers every `.ts/.tsx` as a route; files without a default export crash.
- **Never** name a sibling of `_layout.tsx` like `_layout.<anything>.ts` — Expo strips the extension and splits on `.`, silently overwriting `_layout.tsx` in prod builds.

### screens/ anatomy

Each folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav, no useState) · `<name>.store.ts` (data: form drafts, selections, fetched results — omit if none) · `<name>.state.ts` (UI state: visibility, loading, errors, tab selection — omit if none) · `<name>.anim.ts` (Reanimated only) · `components/` (per-component `.state.ts` lives next to its `.tsx` when the component had local state)

Sub-screens (non-route drawers like `transactions/filter/`) follow the same anatomy, imported from parent `index.tsx`.

Files: `snake_case`. TS identifiers: `camelCase`.

**Store/state shape:** Both `.store.ts` and `.state.ts` Zustand stores wrap their values under a single `state: { ... }` object; setters and `reset` stay flat. Setters spread the previous state: `set((s) => ({ state: { ...s.state, x: v } }))`. `reset()` is `set({ state: INITIAL_STATE })`. Hooks return `{ state: { ...reactive values... }, ...flat actions }`; consumers destructure `state` and read fields via `state.x`.

## Expo Dev Client (critical)

`expo-dev-client` is required (Unistyles 3 + HeroUI Native need native code). All dependencies must be compatible with `expo prebuild`. Never add Expo Go-only constraints.

Daily dev loop:

```bash
npx expo prebuild --clean   # generate ios/ and android/ (once, or after native dep changes)
npx expo run:android        # local build + launch
npx expo run:ios            # local build + launch
eas build --profile development --platform android   # cloud dev build
```

`ios/` and `android/` are gitignored — regenerated by `expo prebuild`. New Architecture (Fabric) is enabled via `expo-build-properties` in `app.json`.

## Styling

HeroUI Native composes Tailwind classes (`className=`) into Unistyles 3 styles at build time via Uniwind. Theme lives in `global.css` as CSS variables under `@layer theme { @variant dark { ... } }`, exposed to Tailwind via `@theme inline`. There is no `tailwind.config.js` — Tailwind v4 is CSS-first.

- `cn(...)` utility: `import { cn } from 'heroui-native'`. There is no `utils/cn.ts`.
- Theme color slots: `bg-background`, `text-foreground`, `bg-surface`, `bg-default`, `border-border`, `border-separator`, `text-accent`, `text-muted`, `text-danger`, etc. See `global.css` for the full list.
- Variant composition: `import { tv } from 'tailwind-variants'` for opinionated wrappers in `components/ui/`.
- Runtime hex (e.g. account swatches): pass `style={{ backgroundColor: hex }}` — `className` is build-time only.
- Module-level theme access (`SystemUI.setBackgroundColorAsync`, `expo-linear-gradient` colors, `MaterialCommunityIcons` color prop): import `Colors` / `GoldTokens` / `CoreTokens` from `constants/theme_tokens.ts` directly (cannot use `useThemeColor` hook outside React).

### Screen layout (critical)

**Use `<Screen>` and `<ScreenScroll>` from `@/components/ui/screen` for every full-screen route.** Do not use `SafeAreaView` from `react-native-safe-area-context` directly.

Uniwind's `flex-1` className does not propagate reliably through `SafeAreaView`'s wrapper on Android Fabric — using it as the root with `className="flex-1"` collapses the flex chain and breaks all child layouts. `Screen` bakes `flex: 1` into the `style` prop instead, fixing the issue.

```tsx
import { Screen, ScreenScroll } from '@/components/ui/screen';

<Screen>
  <Header />
  <ScreenScroll>
    {/* content */}
  </ScreenScroll>
  <Box className="border-t border-separator pt-2 px-4 pb-6">{/* CTA */}</Box>
</Screen>
```

`Screen` defaults: `edges={['top', 'bottom']}`, `bg-background`. Override via `edges`/`className` props.
`ScreenScroll` defaults: `style={{ flex: 1 }}`, `contentContainerStyle={{ flexGrow: 1 }}`.

Same rule for inner flex-row/flex-1 rows: when in doubt, use `style={{ flexDirection: 'row' }}` / `style={{ flex: 1 }}` for layout-critical containers rather than `className="flex-row"` / `className="flex-1"`. Keep `className` for colors, padding, gap, typography.

## Bottom Sheets — `react-native-actions-sheet`

- Patched via `patch-package` (see `patches/`). The patch fixes a first-open sizing bug where the library initialized internal dimensions to `{-1, -1}`.
- **Scrollable components inside ActionSheet** must be imported from `react-native-actions-sheet`, not from `react-native`. The sheet's gesture handler intercepts touch events, so standard RN `FlatList`/`ScrollView` won't scroll. Use: `import ActionSheet, { FlatList } from 'react-native-actions-sheet';`
- `useBottomSafeAreaPadding={false}` on all sheets to prevent double padding.

## Patches

`patch-package` auto-applies on `npm install` via the `postinstall` script. Patch files live in `patches/`. Never edit a shipped patch — create a new one if the fix needs updating.

## Conventions

- **null vs undefined:** `null` = DB-mapped nullable columns only. Absent values elsewhere = `undefined`.
- **Enums:** String enums in `constants/enums.ts` — regular `enum`, not `const enum` (Babel incompatible). Values match SQLite CHECK strings. Validate with `z.nativeEnum()`.
- **Tokens:** All sizing/spacing/radius/color from `constants/theme.ts`, scaled with `ms()` / `msFont()`. Never hardcode hex/spacing/radius.
- **Strings:** All user-visible copy in `constants/strings.ts`.
- **SecureStore keys:** Centralised in `constants/secure_store_keys.ts` as `as const`.

## Database Layer

**Migrations** (`database/migrations/`): One file per DDL change, named `NNN_<description>.ts`. Exports `{ version, up }`. `CREATE TABLE IF NOT EXISTS`. Append to `migrations/index.ts`. **Never edit a shipped migration.**

**Entities** (`database/entities/<domain>.entity.ts`): Types only — no logic, no functions, no cross-imports from `database/`. May import from `@/constants/enums`.

**Query files** (`database/<domain>.ts`): SQL for one table. First param always `db: SQLiteDatabase`. Verbs: `get*` SELECT · `add*` INSERT · `set*` INSERT OR REPLACE/UPDATE · `update*` UPDATE · `delete*` DELETE. Business logic lives in stores, not here.

**Client** (`database/client.ts`): `getDb()` singleton — opens `moneyapp.db`, enables WAL + foreign keys. `runMigrations(db)` called once at startup from `utils/use_layout_init.hook.ts`.

Account creation defaults: `current_balance = opening_balance`, `is_archived = 0`, `id = uuidv4()`, `created_at = updated_at = new Date().toISOString()`.

## Business Rules

1. `OnboardingComplete` set only on "Open My Dashboard" tap (O6).
2. Force-close during onboarding → resume from that step on relaunch.
3. O4 requires ≥1 saved account before proceeding.
4. O5 is skippable once O4 wrote an account.
5. EGP pre-selected on O2.
6. O3 security is UI only — no real PIN/biometric yet.
7. `current_balance = opening_balance` at account creation.
8. Credit card accounts are liabilities (negative net-worth).
9. Account names are unique across all accounts.

## Design System — Cairo Nights

All values in `constants/theme.ts`. Never hardcode.

- **Typography:** Sora (numbers, headings, CTAs) · Inter (body, labels, secondary).
- **Numbers:** `Intl.NumberFormat('en-US', { style: 'decimal' })` → `122,300`.
- **CTA:** `Size.ctaHeight` (52) · `Radius.cta` (13) · gold gradient on midnight-blue text.

## Notion Docs

[PRD](https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa) · [Tech Spec v1.1](https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541) · [QA & Test Plan](https://app.notion.com/p/351c90e418b6817281ebde95a5eac550) · [M1 Cycle Tracker](https://app.notion.com/p/351c90e418b681268bb4c033a59749a9)
