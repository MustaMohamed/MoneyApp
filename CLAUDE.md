# MoneyApp

React Native (Expo) personal finance app: local-only, no bank connections.

Path-scoped rules in `.claude/rules/` load with matching files: `database.md` (queries, migrations, repositories), `ui.md` (all `.tsx`, styling, HeroUI, sheets), `state.md` (stores, state, hooks), `money.md` (domain resolvers, rounding, formatting), `tests.md` (everything in `__tests__/`), `review.md` (the five recurring defect classes, all of `src/**`), `business.md` (business rules 1-8: onboarding, accounts, net worth). Project skills are in `.claude/skills/`; each one's description says when it applies.

Rules and agent files cite audit findings by ID (`H11`, `M33`, `L2`, …). They resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](docs/superpowers/reviews/2026-07-29-full-technical-audit.md); remediation is tracked in [docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md](docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md).

## Answering me

The `unslop` skill is the output contract for every reply, agent return, review, plan, spec and record; the prompt hook restates its short form each turn. `primitive`, `surface` and `harness` are domain terms here, exempt from its jargon rule where they name the real thing. `npm run lint` fails on its banned method-certification phrases anywhere outside `docs/scopes/` and `docs/superpowers/`, which are frozen history.

## When to stop

When a step doesn't need me, keep going, and put status in the same message as the next action. Stop and ask when you can't continue without me, on a critical trigger below, or before a destructive operation that no skill or routine in this file directs: deleting data, force-pushing, rewriting published history. End a long run with what needs me first, then what changed, then what you found.

Critical triggers (wake me; everywhere else proceed):

1. Product/domain disagreement `[marcus]` and `[layla]` cannot resolve
2. Cross-cutting impact: a decision binds later work non-obviously
3. High blast radius: feature-flag flip, V1 deletion, migration with data-loss risk
4. New dependency, native code change, anything outside the established stack
5. User-facing copy with voice/branding weight (field labels and error messages stay team-decided)
6. Scope balloon vs the locked epic
7. Auth / secure store / data-loss surface
8. Manual device QA: always, on real hardware, before any merge of a UI change

Not critical (decide it and move): field-level UX, naming, file structure, test approach, code style, order of work within an epic, hex→token swaps, a11y polish, minor dep bumps.

## Workflow

- **Always branch before any work. Never commit to `main`.** Branches: `feat/x`, `refactor/x`, `fix/x`, `perf/x`; task branches add the ID, `feat/MA-042-slug`.
- The issue is the record. `.work/<MA-id>/` (the `/prep` plan, branch-only, removed before merge) and `~/.ship/MoneyApp/` (`/ship` state) hold transient working files.
- Define before code: `/epic`, then `/boundaries <n>`, `/tickets <parent>`, `/issue-review <n>`. `/issue-review` is the only road to Ready For Development.
- Deliver a leaf: `/prep <n>` takes it to Planned with the plan committed on the ticket branch; `/ship <n>` takes it to merged. `/ship` alone pulls the top Planned row. One human gate: the merge.
- The board is the state: Project #2, Status field, Todo · Defined · Ready For Development · Planned · In Progress · In Review · Awaiting Human · Blocked · Done. Row order within a column is priority.
- `scripts/board.sh` is the only writer. Its `promote` is the only move from Defined to Ready For Development and the only thing that closes a parent. Never write a `status:*` label.
- Read the board with `/board [n] [graph|text]`, or `bash scripts/board.sh next [n]` from a terminal (`--json` for a script).
- A leaf task is one PR, and the unit that gets a branch and `Closes #N`. A parent is never pulled; it mirrors its furthest child and closes through its children.
- Every move, who makes it and on what, plus the hierarchy and the size gate: [docs/workflow.md](docs/workflow.md). Nothing else moves a row.
- CI parity before pushing to a PR branch: the chain in *Commands*. CI is the last line of defence, not the first.
- Emulator verification runs on tickets whose header line says `Verify emulator`: anything that changes what a screen shows or what the app writes. The `emulator-verify` skill has the mechanics, including the `mqa claim` lease and when a Gradle build is needed.

Gotcha: **device QA does not run in the worktree.** A worktree whose `node_modules` is a symlink passes `tsc`, `jest` and lint, but expo-router resolves zero routes in a device build. Check the PR branch out in the primary repo for device QA. Emulator verification does run in the worktree once it has a real `node_modules` (`/prep`'s APFS clone, or `npm ci`).

## Team

One dispatchable agent, `@layla` (`.claude/agents/layla.md`), for a money ruling that must be written into an issue. Name a file path for the ruling in the dispatch, outside the repo (the session scratchpad), and paste that file into the issue unedited. Five inline personas through the `moneyapp-expert-panel` skill, `[layla]` `[marcus]` `[sarah]` `[tariq]` `[dev]`: advisory, no files, no dispatch. `/prep` composes its planner and reviewer, `/ship` its implementer and review lenses; the define skills use read-only scouts, and `/issue-review` dispatches fresh reviewers for every lens.

Gotcha: **editing an agent definition is snapshotted at session start; creating a new one is not.** A new file in `.claude/agents/` registers and becomes dispatchable immediately, but editing an existing one does not affect subagents dispatched later in that same session. Restart the session before testing an agent change. Skills and path-scoped rules in `.claude/rules/` have neither problem; they load live, including inside subagents.

## Tech Stack

Versions are in `package.json`. What it doesn't say:

- The UI is HeroUI Native on Uniwind and Unistyles 3. `@gorhom/bottom-sheet` is only the engine under HeroUI `BottomSheet`.
- Tailwind v4 is CSS-first: there is no `tailwind.config.js`.
- oxlint (type-aware through oxlint-tsgolint) is the only linter and oxfmt the only formatter. No ESLint, no Prettier.
- Fonts are Sora and Inter from `@expo-google-fonts`; icons are MaterialCommunityIcons; ids come from `react-native-uuid`.

## Commands

```bash
npx expo prebuild --clean && npx expo run:android   # local dev build
eas build --profile development --platform android  # cloud dev build
```

**Pre-push CI parity** mirrors `.github/workflows/pr-checks.yml` step for step and stops on the first failure. Fix and re-run from the top until green, then push.

```bash
npm run format:check \
  && npm run lint \
  && npm run typecheck \
  && npm test -- --ci \
  && npx --yes expo-doctor@1.20.1 \
  && npx expo prebuild --no-install --platform android \
  && test -d android \
  && echo "✓ CI parity green, safe to push"
```

Gotcha: even pinned, `expo-doctor` validates against Expo's **live** requirement table, so it can go red with zero commits when Expo moves an SDK requirement. If it fails on a version you didn't touch, that's why; fix with `npx expo install --check` or `expo.install.exclude`. Keep the pinned tool version here and in `.github/workflows/pr-checks.yml` in sync; bump it deliberately.

**After I merge a PR**, without being asked:

1. `git checkout main` and pull.
2. Confirm the merge closed the ticket: `Closes #N` does it, and closed **is** the done signal. The `Board on merge` Action then runs `board.sh status <N> Done` and `promote <parent>` on the server (needs the `BOARD_TOKEN` repo secret); `bash scripts/board.sh get <N>` reads Done once it has. If the run failed, run both by hand: `promote` moves the children the close unblocked to Ready For Development, and closes a parent whose children are all closed, at every level up.
3. Remove the ticket's worktree if it had one, and `git worktree prune`; a branch checked out in a worktree cannot be deleted.
4. Delete the merged local branch and `git remote prune origin`.
5. **`npm ci` if the merge moved `package-lock.json`**, otherwise `node_modules` silently belongs to neither branch, and every later verification runs against a tree that matches nothing.

Gotcha: **squash-merged branches never appear in `git branch --merged`**, because the squash commit shares no history with them. Deleting on that basis leaves every task branch behind and forces `-D` later, on faith. Check `gh pr list --head <branch> --state all` and delete only what reads `MERGED`.

## Project Structure

```
src/app/              ROUTING ONLY: _layout.tsx and index.tsx files only
src/modules/<domain>/ canonical feature code: database, repositories, store, screens, components
src/components/ui/    shared UI primitives and wrappers
src/components/       legacy/shared compatibility wrappers only
src/constants/        enums.ts · secure_store_keys.ts · strings.ts · theme.ts
src/store/            backward-compat re-exports; avoid new consumers
src/repositories/     backward-compat re-exports plus shared app settings repo
src/database/         client.ts · migrations/ · compatibility query/entity stubs
src/test_helpers/     test-only helpers imported through @/test_helpers
src/screens/          legacy, one dev-only primitives screen; add nothing here
src/utils/            shared helpers: money.ts · format_amount.ts · responsive.ts · *.hook.ts · schemas/
__tests__/            snake_case tests; policy: logic-only .ts (legacy .tsx render tests exist, slated for cleanup)
docs/workflow.md      the board transition table, hierarchy and size gate the workflow skills apply
docs/adr/             architecture decision records, one dated file per decision
docs/scopes/          frozen history, output of the retired /scope workflow, one folder per scope
docs/superpowers/     frozen history: specs, plans, reviews, QA from the pre-/scope flow
.work/<MA-id>/       transient, branch-only workflow files (the /prep plan); removed before merge, never on main
```

New domain work belongs under `src/modules/<domain>/` using the existing module shape: `database/`, `repositories/`, `store/`, `screens/`, optional `components/`. No `data/` folder. Root `src/store/`, `src/repositories/`, and most `src/database/` domain files are compatibility surfaces; do not add new consumers.

### app/ rules (critical)

- Only `_layout.tsx` and `index.tsx` live here. Exception: `[id]/index.tsx`.
- Every route `index.tsx` is a one-line re-export from the canonical module screen: `export { default } from '@/modules/<domain>/screens/<path>';`. The sole exception is `src/app/index.tsx`, the root redirect that routes to onboarding or dashboard.
- **Never** colocate `*.hook.ts` / `*.anim.ts` / `*.store.ts` / `*.helpers.ts` next to a route. Expo Router registers every `.ts/.tsx` as a route; files without a default export crash.
- **Never** name a sibling of `_layout.tsx` like `_layout.<anything>.ts`. Expo strips the extension and splits on `.`, silently overwriting `_layout.tsx` in prod builds.
- **Never** push a bare `(tabs)` href from a screen reachable from `/stacked`. A `(tabs)` target needs a stacked twin route and `stackedPrefixOf(usePathname())`; bare, it drops the user back into `(tabs)`, mounting a second tab bar and sending Back to the Dashboard. A target already on the `(app)` Stack (`/accounts/*`, `/settings/*`) has no twin to prefix and stays bare.

### module screen anatomy

Each folder: `index.tsx` (UI, no useState/useSharedValue) · `<name>.hook.ts` (logic, RHF/Zod, nav, no useState) · `<name>.store.ts` (data; omit if none) · `<name>.state.ts` (UI state; omit if none) · `<name>.anim.ts` (Reanimated only) · `components/`. Sub-screens follow the same anatomy, imported from parent `index.tsx`. Files: `snake_case`. TS identifiers: `camelCase`.

## Expo Dev Client (critical)

`expo-dev-client` is required (Unistyles 3 + HeroUI Native need native code). All deps must survive `expo prebuild`; never add Expo Go-only constraints. `ios/` and `android/` are gitignored and regenerated by `npx expo prebuild --clean`. New Architecture (Fabric) is enabled via `expo-build-properties` in `app.json`.

Gotcha: **`expo install --fix` keeps adding `@react-native-community/datetimepicker` to `app.json` `plugins`; take it back out.** With no options the plugin is a no-op, and its undeclared `@expo/config-plugins` require crashed `expo prebuild` until #195 flattened the lockfile, so nothing warns now when it is listed. The `expo-image` and `expo-status-bar` plugins `--fix` adds alongside it are fine to keep. Always diff `app.json` after `expo install --fix`.

## Conventions

- **Code comments: one line, and only when needed.** A comment states a constraint the code can't, in a single line. No multi-line comment blocks; anything longer belongs in an ADR or a doc. The `no-comments` skill sweeps a scope back down to this rule.
- **HeroUI Native first (Team Law 7).** Use a HeroUI primitive wherever one exists; never hand-roll or pull a third-party equivalent. A custom component a primitive could cover is a critical trigger. Mechanics, catalog, and the wrapper inventory: the `heroui-native` skill.
- **null vs undefined.** `null` = DB-mapped nullable columns only. Absent values elsewhere = `undefined`.
- **Enums.** String enums in `constants/enums.ts`, regular `enum`, not `const enum` (Babel incompatible). Values match SQLite CHECK strings. Validate with `z.nativeEnum()`.
- **Tokens.** All sizing/spacing/radius/color from `constants/theme.ts`, scaled with `ms()`/`msFont()`. Never hardcode.
- **Strings.** All user-visible copy in `constants/strings.ts`.
- **SecureStore keys.** Centralised in `constants/secure_store_keys.ts` as `as const`.

## Notion Docs

[PRD](https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa) · [Tech Spec v1.1](https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541) · [QA & Test Plan](https://app.notion.com/p/351c90e418b6817281ebde95a5eac550) · [M1 Cycle Tracker](https://app.notion.com/p/351c90e418b681268bb4c033a59749a9)
