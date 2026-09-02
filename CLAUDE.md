# MoneyApp

React Native (Expo) personal finance app — local-only, no bank connections.

Path-scoped rules in `.claude/rules/` load automatically when working with matching files: `database.md` (queries, migrations, repositories), `ui.md` (all `.tsx`, styling, HeroUI, sheets), `state.md` (stores, state, hooks), `money.md` (domain resolvers, rounding, formatting), `tests.md` (everything in `__tests__/`), `review.md` (the five recurring defect classes, all of `src/**`). Project skills: `heroui-native` (UI catalog + patterns), `money-rules` (financial contracts), `moneyapp-testing` (test patterns), `device-qa` (QA matrices), `emulator-verify` (drive the app on the emulator yourself), `epic` · `boundaries` · `tickets` · `issue-review` (the define workflow, see *Workflow*), `ship` (ticket delivery, see *Workflow*), `moneyapp-expert-panel` (inline personas), `unslop` (the output contract — mandatory for all composed output; see *Answering me*).

Rules and agent files cite audit findings by ID (`H11`, `M33`, `L2`, …). They resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](docs/superpowers/reviews/2026-07-29-full-technical-audit.md); remediation is tracked in [docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md](docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md).

## Answering me

**The `unslop` skill is the output contract. Load it at session start and hold every reply, agent return, review, plan, spec, and record to it — shapes included.** The always-in-force short form:

- Lead with the answer. A direct question gets its answer in the first sentence and may end there.
- A reply answers, then stops; detail only where it changes what I do next. Per-artifact shapes are in the skill.
- Evidence, not defence of evidence. The number and the command, never "measured rather than assumed".
- Negative results are one line. No-finding sections get one line, not a heading.
- Cut: restating the request, narrating tool calls, re-explaining, process commentary.

MoneyApp specifics for the contract: `primitive`, `surface`, and `harness` are domain terms here, exempt from the jargon rule where they name the real thing. Method-certification baseline, over the live tree (`docs/scopes/` and `docs/superpowers/` are frozen history; this file and the `unslop` skill quote the banned phrases to ban them):

```bash
git grep -oE "rather than assumed|rather than inferred|not inferred|not assumed" -- . ':!docs/scopes' ':!docs/superpowers' ':!CLAUDE.md' ':!.claude/skills/unslop' | wc -l
```

Returns 3 today; it must not grow.

## Workflow

**Always branch before any work. Never commit to `main`.** (`feat/x`, `refactor/x`, `fix/x`, `perf/x`; task branches add the ID: `feat/MA-042-slug`)

Work is defined on GitHub and delivered from GitHub. Nothing about a piece of work lives on disk.

**Defining work is four skills, before any code.** `/epic` turns a goal I state into an epic issue on a milestone, at Todo. `/boundaries <epic>` interviews me from codebase evidence, one question at a time, and locks the epic body: Goal, Building, Not building, Rules, Links, Open questions. `/tickets <parent>` cuts the parent into tasks in the ticket standard: proposes the split for me to choose, drafts the bodies, and creates them as sub-issues on my approval. `/issue-review <n>` runs after each lock and whenever I ask: fresh reviewers check the issue, or its children when it has any, against its Goal, its parent and the code, and edit the bodies on my approval. Each is standalone, takes an issue number, and gates on the board Status. Standards, mechanics and the board ids live in the skills.

**The board is the state.** Project #2, Status field: Todo · Defined · Ready For Development · Planned · In Progress · In Review · Awaiting Human · Blocked · Done. Defined means the ticket is in the standard shape. Ready For Development means pullable: every depends-on closed. Row order within a column is priority. `scripts/board.sh` is the one way to write the board, and its `promote` is the only thing that closes a parent, when every child closed as completed. `status:*` labels are retired; never write one.

**Hierarchy.** A milestone `MA-<module>-<goal>` groups any number of epics. An epic parents its tasks as sub-issues. A task I choose to break down further is created at Todo and re-enters `/tickets`. A parent closes when its last child closes. The unit that gets a branch, a PR and `Closes #N` is the leaf task.

**Delivering a ticket is `/ship`**, as it stands until the delivery design replaces it. Its gates and hard rules stand: every merge is mine, every destructive repository operation is an explicit request from me.

**CI parity before pushing to a PR branch**: run the chain in `Commands`. CI is the last line of defence, not the first.

**Emulator verification** runs on tickets whose header line says `Verify emulator`, anything that changes what a screen shows or what the app writes. `/ship`'s implementer runs it at P6 and the review battery at P7; the `emulator-verify` skill carries the mechanics. It is a second net under the same defects: **device QA is unchanged**, on real hardware, and typography, shadows, gesture feel and performance are visible nowhere else.

Gotcha: **device QA does not run in the worktree.** A worktree whose `node_modules` is a symlink passes `tsc`, `jest`, and lint but breaks device builds; expo-router resolves zero routes. Check the PR branch out in the primary repo for device QA. Emulator verification *does* run in the worktree once it has a real `node_modules` (`/ship`'s APFS clone, or `npm ci`); give the worktree its own Metro port, because `adb reverse` is global per device and sharing 8081 silently serves the primary repo's bundle.

**A Gradle build is not part of that price by default.** Ask `mqa needs-build`: only a native-surface change rebuilds, most task diffs are JS-only, and the branch under test reaches the device over Metro either way. Run the parity chain *before* building, so P6 and P7 share one APK instead of each making their own. And scope the walk: **if a unit test can assert it, the emulator must not.** All of this is in the `emulator-verify` skill, with the measurement behind it.

## Team

One dispatchable agent, `@layla` (`.claude/agents/layla.md`), for a money ruling that must be written into an issue. Five inline personas through the `moneyapp-expert-panel` skill, `[layla]` `[marcus]` `[sarah]` `[tariq]` `[dev]`: advisory, no files, no dispatch. `/ship` composes its own planner, implementer and review lenses; the define skills use read-only scouts, and `/issue-review` dispatches fresh reviewers for every lens.

Gotcha: **editing an agent definition is snapshotted at session start; creating a new one is not.** A *new* file in `.claude/agents/` registers and becomes dispatchable immediately, but *editing* an existing one does not affect subagents dispatched later in that same session. Restart the session before testing an agent change. Skills and path-scoped rules in `.claude/rules/` have neither problem; they load live, including inside subagents.

### Critical triggers (wake me; everywhere else proceed)

1. Product/domain disagreement `[marcus]` and `[layla]` cannot resolve
2. Cross-cutting impact: a decision binds later work non-obviously
3. High blast radius: feature-flag flip, V1 deletion, migration with data-loss risk
4. New dependency, native code change, anything outside the established stack
5. User-facing copy with voice/branding weight (field labels and error messages stay team-decided)
6. Scope balloon vs the locked epic
7. Auth / secure store / data-loss surface
8. Manual device QA: always, on real hardware, before any merge of a UI change

Not critical (decide it and move): field-level UX, naming, file structure, test approach, code style, order of work within an epic, hex→token swaps, a11y polish, minor dep bumps.

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

**After I merge a PR**, without being asked:

1. `git checkout main` and pull.
2. Confirm the merge closed the ticket: `Closes #N` does it, and closed **is** the done signal. `bash scripts/board.sh status <N> Done` in case the board automation is off. Then `bash scripts/board.sh promote <parent>`: it moves the children the close unblocked to Ready For Development, and closes a parent whose children are all closed, at every level up.
3. Delete the merged local branch and `git remote prune origin`.
4. Remove the ticket's worktree if it had one, and `git worktree prune`.
5. **`npm ci` if the merge moved `package-lock.json`**, otherwise `node_modules` silently belongs to neither branch, and every later verification runs against a tree that matches nothing.

Gotcha: **squash-merged branches never appear in `git branch --merged`**, because the squash commit shares no history with them. Deleting on that basis leaves every task branch behind and forces `-D` later, on faith. Check `gh pr list --head <branch> --state all` and delete only what reads `MERGED`.

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
src/utils/            shared helpers: money.ts · format_amount.ts · responsive.ts · *.hook.ts · schemas/
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

Before #195 the plugin's undeclared `@expo/config-plugins` require crashed `expo config` and `expo prebuild`, which was accidentally the detector; #195 re-flattened the lockfile to one hoisted copy, so it now resolves and nothing warns.

## Conventions

- **Code comments: one line, and only when needed** — a comment states a constraint the code can't, in a single line. No multi-line comment blocks; anything longer belongs in an ADR or a doc. The `no-comments` skill sweeps a scope back down to this rule.
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
