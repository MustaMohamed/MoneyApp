# MoneyApp

React Native (Expo) personal finance app — local-only, no bank connections.

## Workflow

**Always branch before any work.** Never commit to `main`. (`feat/x`, `refactor/x`, `fix/x`)

**Autonomous team mode (default).** The team runs work end-to-end without per-step human check-ins. The user is the product owner, not the gatekeeper — they are consulted only at the *spec sign-off* gate, the *device QA* gate, and on the **critical triggers** listed below. Everywhere else, Sarah and Tariq make recommendations and the team proceeds inside the branch. Merging, pushing, and destructive repository operations still require an explicit user request.

**Run local CI parity before every push to a PR.** The six CI jobs on `.github/workflows/pr-checks.yml` (format check, lint, typecheck, unit tests, expo-doctor, Android prebuild dry-run) must all pass locally before any `git push` that targets a PR branch. CI is the last line of defence, not the first — pushing red wastes action minutes, stalls reviewers, and (worst) hides the actual failure under retries. The one-liner is in `Commands` below.

## The Team (Specialist Roles)

Work runs through the superpowers skill flow. These personas contribute domain expertise during specific phases — they do not replace the skills.

**Leads:** **sarah** (orchestration) and **tariq** (technical) are the user's delivery proxies. Sarah can approve plans inside the workflow; Tariq can recommend code-review approval. They escalate when a critical trigger fires. They do not merge PRs or push repository changes unless the user explicitly asks for that action.

**Two access surfaces, one persona:**
- `@name` — dispatch as a **subagent** (isolated context, dedicated tools, parallel-capable, can write files). Use for heavy or isolated work.
- `[name]` — activate persona **inline** in the main thread (advisory stance, mid-conversation, no file writes). Use for quick consultations.

Subagent definitions live in `.codex/agents/`. Inline personas live in `.agents/skills/moneyapp-expert-panel/SKILL.md`. Keep them in sync when persona content changes.

The five personas:

- **sarah** — Orchestration lead. Routes work, sequences phases, approves plans on the user's behalf, holds the critical-trigger line.
- **marcus** — Product Designer & Strategist. Owns product direction, user flows, screen specs, design system. Contributes during brainstorming and design.
- **layla** — Financial Domain Expert. Owns financial formulas, rules, categories. Contributes financial spec content during design.
- **tariq** — Technical lead. Owns architecture, libraries, performance. Synthesizes design docs. Recommends code-review approval or requests changes.
- **dev** — Senior React Native Developer. Implements per the approved plan.

## How the Team Plugs Into Superpowers

Phase mapping (skills are authoritative — personas contribute to their outputs). Interactive phases (Brainstorm, Gate 1, Gate 2) run in the **main thread** via inline `[name]` personas; non-interactive phases dispatch `@name` subagents:

1. **Brainstorm** — `brainstorming` · @marcus + @layla shape product + financial intent. Sarah orchestrates internally — no per-question user check-ins.
2. **Design doc** — `docs/superpowers/specs/YYYY-MM-DD-{feature}-design.md` · @tariq synthesizes; embeds @marcus's UX and @layla's formulas.
3. 🛑 **Spec sign-off (user-facing gate)** — Sarah presents the finished spec to the user before plan-writing begins. The only brainstorm/spec touchpoint with the human.
4. **Plan** — `writing-plans` · @tariq writes; lands in `docs/superpowers/plans/YYYY-MM-DD-{feature}.md`. **Sarah approves on the user's behalf.** No user check-in unless a critical trigger fires.
5. **Execute** — `executing-plans` or `subagent-driven-development`, in an isolated git worktree (`using-git-worktrees`) · @dev implements.
6. **Code review** — `requesting-code-review` with @tariq's lens. **Tariq returns a review verdict and merge recommendation.** Merging requires an explicit user request and green verification.
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
2. **Refuse Ambiguity.** Vague request → push back, do not guess. (Use `brainstorming` to disambiguate.)
3. **Leads recommend, user controls repository integration.** Sarah approves plans. Tariq recommends review approval or requests changes. The user is consulted only at the spec sign-off gate, the device QA gate, critical triggers, and any merge/push/destructive repository action.
4. **No code without an approved plan.** @dev does not start until the spec is signed off and Sarah has approved the plan.
5. **Escalate critical triggers, write down the rest.** When a critical trigger fires, Sarah surfaces it to the user with a recommendation. When personas disagree at the routine level, the responsible lead (Sarah for scope, Tariq for tech) decides and records the rationale in the design doc or PR description.
6. **Default to subagents.** When a task matches a specialist's domain, dispatch the best-fit subagent automatically rather than doing the work in the main thread — pick by domain (Law 1): product/UX → `@marcus` · financial logic → `@layla` · architecture/synthesis/review → `@tariq` · implementation → `@dev` · orchestration/sequencing → `@sarah`. Use `[name]` inline only for quick consults. When the fit is genuinely unclear — no agent matches, or the task spans several domains with no obvious owner — **ask the user which agent to use, or fall back to the main thread**. The main thread also handles lightweight glue with no domain owner (reads, status checks, routing, trivial one-offs); those need no subagent.
7. **HeroUI Native components only.** Use a HeroUI Native component wherever one exists (see Components + Bottom Sheets — e.g. `BottomSheet`, not a custom `@gorhom` wrapper). Building a custom or third-party UI component that a HeroUI primitive could cover is a critical trigger: it needs sign-off plus a written "no HeroUI primitive fits" justification. Always prefer composing/wrapping a HeroUI primitive over a parallel implementation.

## Tech Stack

Expo (bare workflow via expo-dev-client) · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · expo-secure-store · react-native-reanimated v4 + react-native-worklets · @gorhom/bottom-sheet@^5.2.14 (HeroUI `BottomSheet` engine) · **HeroUI Native v1.0.3 + Unistyles 3 (via Uniwind)** · tailwindcss v4 (CSS-first, no `tailwind.config.js`) · tailwind-variants · Sora + Inter (`@expo-google-fonts`) · MaterialCommunityIcons · `react-native-uuid` · patch-package · oxlint v1 (sole linter, `eslint-plugin-expo` bridged via JS Plugin Alpha) · oxfmt beta (sole formatter, Tailwind class sort + import sort built-in) · oxlint-tsgolint (strict type-aware linting enabled)

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
src/app/              ROUTING ONLY — _layout.tsx and index.tsx files only
src/modules/<domain>/ canonical feature code: data, store, screens, components
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

New domain work belongs under `src/modules/<domain>/`. Root `src/store/`, `src/repositories/`,
and most `src/database/` domain files are compatibility surfaces for old import
paths; do not add new module consumers to those roots.

### src/app/ rules (critical)

- Only `_layout.tsx` and `index.tsx` live here. Exception: `[id]/index.tsx`.
- Every route `index.tsx` is a one-line re-export from the canonical module screen,
  for example: `export { default } from '@/modules/<domain>/screens/<path>';`
- **Never** colocate `*.hook.ts` / `*.anim.ts` / `*.store.ts` / `*.helpers.ts` next to a route — Expo Router registers every `.ts/.tsx` as a route; files without a default export crash.
- **Never** name a sibling of `_layout.tsx` like `_layout.<anything>.ts` — Expo strips the extension and splits on `.`, silently overwriting `_layout.tsx` in prod builds.

### module screen anatomy

Each module screen folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav, no useState) · `<name>.store.ts` (data: form drafts, selections, fetched results — omit if none) · `<name>.state.ts` (UI state: visibility, loading, errors, tab selection — omit if none) · `<name>.anim.ts` (Reanimated only) · `components/` (per-component `.state.ts` lives next to its `.tsx` when the component had local state)

Sub-screens (non-route drawers like `transactions/filter/`) follow the same anatomy, imported from parent `index.tsx`.

Files: `snake_case`. TS identifiers: `camelCase`.

**Store/state shape:** Both `.store.ts` and `.state.ts` Zustand stores expose reactive values as top-level fields; actions stay as top-level functions. Setters spread the previous store: `set((s) => ({ ...s, x: v }))`. `reset()` is `set(INITIAL_STATE)` or `set(initialState())`. Consumers group reactive reads with `useStore(useShallow((s) => ({ x: s.x, y: s.y })))` and read actions outside render with `useStore.getState().action`. Screen hooks still return `{ state: { ...reactive values... }, ...flat actions }`; screen consumers destructure `state` and read fields via `state.x`.

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

- `cn(...)` utility: `import { cn } from 'heroui-native'`. There is no `src/utils/cn.ts`.
- Theme color slots: `bg-background`, `text-foreground`, `bg-surface`, `bg-default`, `border-border`, `border-separator`, `text-accent`, `text-muted`, `text-danger`, etc. See `global.css` for the full list.
- Variant composition: `import { tv } from 'tailwind-variants'` for opinionated wrappers in `src/components/ui/`.
- Runtime hex (e.g. account swatches): pass `style={{ backgroundColor: hex }}` — `className` is build-time only.
- Module-level theme access (`SystemUI.setBackgroundColorAsync`, `expo-linear-gradient` colors, `MaterialCommunityIcons` color prop): import `Colors` / `GoldTokens` / `CoreTokens` from `src/constants/theme_tokens.ts` directly (cannot use `useThemeColor` hook outside React).

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

**HeroUI Native components are mandatory. Use a HeroUI Native component wherever one exists — never hand-roll or pull a third-party equivalent.** (Binding: Team Law 7.)

Installed catalog (`heroui-native` v1.0.3 — check it before writing anything): Accordion, Alert, Avatar, **BottomSheet**, Button, Card, Checkbox, Chip, CloseButton, Dialog, Input (+ InputGroup, InputOTP, TextField, TextArea, SearchField), Label, LinkButton, ListGroup, Menu (+ SubMenu), Popover, PressableFeedback, Radio (+ RadioGroup), ScrollShadow, Select, Separator, Skeleton (+ SkeletonGroup), Slider, Spinner, Surface, Switch, Tabs, TagGroup, Text, Toast, and form helpers (ControlField, Description, FieldError).

Project wrappers in `src/components/ui/` compose HeroUI: `Screen`, `ScreenScroll`, `Text`, `EmptyState`, `SettingsSection`, `FAB`, `Sheet` (HeroUI-backed — see Bottom Sheets). Compose these.

**Introducing a custom or third-party UI component that a HeroUI primitive could cover is a critical trigger — it needs sign-off + a written "no HeroUI primitive fits" justification.** If a HeroUI primitive almost fits but needs tweaks, compose/wrap it — never build a parallel implementation. The only standing non-HeroUI primitives are layout/effect pieces HeroUI does not provide (`Screen`/`ScreenScroll` full-screen layout, the gold-gradient `HeroShell`, `FAB`, SVG textures); extend that list only with sign-off.

(§5 example: a custom `SegmentSwitcher` was replaced with `Tabs` from `heroui-native` before merge.)

## Bottom Sheets

**Use HeroUI Native's `BottomSheet` (compound component). Do NOT hand-roll a `@gorhom/bottom-sheet` wrapper.**

`BottomSheet` is declarative and controlled via `isOpen` + `onOpenChange`. Always handle close through `onOpenChange` (the inner `Content.onClose` only fires on swipe-down, not on overlay-press / close-button / programmatic close). `@gorhom/bottom-sheet` stays in the tree **only as HeroUI's rendering engine** — `BottomSheet.Content` IS a gorhom sheet, and scrollables are still imported from `@gorhom/bottom-sheet`.

```tsx
import { BottomSheet, Button } from 'heroui-native';

<BottomSheet isOpen={isOpen} onOpenChange={setIsOpen}>
  <BottomSheet.Trigger asChild><Button>{Strings.open}</Button></BottomSheet.Trigger>
  <BottomSheet.Portal>
    <BottomSheet.Overlay />
    <BottomSheet.Content>
      <BottomSheet.Close />
      <BottomSheet.Title>{Strings.title}</BottomSheet.Title>
      <BottomSheet.Description>{Strings.desc}</BottomSheet.Description>
      {/* body */}
    </BottomSheet.Content>
  </BottomSheet.Portal>
</BottomSheet>
```

**Scrollable content:** import `BottomSheetScrollView` / `BottomSheetFlatList` from `@gorhom/bottom-sheet` (NOT `react-native`) and nest inside `BottomSheet.Content`; set `enableOverDrag={false}`, `enableDynamicSizing={false}`, and a fixed height via `contentContainerClassName="h-full"`.
**Keyboard-aware inputs:** wire `useBottomSheetAwareHandlers()` onto the input's `onFocus`/`onBlur` and set `keyboardBehavior="extend"` on `Content`.

**`Sheet` wrapper:** every sheet in the app goes through the HeroUI-backed `Sheet` primitive at `src/components/ui/sheet.tsx` — a thin declarative wrapper (`isOpen`/`onOpenChange`, `size`, `scrollable`, `footer`) composing HeroUI `BottomSheet`. The migration off the old hand-rolled `@gorhom` wrapper is complete; no imperative gorhom-ref wrapper exists anywhere. Build new sheets on `Sheet` (or HeroUI `BottomSheet` directly); never hand-roll a new `@gorhom` wrapper.

## Patches

`patch-package` auto-applies on `npm install` via the `postinstall` script. Patch files live in `patches/`. Never edit a shipped patch — create a new one if the fix needs updating.

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

## Design System — Cairo Nights

All values in `src/constants/theme.ts`. Never hardcode.

- **Typography:** Sora (numbers, headings, CTAs) · Inter (body, labels, secondary).
- **Numbers:** `Intl.NumberFormat('en-US', { style: 'decimal' })` → `122,300`.
- **CTA:** `Size.ctaHeight` (52) · `Radius.cta` (13) · gold gradient on midnight-blue text.

## Notion Docs

[PRD](https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa) · [Tech Spec v1.1](https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541) · [QA & Test Plan](https://app.notion.com/p/351c90e418b6817281ebde95a5eac550) · [M1 Cycle Tracker](https://app.notion.com/p/351c90e418b681268bb4c033a59749a9)
