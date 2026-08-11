# MoneyApp

React Native (Expo) personal finance app — local-only, no bank connections.

Path-scoped rules in `.claude/rules/` load automatically when working with matching files: `database.md` (queries, migrations, repositories), `ui.md` (all `.tsx`, styling, HeroUI, sheets), `state.md` (stores, state, hooks), `money.md` (domain resolvers, rounding, formatting), `tests.md` (everything in `__tests__/`), `review.md` (the five recurring defect classes, all of `src/**`). Project skills: `heroui-native` (UI catalog + patterns), `money-rules` (financial contracts), `moneyapp-testing` (test patterns), `device-qa` (QA matrices), `emulator-verify` (suspended — kept for the future re-introduction of device verification), `moneyapp-expert-panel` (inline personas).

Rules and agent files cite audit findings by ID (`H11`, `M33`, `L2`, …). They resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](docs/superpowers/reviews/2026-07-29-full-technical-audit.md); remediation is tracked in [docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md](docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md).

## Answering me

Clear and short. A preferred shape, not a template — a direct question just gets its answer.

Small paragraph for context, bullets for the detail, and if something needs doing, say it straight — no hedging or burying it at the end.

Cut: restating the request, narrating tool calls, re-explaining what you already told me, process commentary. Keep the evidence — a measured number, not a paragraph defending it. Long form only when I ask for the reasoning.

## Workflow

**Always branch before any work. Never commit to `main`.** (`feat/x`, `refactor/x`, `fix/x`, `perf/x`; task branches add the ID — `feat/MA-042-slug`)

**Autonomous team mode.** `/scope` runs a scope end to end. The user is consulted at exactly three gates plus the **critical triggers** below; between gate 2 and gate 3 the team runs without check-ins. Sarah approves plans on the user's behalf. **The merge and every destructive repository operation always require an explicit user request** — pushing a task branch and opening its PR are part of step 7 and are authorised by this workflow.

**CI parity before pushing to a PR branch** — run the chain in `Commands`. CI is the last line of defence, not the first.

### The ten steps

Everything for a scope lives in `docs/scopes/MA-<slug>/` — see [TEMPLATES.md](docs/scopes/TEMPLATES.md) for the file contracts and the ID scheme.

| # | Step | Owner | Produces |
|---|---|---|---|
| 1 | Brainstorm | main thread + `[marcus]` `[layla]`, `@marcus` mockup | `scope.md`, `assets/` |
| 2 | Spec and task breakdown | `@tariq` | `spec.md`, `tasks.md`, `tasks/MA-nnn.md` |
| 3 | Task review and ordering | `@task-reviewer` | corrected, ordered `tasks.md` |
| 4 | Plan | `@tariq` | `## Plan` in the task file |
| 5 | Plan review | `@plan-reviewer` | `## Plan review` |
| 6 | Implement, self-review, commit | `@dev` | commits in an isolated worktree |
| 7 | Local review (built-in `code-review`, high effort), then push and open PR with `Closes #N` | `@impl-reviewer`, then `@sarah` | `## Implementation review` |
| 8 | PR review (built-in `review` on the PR, high effort) | `@pr-reviewer` | `## PR review` |
| 9 | Quality and efficiency review | `@quality-reviewer` | `## Quality review`, `debt:*` issues |
| 10 | Device QA and merge, then sync and clean | the user merges · `@sarah` cleans | merged PR, issue closed, local tree clean |

Steps 4–9 run per task, in `tasks.md` order. **Both code-review gates open with the harness's built-in review skill at high effort** — step 7 runs `code-review` over the branch diff, step 8 runs `review` over the PR. The skill is each reviewer's first pass, never a replacement for its own closed rubric; skill findings outside a reviewer's rubric route to the reviewer who owns them.

**Parallelism** — the run record says the gates are fast and the waits are long (median step 8: 12 minutes; gate waits run to 10 hours):

- **Steps 8 and 9 run concurrently** once the PR is open. Disjoint rubrics; each writes only its own pre-existing section of the task file. If both request changes, `@dev` gets one combined fix round; each reviewer re-checks only its own findings.
- **Pre-plan during waits.** While a task sits at step 6 or `awaiting-human`, Sarah may run steps 4–5 of the next task **iff every dependency's issue is closed** — never against anything still in flight. If `main` moves before its step 6 starts, `@plan-reviewer` re-verifies the plan's claims against the new `main` (a read, not a round).
- **At most two tasks in flight across steps 4–9**, in separate worktrees, only when their dependency rows are disjoint. Merges and gate 3 stay strictly one at a time.
- **Long checks run in the background.** The CI parity chain starts in the background at the top of step 6's self-review and step 7's read; the verdict still waits for its real output.

🛑 **Gate 1** after step 1 — the user locks `scope.md`, mockup published as an artifact.
🛑 **Gate 2** after step 3 — the user sees the ordered task list before any code exists.
🛑 **Gate 3** after step 9 — the user walks device QA and merges, seeing the deferred debt alongside.

**Step 10 does not end at the merge.** The moment I say a PR is merged, Sarah does all of this without being asked — a stale tree is how the next task gets planned against the wrong `main`:

1. `git checkout main` and pull.
2. Confirm the merge closed the task's issue — `Closes #N` does it, and closed **is** the done signal. Leave the `status:*` label alone: `/status` treats a task issue with no label as a half-applied transition, and the label is inert once the issue is closed. No status is written to the repo; beyond the identifiers, the frontmatter carries only `branch:` and `pr:`.
3. Delete the merged local branch and `git remote prune origin`.
4. Remove the task's worktree if it had one, and `git worktree prune`.
5. **`npm ci` if the merge moved `package-lock.json`** — otherwise `node_modules` silently belongs to neither branch, and every later verification runs against a tree that matches nothing.

Gotcha: **squash-merged branches never appear in `git branch --merged`**, because the squash commit shares no history with them. Deleting on that basis leaves every task branch behind and forces `-D` later, on faith. Check `gh pr list --head <branch> --state all` and delete only what reads `MERGED`.

**Status lives on the task's GitHub issue, not on disk.** Every task has one issue; the task file's frontmatter carries its number as `issue:`, and `tasks.md` links it. Sarah sets the `status:*` label before dispatching the next step — that write is what makes an interrupted scope resumable, and it costs no commit and no PR. `status:todo` · `status:planning` · `status:ready` · `status:implementing` · `status:in-review` · `status:quality-review` · `status:awaiting-human` · `status:blocked`; **`done` is the issue being closed**, which the merge does by itself via `Closes #N` in the PR body. Exactly one `status:*` label at a time — replace, never add. A `status:blocked` task halts the scope; never skip past it, the order encodes dependencies. Each review gate allows three rounds; the fourth blocks the task and reports.

**Step 9 reviews how well the change is made**, not whether it works — duplication, query and render cost, dead surface, layer altitude. Step 7 forbids unplanned improvements ("an unplanned change is a finding even when it is an improvement"), which is right and leaves nobody to pick them up; step 9 is where that debt is paid back. Its findings are out of scope for the task that produced them by construction, so they are **filed as `debt:quality` / `debt:perf` issues, not requested as changes**. It blocks on exactly one thing: a *measured* regression this diff introduces.

Gotcha: **a step-9 fix lands on a PR step 8 already approved.** That is the price of reviewing quality after the PR gate, and it is why the blocking entrance is that narrow. @pr-reviewer is not re-run — @sarah confirms CI, and step 8's round budget stays for step-8 disagreements.

Gotcha: **status is now a network read.** With no GitHub reachable, a scope cannot resume — the task file no longer answers "where was I". That is the price of killing the drift that a status column kept producing, and it is the right trade because the state that matters is on GitHub anyway (branch, PR, merge). Never re-add a status field to the frontmatter or a Status column to `tasks.md` as a "cache"; two sources of truth is the thing being deleted here.

**Emulator verification is suspended** — steps 6 and 7 run no emulator, pending a different mechanism. `verify: emulator` still marks the tasks whose failure a unit test cannot catch (anything changing what a screen shows or what the app writes); its consequence now is that **gate 3 carries the walk**: `@dev` writes the device-only rows into `## Device QA` at step 6, and `@impl-reviewer` verifies the checklist is *executable* — numbered steps, real screen names, forced-failure recipes that exist. MA-008 spent three step-8 rounds learning that when nothing runs, the checklist is the gate artifact. The `emulator-verify` skill stays on disk for the replacement; nothing dispatches it.

Gotcha: **device QA does not run in the worktree.** Its symlinked `node_modules` passes `tsc`, `jest`, and lint but breaks device builds — expo-router resolves zero routes. Check the PR branch out in the primary repo for step 10.

**Scope the gate-3 walk.** If a unit test can assert it, the device walk must not repeat it — the walk exists for what only a device shows: typography, shadows, gesture feel, performance, and the `verify: emulator` behaviours deferred from steps 6–7. The `device-qa` skill assembles the checklist.

## Team

Five personas plus five reviewers. Dispatch `@name` (subagent, `.claude/agents/`) for file-producing work; use `[name]` inline (`moneyapp-expert-panel` skill) for advisory consults. Detailed step mechanics live in Sarah's agent file.

- **sarah** — orchestration lead: sequences steps, approves plans, owns the status label on each task's issue and escalation
- **marcus** — product designer: flows, screens, design system
- **layla** — financial domain: formulas, rules, categories
- **tariq** — technical lead: architecture, spec, task breakdown, plans
- **dev** — implements per approved plan only; no code without a spec and a reviewer-approved plan
- **task-reviewer · plan-reviewer · impl-reviewer · pr-reviewer · quality-reviewer** — each reviews only artifacts it did not author

No agent reviews its own output; that is the point of the five. `@pr-reviewer` is deliberately restricted to what step 7 could not see — real-runner CI, drift against a moved `main`, the squashed commit, diff membership, step 7 escapes. Quality and efficiency are not on that list either; they are `@quality-reviewer`'s at step 9. If either stops finding anything outside its own list, collapse it into step 7 rather than keeping a ceremonial gate.

Domain sovereignty: product/UX → marcus · financial logic → layla · architecture → tariq · implementation → dev · review verdicts → the reviewer for that gate · sequencing → sarah. Vague request → push back and disambiguate before building. Routine disagreements: the responsible lead decides and records the rationale.

Gotcha: **editing an agent definition is snapshotted at session start; creating a new one is not.** A *new* file in `.claude/agents/` registers and becomes dispatchable immediately, but *editing* an existing one does not affect subagents dispatched later in that same session — they still run the old definition, silently and convincingly. The dangerous combination is doing both at once: the new agent is live while the orchestrator that is supposed to dispatch it is not. Restart the session before testing any agent change. Path-scoped rules in `.claude/rules/` have neither problem; they load live, including inside subagents.

### Critical triggers (wake the user; everywhere else proceed)

1. Product/domain disagreement Marcus and Layla cannot resolve
2. Cross-scope impact — a decision binds a future scope or task non-obviously
3. High blast radius — feature-flag flip, V1 deletion, migration with data-loss risk
4. New dependency, native code change, anything outside the established stack
5. User-facing copy with voice/branding weight (field labels and error messages stay team-decided)
6. Scope balloon vs the original brief
7. Auth / secure store / data-loss surface
8. Manual device QA — always

Not critical (team decides): field-level UX, naming, file structure, test approach, code style, task order within a scope, hex→token swaps, a11y polish, minor dep bumps.

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
docs/scopes/          workflow state: one folder per scope (see TEMPLATES.md)
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
