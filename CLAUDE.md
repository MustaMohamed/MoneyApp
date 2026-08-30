# MoneyApp

React Native (Expo) personal finance app — local-only, no bank connections.

Path-scoped rules in `.claude/rules/` load automatically when working with matching files: `database.md` (queries, migrations, repositories), `ui.md` (all `.tsx`, styling, HeroUI, sheets), `state.md` (stores, state, hooks), `money.md` (domain resolvers, rounding, formatting), `tests.md` (everything in `__tests__/`), `review.md` (the five recurring defect classes, all of `src/**`). Project skills: `heroui-native` (UI catalog + patterns), `money-rules` (financial contracts), `moneyapp-testing` (test patterns), `device-qa` (QA matrices), `emulator-verify` (drive the app on the emulator yourself), `ship` (gated ten-phase ticket delivery — see *Workflow*), `unslop` (the output contract — mandatory for all composed output; see *Answering me*).

Rules and agent files cite audit findings by ID (`H11`, `M33`, `L2`, …). They resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](docs/superpowers/reviews/2026-07-29-full-technical-audit.md); remediation is tracked in [docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md](docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md).

## Answering me

**The `unslop` skill is the output contract. Load it at session start and hold every reply, agent return, review, plan, spec, and record to it — shapes included.** The always-in-force short form:

- Lead with the answer. A direct question gets its answer in the first sentence and may end there.
- A reply answers, then stops; detail only where it changes what I do next. Per-artifact shapes are in the skill.
- Evidence, not defence of evidence. The number and the command, never "measured rather than assumed".
- Negative results are one line. No-finding sections get one line, not a heading.
- Cut: restating the request, narrating tool calls, re-explaining, process commentary.

MoneyApp specifics for the contract: `primitive`, `surface`, and `harness` are domain terms here, exempt from the jargon rule where they name the real thing. Method-certification baseline: `grep -roE "rather than assumed|rather than inferred|not inferred|not assumed" docs/scopes/ | wc -l` returns 36 today; it must not grow.

## Workflow

**Always branch before any work. Never commit to `main`.** (`feat/x`, `refactor/x`, `fix/x`, `perf/x`; task branches add the ID — `feat/MA-042-slug`)

**Ticket delivery goes through `/ship`** (the `ship` skill) — a ten-phase gated workflow from brainstorm to merged PR: human gates at scope approval, task/mode approval, and every merge; a cold planner, a plan review, an implementer, and a parallel review battery each run as isolated subagents. Mechanics, artifacts (`~/.ship/MoneyApp/<ticket>/`), and hard rules live in the skill — this file does not restate them.

**CI parity before pushing to a PR branch** — run the chain in `Commands`. CI is the last line of defence, not the first.

## Tech Stack

Expo SDK 57 (bare workflow via expo-dev-client) · TypeScript 6 strict · Expo Router v57 (SDK-versioned) · expo-sqlite · Zustand v5 · RHF v7 + Zod v4 · expo-secure-store · react-native-reanimated v4 + react-native-worklets · @gorhom/bottom-sheet@^5.2.14 (HeroUI `BottomSheet` engine) · **HeroUI Native v1.0.8 + Unistyles 3 (via Uniwind)** · tailwindcss v4 (CSS-first, no `tailwind.config.js`) · tailwind-variants · Sora + Inter (`@expo-google-fonts`) · MaterialCommunityIcons · `react-native-uuid` · patch-package · oxlint v1 (sole linter) · oxfmt beta (sole formatter) · oxlint-tsgolint (type-aware linting)

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
docs/adr/             architecture decision records — one dated file per decision
docs/scopes/          frozen history — output of the retired /scope workflow, one folder per scope
docs/superpowers/     frozen history — specs, plans, reviews, QA from the pre-/scope flow
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

Gotcha: **`@react-native-community/datetimepicker` must stay OUT of `app.json` `plugins`, and `expo install --fix` keeps putting it back — and since #195 it no longer crashes when it does.** Listing it buys nothing: with no options passed the plugin is a no-op (`setAndroidColors` and `setAndroidPickerStyles` both return early on `!theme`). The two plugins `--fix` adds alongside it — `expo-image`, `expo-status-bar` — are fine to keep; they require `expo/config-plugins`, a subpath of a direct dependency, which resolves. **Always diff `app.json` after running `expo install --fix` — that is now the only guard.**

Until #195 this failed loudly: `app.plugin.js` requires `@expo/config-plugins` without declaring it, and the lockfile carried six *nested* copies with no top-level entry, so the require threw `Cannot find module '@expo/config-plugins'` and took down `expo config`, `expo prebuild`, the `prebuild-check` CI job and every local dev build. That crash was accidentally the detector. #195 re-flattened the tree — one hoisted `@expo/config-plugins`, zero nested — so the require now resolves and `expo config` exits 0 with the plugin listed (verified on `main` after merge). The old text blamed SDK 57 for nesting; it was this lockfile's install-history sediment, not the SDK.

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
