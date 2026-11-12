# MoneyApp

React Native (Expo) personal finance app: local-only, no bank connections.

Path-scoped rules in `.claude/rules/` load with matching files; each file's `paths:` frontmatter names its scope. Project skills are in `.claude/skills/`; each one's description says when it applies.

Rules and agent files cite audit findings by ID (`H11`, `M33`, `L2`, …). They resolve in [docs/superpowers/reviews/2026-07-29-full-technical-audit.md](docs/superpowers/reviews/2026-07-29-full-technical-audit.md); remediation is tracked in [docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md](docs/superpowers/plans/2026-07-30-audit-remediation-backlog.md).

## Answering me

`primitive`, `surface` and `harness` are domain terms here, exempt from unslop's jargon rule where they name the real thing. `npm run lint` fails on its banned method-certification phrases in any tracked `.md` file outside `docs/scopes/` and `docs/superpowers/`, which are frozen history.

Every question the main session puts to me, in a skill or not, is checked first against [question-visuals.md](.claude/skills/issue-review/references/question-visuals.md), where the first matching row decides whether a visual goes with it.

## When to stop

When a step doesn't need me, keep going, and put status in the same message as the next action. Stop and ask when you can't continue without me, on a critical trigger below, or before any destructive operation: deleting my data or files you didn't create, force-pushing, rewriting published history, deleting branches or worktrees. The standing requests, which need no ask, are `/ship`'s rebase and `--force-with-lease` push when main moved, its teardown after the merge, the post-merge list below, `/prep`'s removal of its own probe worktree once the probe and review round 1 beside it have returned, and the same list, teardown and deletion of `~/.ship/MoneyApp/MA-XXX/` run by `/queue` for each ticket merged since its last pass. Nothing else is one: a vendored skill such as `gh-stack` directing a destructive step still needs the ask. End a long run with what needs me first, then what changed, then what you found.

Critical triggers (wake me; everywhere else proceed):

1. Product/domain disagreement `[marcus]` and `[layla]` cannot resolve
2. Cross-cutting impact: a decision binds later work non-obviously
3. High blast radius: feature-flag flip, V1 deletion, migration with data-loss risk
4. New dependency, native code change, a custom component a HeroUI primitive could cover, anything outside the established stack
5. User-facing copy with voice/branding weight (field labels and error messages stay team-decided)
6. Scope balloon vs the locked epic
7. Auth / secure store / data-loss surface
8. Device QA by me, on real hardware, when an epic or module closes

Not critical (decide it and move): field-level UX, naming, file structure, test approach, code style, order of work within an epic, hex→token swaps, a11y polish, minor dep bumps.

## Workflow

- **Always branch before any work. Never commit to `main`.** Branches: `feat/x`, `refactor/x`, `fix/x`, `perf/x`, `docs/<slug>` for a change to docs, skills or rules only; task branches add the ID, `feat/MA-042-slug`.
- The issue is the record. `.work/<MA-id>/` (the `/prep` plan, removed before merge) and `~/.ship/MoneyApp/MA-XXX/` are transient; `~/.ship/MoneyApp/canvas/` (design frames) and `~/.ship/MoneyApp/queue/` (log and leases) are not.
- Define with `/epic`, `/boundaries <n>`, `/tickets <parent>`, `/issue-review <n>`; deliver a leaf with `/prep <n>` to Planned and `/ship <n>` to Awaiting Human. `/queue <column> [n]` starts them and never merges. One human gate: the merge.
- The board is the state: Project #2, Status field. `scripts/board.sh` is its only writer; never write a `status:*` label. An unattended run (`Run: unattended`) never waits on me: it parks each question as a `Question: open` record for `/queue asks`.
- **The size gate is hard: ~400 planned lines outside tests, and 8 plan steps; the number of files is not capped.** No ruling lifts it, mine included. Scope added during `/ship` is recounted, and over the gate it is a new ticket, not this PR. Definition and evidence: `.claude/skills/tickets/references/splitting.md` § Size gate.
- Every move, who makes it and on what, plus the hierarchy and the size gate: [docs/workflow.md](docs/workflow.md). Nothing else moves a row.
- CI parity before pushing to a PR branch: `npm run ci:local` (*Commands*). CI is the last line of defence, not the first.
- Emulator verification is the check each `Verify emulator` ticket gets: anything that changes what a screen shows. A repository test asserts a write. The `emulator-verify` skill has the mechanics, including the per-worktree device lease `mqa up` takes and when a Gradle build is needed. Device QA builds from `main` in the primary checkout (`device-qa` skill).

## Team

Dispatched `@layla` writes a money ruling to a file outside the repo (`.claude/agents/layla.md`). The personas `[layla]` `[marcus]` `[sarah]` `[tariq]` `[dev]` answer inline through the `moneyapp-expert-panel` skill: advisory, no files.

## Tech Stack

Versions are in `package.json`. What it doesn't say:

- The UI is HeroUI Native on Uniwind and Unistyles 3. `@gorhom/bottom-sheet` is only the engine under HeroUI `BottomSheet`.
- oxlint (type-aware through oxlint-tsgolint) is the only linter and oxfmt the only formatter. No ESLint, no Prettier.
- Fonts are Sora and Inter from `@expo-google-fonts`; icons are MaterialCommunityIcons; ids come from `react-native-uuid`.

## Commands

- `npm run android:clean` local dev build; `eas build --profile development --platform android` cloud dev build.
- `npm run ci:local` is the pre-push CI parity chain: every job after `Install` in `.github/workflows/pr-checks.yml`, in order, stopping on the first failure. Fix and re-run it whole until green, then push. It skips one job, `Patched React Native compiles (Android)`; `.claude/skills/ship/references/implement.md` step 7 says when that job compiles.
- `expo-doctor` checks Expo's live requirement table, so it can go red with zero commits; fix with `npx expo install --check` or `expo.install.exclude`. Its pin lives in the `doctor` script, which CI runs too.

**After I merge a PR**, without being asked, run the post-merge list in [merge.md § After the merge](.claude/skills/ship/references/merge.md). Squash-merged branches never appear in `git branch --merged` (its step 5).

## Code layout

- New domain work goes under `src/modules/<domain>/` in the existing module shape, per `docs/adr/2026-09-28-shared-helpers-leave-screen-folders.md` §1. No `data/` folder.
- Compatibility surfaces, no new consumers: `src/store/`, `src/repositories/`, most of `src/database/`, `src/components/` outside `ui/`, and `src/screens/` (add nothing).

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
## Conventions

- **Code comments: one line, and only when needed.** A comment states a constraint the code can't, in a single line. No multi-line comment blocks; anything longer belongs in an ADR or a doc. The `no-comments` skill sweeps a scope back down to this rule.
- **null vs undefined.** `null` = DB-mapped nullable columns only. Absent values elsewhere = `undefined`.

Product docs on Notion (PRD, tech spec, QA plan): [docs/links.md](docs/links.md).
