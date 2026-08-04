# MoneyApp

React Native (Expo) personal finance app — local-only, no bank connections.

Path-scoped rules in `.claude/rules/` load automatically when working with matching files: `database.md` (queries, migrations, repositories), `ui.md` (all `.tsx`, styling, HeroUI, sheets), `state.md` (stores, state, hooks), `money.md` (domain resolvers, rounding, formatting), `tests.md` (everything in `__tests__/`). Project skills: `heroui-native` (UI catalog + patterns), `money-rules` (financial contracts), `moneyapp-testing` (test patterns), `device-qa` (QA matrices), `moneyapp-expert-panel` (inline personas).

Rules and agent files cite audit findings by ID (`H11`, `M33`, `L2`, …). They resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](docs/superpowers/reviews/2026-07-29-full-technical-audit.md); remediation is tracked in [docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md](docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md).

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

Flow: brainstorm → HTML mockup (`docs/superpowers/mockups/YYYY-MM-DD-{feature}.html`, Marcus) + design doc (`docs/superpowers/specs/YYYY-MM-DD-{feature}-design.md`) → 🛑 **spec sign-off** (mockup published as an artifact for review) → plan (`docs/superpowers/plans/YYYY-MM-DD-{feature}.md`, Sarah approves) → execute in an isolated git worktree → code review (Tariq recommends) → 🛑 **device QA** (only the user can walk it).

Domain sovereignty: product/UX → marcus · financial logic → layla · architecture/review → tariq · implementation → dev · sequencing → sarah. Vague request → push back and disambiguate before building. Routine disagreements: the responsible lead decides and records the rationale.

Gotcha: **agent definitions are snapshotted when the session starts.** Editing a file in `.claude/agents/` does not affect subagents dispatched later in that same session — they still run the old definition, silently and convincingly. Restart the session before testing an agent change. Path-scoped rules in `.claude/rules/` do not have this problem; they load live, including inside subagents.

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

Expo (bare workflow via expo-dev-client) · TypeScript strict · Expo Router v3 · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · expo-secure-store · react-native-reanimated v4 + react-native-worklets · @gorhom/bottom-sheet@^5.2.14 (HeroUI `BottomSheet` engine) · **HeroUI Native v1.0.8 + Unistyles 3 (via Uniwind)** · tailwindcss v4 (CSS-first, no `tailwind.config.js`) · tailwind-variants · Sora + Inter (`@expo-google-fonts`) · MaterialCommunityIcons · `react-native-uuid` · patch-package · oxlint v1 (sole linter) · oxfmt beta (sole formatter) · oxlint-tsgolint (type-aware linting)

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
  && npx --yes expo-doctor@1.20.1 \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green — safe to push"
```

Gotcha: even pinned, `expo-doctor` validates against Expo's **live** requirement table, so it can go red with zero commits when Expo moves an SDK requirement. If it fails on a version you didn't touch, that's why — fix with `npx expo install --check` or `expo.install.exclude`. Keep the pinned tool version here and in `.github/workflows/pr-checks.yml` in sync; bump it deliberately.

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
src/screens/          legacy — one dev-only primitives screen; add nothing here
src/utils/            responsive.ts · use_zod_form.hook.ts · use_layout_init.hook.ts · onboarding_nav.ts
__tests__/            snake_case tests — policy: logic-only .ts (legacy .tsx render tests exist, slated for cleanup)
```

New domain work belongs under `src/modules/<domain>/` using the existing module shape: `database/`, `repositories/`, `store/`, `screens/`, optional `components/`. No `data/` folder. Root `src/store/`, `src/repositories/`, and most `src/database/` domain files are compatibility surfaces — do not add new consumers.

### app/ rules (critical)

- Only `_layout.tsx` and `index.tsx` live here. Exception: `[id]/index.tsx`.
- Every route `index.tsx` is a one-line re-export from the canonical module screen: `export { default } from '@/modules/<domain>/screens/<path>';` — the sole exception is `src/app/index.tsx`, the root redirect that routes to onboarding or dashboard.
- **Never** colocate `*.hook.ts` / `*.anim.ts` / `*.store.ts` / `*.helpers.ts` next to a route — Expo Router registers every `.ts/.tsx` as a route; files without a default export crash.
- **Never** name a sibling of `_layout.tsx` like `_layout.<anything>.ts` — Expo strips the extension and splits on `.`, silently overwriting `_layout.tsx` in prod builds.

### module screen anatomy

Each folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav, no useState) · `<name>.store.ts` (data — omit if none) · `<name>.state.ts` (UI state — omit if none) · `<name>.anim.ts` (Reanimated only) · `components/`. Sub-screens follow the same anatomy, imported from parent `index.tsx`. Files: `snake_case`. TS identifiers: `camelCase`.

## Expo Dev Client (critical)

`expo-dev-client` is required (Unistyles 3 + HeroUI Native need native code). All deps must survive `expo prebuild`; never add Expo Go-only constraints. `ios/` and `android/` are gitignored — regenerated by `npx expo prebuild --clean`. New Architecture (Fabric) is enabled via `expo-build-properties` in `app.json`.

## Conventions

- **HeroUI Native first (Team Law 7):** use a HeroUI primitive wherever one exists — never hand-roll or pull a third-party equivalent. A custom component a primitive could cover is a critical trigger. Mechanics, catalog, and the wrapper inventory: the `heroui-native` skill.
- **null vs undefined:** `null` = DB-mapped nullable columns only. Absent values elsewhere = `undefined`.
- **Enums:** string enums in `constants/enums.ts` — regular `enum`, not `const enum` (Babel incompatible). Values match SQLite CHECK strings. Validate with `z.nativeEnum()`.
- **Tokens:** all sizing/spacing/radius/color from `constants/theme.ts`, scaled with `ms()`/`msFont()`. Never hardcode.
- **Strings:** all user-visible copy in `constants/strings.ts`.
- **SecureStore keys:** centralised in `constants/secure_store_keys.ts` as `as const`.

## Business Rules

1. `OnboardingComplete` set only on "Open My Dashboard" tap (N4 — flow is N1 welcome → N2 add account → N3 more accounts → N4 ready).
2. Force-close during onboarding → resume from that step on relaunch. Legacy `O*` steps migrate to N1 on first launch.
3. N2 requires ≥1 saved account before proceeding.
4. N3 is skippable once N2 wrote an account.
5. EGP pre-selected on N1 — base currency is chosen in the welcome step.
6. `current_balance = opening_balance` at account creation.
7. Credit card accounts are liabilities (negative net-worth).
8. Account names are unique across all accounts.

## Notion Docs

[PRD](https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa) · [Tech Spec v1.1](https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541) · [QA & Test Plan](https://app.notion.com/p/351c90e418b6817281ebde95a5eac550) · [M1 Cycle Tracker](https://app.notion.com/p/351c90e418b681268bb4c033a59749a9)
