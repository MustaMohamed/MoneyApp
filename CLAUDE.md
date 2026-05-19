# MoneyApp

React Native (Expo) personal finance app — local-only, no bank connections.

## Workflow

**Always branch before any work.** Never commit to `main`. (`feat/x`, `refactor/x`, `fix/x`)

**Autonomous team mode (default).** The team runs work end-to-end without per-step human check-ins. The user is the product owner, not the gatekeeper — they are consulted only at the *spec sign-off* gate, the *device QA* gate, and on the **critical triggers** listed below. Everywhere else, Sarah and Tariq approve on the user's behalf and the team proceeds.

**Run local CI parity before every push to a PR.** The six CI jobs on `.github/workflows/pr-checks.yml` (format check, lint, typecheck, unit tests, expo-doctor, Android prebuild dry-run) must all pass locally before any `git push` that targets a PR branch. CI is the last line of defence, not the first — pushing red wastes action minutes, stalls reviewers, and (worst) hides the actual failure under retries. The one-liner is in `Commands` below.

## The Team (Specialist Roles)

Work runs through the superpowers skill flow. These personas contribute domain expertise during specific phases — they do not replace the skills.

**Leads:** **sarah** (orchestration) and **tariq** (technical) are the user's approval proxies. They approve plans and code reviews on the user's behalf and escalate only when a critical trigger fires.

**Two access surfaces, one persona:**
- `@name` — dispatch as a **subagent** (isolated context, dedicated tools, parallel-capable, can write files). Use for heavy or isolated work.
- `[name]` — activate persona **inline** in the main thread (advisory stance, mid-conversation, no file writes). Use for quick consultations.

Subagent definitions live in `.claude/agents/`. Inline personas live in `.claude/skills/moneyapp-expert-panel/SKILL.md`. Keep them in sync when persona content changes.

The five personas:

- **sarah** — Orchestration lead. Routes work, sequences phases, approves plans on the user's behalf, holds the critical-trigger line.
- **marcus** — Product Designer & Strategist. Owns product direction, user flows, screen specs, design system. Contributes during brainstorming and design.
- **layla** — Financial Domain Expert. Owns financial formulas, rules, categories. Contributes financial spec content during design.
- **tariq** — Technical lead. Owns architecture, libraries, performance. Synthesizes design docs. Approves code reviews on the user's behalf.
- **dev** — Senior React Native Developer. Implements per the approved plan.

## How the Team Plugs Into Superpowers

Phase mapping (skills are authoritative — personas contribute to their outputs):

1. **Brainstorm** — `anthropic-skills:brainstorming` · @marcus + @layla shape product + financial intent. Sarah orchestrates internally — no per-question user check-ins.
2. **Design doc** — `docs/superpowers/specs/YYYY-MM-DD-{feature}-design.md` · @tariq synthesizes; embeds @marcus's UX and @layla's formulas.
3. 🛑 **Spec sign-off (user-facing gate)** — Sarah presents the finished spec to the user before plan-writing begins. The only brainstorm/spec touchpoint with the human.
4. **Plan** — `anthropic-skills:writing-plans` · @tariq writes; lands in `docs/superpowers/plans/YYYY-MM-DD-{feature}.md`. **Sarah approves on the user's behalf.** No user check-in unless a critical trigger fires.
5. **Execute** — `anthropic-skills:executing-plans` or `subagent-driven-development` · @dev implements.
6. **Code review** — `anthropic-skills:requesting-code-review` with @tariq's lens. **Tariq approves and merges on the user's behalf.** No user check-in unless a critical trigger fires.
7. 🛑 **Device QA gate (user-facing)** — only the user can walk the manual QA matrix on a real device. Always escalated.

### Critical triggers (when to wake the user)

Sarah/Tariq escalate immediately when any of the following fires. Everywhere else: proceed without asking.

1. **Genuine product/domain disagreement** that Marcus and Layla together cannot resolve.
2. **Cross-section impact** — a decision in the current section binds a future section in a non-obvious way.
3. **High blast radius PR** — feature-flag flip, V1 deletion, schema migration with data-loss risk.
4. **New dependency, native code change, or anything outside the established stack.**
5. **User-facing copy with voice/branding weight** — headers, marketing, onboarding hero copy. Field labels and error messages stay team-decided.
6. **Scope balloon** — section materially exceeds the original brief (Sarah's judgment; written justification at escalation).
7. **Auth / secure store / data-loss risk** — anything touching this surface.
8. **Manual device QA** — always escalated; only the user can walk it.

**Not critical** (team decides without asking): UX field-level details, component naming, file structure, test approach, code style, lint rules, wave/PR sequencing within a section, hex→token swaps, a11y polish, dependency minor bumps.

## Team Laws

1. **Domain Sovereignty.** Product/UX → @marcus · Financial logic → @layla · Architecture → @tariq · Implementation → @dev · Sequencing → @sarah. No persona overrides another's domain.
2. **Refuse Ambiguity.** Vague request → push back, do not guess. (Use `anthropic-skills:brainstorming` to disambiguate.)
3. **Leads approve, not the user.** Sarah approves plans. Tariq approves and merges code reviews. The user is consulted only at the spec sign-off gate, the device QA gate, and on critical triggers — never at routine plan/review checkpoints.
4. **No code without an approved plan.** @dev does not start until the spec is signed off and Sarah has approved the plan.
5. **Escalate critical triggers, write down the rest.** When a critical trigger fires, Sarah surfaces it to the user with a recommendation. When personas disagree at the routine level, the responsible lead (Sarah for scope, Tariq for tech) decides and records the rationale in the design doc or PR description.

## Tech Stack

Expo (bare workflow via expo-dev-client) · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · expo-secure-store · react-native-reanimated v4 + react-native-worklets · @gorhom/bottom-sheet@^5.2.14 · **HeroUI Native v1.0 + Unistyles 3 (via Uniwind)** · tailwindcss v4 (CSS-first, no `tailwind.config.js`) · tailwind-variants · react-native-actions-sheet (legacy, phasing out §4–§9; do NOT add new usages) · Sora + Inter (`@expo-google-fonts`) · MaterialCommunityIcons · `react-native-uuid` · patch-package

## Commands

```bash
npx expo prebuild --clean && npx expo run:android   # local dev build
eas build --profile development --platform android  # cloud dev build
npm run test:coverage   # thresholds: 80% lines / 95% functions / 100% branches
```

**Pre-push CI parity** — run this before every `git push` to a PR branch. Stops on the first failure. Mirrors `.github/workflows/pr-checks.yml` step-for-step.

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

If any step fails: fix it, re-run the chain from the top, repeat until green. Then push. Never push hoping CI will catch it.

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

## Components

**HeroUI Native primitives first. Build custom only when no HeroUI primitive fits.**

Before writing a new component, check the HeroUI Native catalog (Tabs, Card, Chip, ListGroup, Accordion, Input, Button, Badge, Avatar, Skeleton, etc.) and the project wrappers in `components/ui/` (`Screen`, `ScreenScroll`, `Sheet`, `Text`, `EmptyState`, `SettingsSection`, `FAB`). Compose those.

The HeroUI Native migration exists to retire custom components — reintroducing custom ones brings back the maintenance burden we paid to remove. If a HeroUI primitive almost fits but needs tweaks, prefer composing/wrapping it over building a parallel implementation.

(§5 example: a custom `SegmentSwitcher` was replaced with `Tabs` from `heroui-native` before merge.)

## Bottom Sheets

**New pattern (§3+): use `Sheet` from `components/ui/sheet.tsx`.**

`Sheet` wraps `@gorhom/bottom-sheet@^5.2.14`. It is declarative — open/close via `visible` prop + `onClose` callback. No refs, no `.show()` / `.hide()`.

```tsx
import { Sheet } from '@/components/ui/sheet';
import { BottomSheetScrollView, BottomSheetFlatList } from '@gorhom/bottom-sheet';

<Sheet visible={isOpen} onClose={close} title="My Sheet" size="sm">
  <Sheet.Body>
    {/* Use BottomSheetScrollView / BottomSheetFlatList for scrollable content */}
    <BottomSheetScrollView>
      {/* content */}
    </BottomSheetScrollView>
  </Sheet.Body>
</Sheet>
```

**Scrollable content rule:** `BottomSheetScrollView` and `BottomSheetFlatList` must be imported from `@gorhom/bottom-sheet`, not from `react-native`. Standard `ScrollView` and `FlatList` will NOT scroll inside a Sheet.

**`react-native-actions-sheet` — LEGACY, phasing out section by section.**

The old `react-native-actions-sheet` dep and its patch (`patches/react-native-actions-sheet+10.1.2.patch`) remain in the project during §4–§9 while existing consumers are migrated. No new code may import from `react-native-actions-sheet`. Each section migrates the sheets within its domain. The dep and patch are removed when the last consumer is gone (no earlier than §9).

Legacy consumers still in-flight (as of §7 cleanup): `screens/accounts/detail/components/adjust_balance_sheet.tsx` (migrates in §9), `screens/commitments/detail/components/pay_sheet.tsx` (migrates in §8). The §7 transaction-form consumers, the dashboard net-worth-breakdown sheet, and both settings category sheets have all been migrated.

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
