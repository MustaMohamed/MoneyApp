# Harness Phase 1 Before-State Baseline

Captured from the clean `refactor/harness-phase-1-implementation` worktree before
Phase 1 implementation changes.

- Base commit: `7f235c27490d4c8f042317aee91a71186207f3b9`
- Base ref: `refactor/project-harness-automation`
- Worktree `HEAD` at capture: `7f235c27490d4c8f042317aee91a71186207f3b9`

## Tracked harness-surface file count

Command:

```bash
git ls-files AGENTS.md CLAUDE.md .agents .claude .codex | wc -l
```

Raw output:

```text
     120
```

Measured count: **120 tracked files**.

## Adapter line counts

Command:

```bash
wc -l AGENTS.md CLAUDE.md .codex/agents/*.toml .claude/agents/*.md \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md \
  .claude/commands/*.md
```

Raw output:

```text
     275 AGENTS.md
     275 CLAUDE.md
      66 .codex/agents/dev.toml
      52 .codex/agents/layla.toml
      60 .codex/agents/marcus.toml
      51 .codex/agents/sarah.toml
      77 .codex/agents/tariq.toml
      69 .claude/agents/dev.md
      56 .claude/agents/layla.md
      64 .claude/agents/marcus.md
      55 .claude/agents/sarah.md
      81 .claude/agents/tariq.md
     327 .agents/skills/moneyapp-expert-panel/SKILL.md
     297 .claude/skills/moneyapp-expert-panel/SKILL.md
      14 .claude/commands/feature.md
      12 .claude/commands/status.md
    1831 total
```

Measured count: **1,831 total lines** across the enumerated adapters.

## Shared-skill differences

Command:

```bash
moneyapp_skill_diff_count=0
while IFS= read -r moneyapp_skill_file; do
  moneyapp_skill_peer=".claude/${moneyapp_skill_file#.agents/}"
  if test -f "$moneyapp_skill_peer" && ! cmp -s "$moneyapp_skill_file" "$moneyapp_skill_peer"; then
    moneyapp_skill_diff_count=$((moneyapp_skill_diff_count + 1))
  fi
done < <(git ls-files '.agents/skills/**/SKILL.md')
echo "shared_skill_differences=$moneyapp_skill_diff_count"
```

Raw output:

```text
shared_skill_differences=7
```

Measured count: **7 shared-skill differences**.

## Stale live-policy claims

Command:

```bash
rg -n 'signals-react|Babel signals transform is installed|approve and merge|Gate 1|Gate 2' \
  AGENTS.md CLAUDE.md .agents .claude .codex
```

Raw output:

```text
AGENTS.md:35:Phase mapping (skills are authoritative — personas contribute to their outputs). Interactive phases (Brainstorm, Gate 1, Gate 2) run in the **main thread** via inline `[name]` personas; non-interactive phases dispatch `@name` subagents:
AGENTS.md:138:**Signals rollback:** `@preact/signals-react` and its Babel transform are not installed. Reintroducing Signals requires a new approved plan, dependency change, and migration guidance update.
.codex/agents/dev.toml:8:- Preact Signals custom hooks (`@preact/signals-react`)
.codex/agents/dev.toml:38:- **Signals migration shape:** for migrated state, use `@preact/signals-react`, not a Zustand compatibility adapter. Shared/global domain stores use small class-based stores that own their `signal(...)` refs and dependencies, and expose the singleton through a `useXStore()` facade such as `useAccountStore()`, `useOnboardingStore()`, or `useAppReadyStore()`. Internal screen/component state uses hook-based stores with `useSignal(...)` inside the hook and responsibility names such as `useReadyScreenState()` or `useClustersSetup()` only when "setup" is part of the feature language. Keep writable signals private and mutate through returned flat actions. The Babel signals transform is installed, so do not add empty `useSignals()` calls for render tracking. Use explicit runtime helpers only for specific behavior (`useSignalEffect`, `untracked`, `computed`, `batch`). Put `init` inside the hook when initialization belongs to that state boundary and wire async operation state through `useAsync(...)` + `useInit(...)`; prefer `useAsync` loading/error refs over custom shared store `isLoading`/`isError` signals unless operation state must be global. Return signal refs under `state` and actions as flat functions. Consumers destructure directly: `const { state, init, upsertClusters, deleteCluster, addClusterInput, setInputField } = useClustersSetup();` and read with `.value`. Migrate one small slice at a time; never batch unrelated store migrations.
.claude/agents/dev.md:42:- **Signals migration shape:** for migrated state, use custom hooks with `@preact/signals-react`, not a Zustand compatibility adapter. Name hooks for their responsibility. Shared/global domain stores use small class-based stores that own their `signal(...)` refs and dependencies; internal screen/component state uses hook-based stores with `useSignal(...)` inside the hook. Keep writable signals private and mutate through returned flat actions. The Babel signals transform is installed, so do not add empty `useSignals()` calls for render tracking. Use explicit runtime helpers only for specific behavior (`useSignalEffect`, `untracked`, `computed`, `batch`). Put `init` inside the hook when initialization belongs to that state boundary and wire async operation state through `useAsync(...)` + `useInit(...)`; prefer `useAsync` loading/error refs over custom shared store `isLoading`/`isError` signals unless operation state must be global. Return signal refs under `state` and actions as flat functions; consumers read with `.value`.
CLAUDE.md:35:Phase mapping (skills are authoritative — personas contribute to their outputs). Interactive phases (Brainstorm, Gate 1, Gate 2) run in the **main thread** via inline `[name]` personas; non-interactive phases dispatch `@name` subagents:
CLAUDE.md:138:**Signals rollback:** `@preact/signals-react` and its Babel transform are not installed. Reintroducing Signals requires a new approved plan, dependency change, and migration guidance update.
.claude/agents/tariq.md:46:- For the Zustand-to-Signals migration, enforce custom hooks named for their responsibility over a Zustand compatibility adapter. Shared/global domain stores use small class-based stores that own their `signal(...)` refs and dependencies; internal screen/component state uses hook-based stores with `useSignal(...)` inside the hook. Keep writable signals private and mutate through returned flat actions. The Babel signals transform is installed, so do not add empty `useSignals()` calls for render tracking. Use explicit runtime helpers only for specific behavior (`useSignalEffect`, `untracked`, `computed`, `batch`). `init` belongs inside the hook when initialization belongs to that state boundary and uses `useAsync(...)` + `useInit(...)`; prefer `useAsync` loading/error refs over custom shared store `isLoading`/`isError` signals unless operation state must be global. Consumers destructure directly (`const { state, init, ...actions } = useDomainHook()`) and read signal refs with `.value`. Approve only small, independently testable migration slices.
.claude/commands/feature.md:8:→ 🛑 Gate 1 (plan approval) → execute → 🛑 Gate 2 (code review).
.codex/agents/tariq.toml:8:- State: Zustand, Preact Signals (`@preact/signals-react`), Redux Toolkit, Jotai, TanStack Query
.codex/agents/tariq.toml:41:- For the Zustand-to-Signals migration, enforce Signals stores over Zustand compatibility adapters. Shared/global domain stores use small class-based stores that own their `signal(...)` refs and dependencies, exposed through a `useXStore()` facade such as `useAccountStore()`, `useOnboardingStore()`, or `useAppReadyStore()`. Internal screen/component state uses hook-based stores with `useSignal(...)` inside the hook and responsibility names such as `useReadyScreenState()` or `useClustersSetup()` only when "setup" is part of the feature language. Keep writable signals private and mutate through returned flat actions. The Babel signals transform is installed, so do not add empty `useSignals()` calls for render tracking. Use explicit runtime helpers only for specific behavior (`useSignalEffect`, `untracked`, `computed`, `batch`). `init` belongs inside the hook when initialization belongs to that state boundary and uses `useAsync(...)` + `useInit(...)`; prefer `useAsync` loading/error refs over custom shared store `isLoading`/`isError` signals unless operation state must be global. Consumers destructure directly (`const { state, init, ...actions } = useDomainHook()`) and read signal refs with `.value`. Approve only small, independently testable migration slices.
.claude/commands/status.md:9:- **Blockers** or items awaiting human approval (Gate 1 or Gate 2)
.agents/skills/moneyapp-expert-panel/SKILL.md:200:- State: Zustand, Preact Signals (`@preact/signals-react`), Redux Toolkit,
.agents/skills/moneyapp-expert-panel/SKILL.md:259:- Preact Signals custom hooks (`@preact/signals-react`)
.agents/skills/moneyapp-expert-panel/SKILL.md:285:use custom hooks named for their responsibility with `@preact/signals-react`:
.agents/skills/moneyapp-expert-panel/SKILL.md:289:the Babel signals transform is installed, explicit runtime helpers are only for
.claude/skills/moneyapp-expert-panel/SKILL.md:261:use custom hooks named for their responsibility with `@preact/signals-react`:
.claude/skills/moneyapp-expert-panel/SKILL.md:265:the Babel signals transform is installed, explicit runtime helpers are only for
```

Measured count: **18 matching lines across 10 live paths**.

Every matching live path:

```text
.agents/skills/moneyapp-expert-panel/SKILL.md
.claude/agents/dev.md
.claude/agents/tariq.md
.claude/commands/feature.md
.claude/commands/status.md
.claude/skills/moneyapp-expert-panel/SKILL.md
.codex/agents/dev.toml
.codex/agents/tariq.toml
AGENTS.md
CLAUDE.md
```

## After

Captured from the same isolated worktree after Tasks 1–8 and before the Task 9
evidence commit.

- Verification `HEAD`: `b107599224d90fc0840273852e9773383561aa99`
- Branch: `refactor/harness-phase-1-implementation`
- Capture date: 2026-07-25

### Before/after comparison

| Measure | Before | After | Change |
| --- | ---: | ---: | ---: |
| Tracked files in the broad harness-surface scan | 120 | 120 | 0 |
| Lines across the enumerated generated adapters | 1,831 | 1,233 | -598 (-32.7%) |
| Differences across all paired `.agents` / `.claude` skills | 7 | 6 | -1 |
| Broad legacy-keyword scan matching lines | 18 | 8 | -10 |
| Broad legacy-keyword scan matching paths | 10 | 8 | -2 |
| Registered generated targets | Not available | 16 | 16 registered |
| Known contradictions in registered live targets | Not mechanically validated | 0 | Validator introduced |

The tracked-file count is intentionally unchanged because Phase 1 adopts and
regenerates existing surfaces in place. The six remaining shared-skill
differences are generic workflow skills outside the sixteen registered
MoneyApp-generated targets. The MoneyApp expert-panel pair is now
byte-identical.

The broad legacy-keyword scan is intentionally not treated as the contradiction
count: all eight after-state matches are affirmative rollback statements that
say Signals is not installed or must not be used. The narrower contradiction
scan and the semantic validator both report zero violations.

### Tracked harness-surface file count

Command:

```bash
git ls-files AGENTS.md CLAUDE.md .agents .claude .codex | wc -l
```

Raw output:

```text
     120
```

Measured count: **120 tracked files**.

### Adapter line counts

Command:

```bash
wc -l AGENTS.md CLAUDE.md .codex/agents/*.toml .claude/agents/*.md \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md \
  .claude/commands/*.md
```

Raw output:

```text
     274 AGENTS.md
     274 CLAUDE.md
      52 .codex/agents/dev.toml
      46 .codex/agents/layla.toml
      46 .codex/agents/marcus.toml
      42 .codex/agents/sarah.toml
      51 .codex/agents/tariq.toml
      54 .claude/agents/dev.md
      48 .claude/agents/layla.md
      48 .claude/agents/marcus.md
      44 .claude/agents/sarah.md
      53 .claude/agents/tariq.md
      84 .agents/skills/moneyapp-expert-panel/SKILL.md
      84 .claude/skills/moneyapp-expert-panel/SKILL.md
      16 .claude/commands/feature.md
      17 .claude/commands/status.md
    1233 total
```

Measured count: **1,233 total lines** across the enumerated adapters.

### Shared-skill differences

Baseline command:

```bash
moneyapp_skill_diff_count=0
while IFS= read -r moneyapp_skill_file; do
  moneyapp_skill_peer=".claude/${moneyapp_skill_file#.agents/}"
  if test -f "$moneyapp_skill_peer" && ! cmp -s "$moneyapp_skill_file" "$moneyapp_skill_peer"; then
    moneyapp_skill_diff_count=$((moneyapp_skill_diff_count + 1))
  fi
done < <(git ls-files '.agents/skills/**/SKILL.md')
echo "shared_skill_differences=$moneyapp_skill_diff_count"
```

Raw output:

```text
shared_skill_differences=6
```

An additional path-reporting pass produced:

```text
.agents/skills/dispatching-parallel-agents/SKILL.md <> .claude/skills/dispatching-parallel-agents/SKILL.md
.agents/skills/executing-plans/SKILL.md <> .claude/skills/executing-plans/SKILL.md
.agents/skills/receiving-code-review/SKILL.md <> .claude/skills/receiving-code-review/SKILL.md
.agents/skills/using-git-worktrees/SKILL.md <> .claude/skills/using-git-worktrees/SKILL.md
.agents/skills/using-superpowers/SKILL.md <> .claude/skills/using-superpowers/SKILL.md
.agents/skills/writing-skills/SKILL.md <> .claude/skills/writing-skills/SKILL.md
shared_skill_differences=6
```

These six paths are not registered generated targets in
`harness/manifest.json`; Phase 1 does not rewrite generic historical or
upstream skill text.

### Broad legacy-keyword scan

Baseline command:

```bash
rg -n 'signals-react|Babel signals transform is installed|approve and merge|Gate 1|Gate 2' \
  AGENTS.md CLAUDE.md .agents .claude .codex
```

Raw output:

```text
AGENTS.md:137:**Signals rollback:** `@preact/signals-react` and its Babel transform are not installed. Reintroducing Signals requires a new approved plan, dependency change, and migration guidance update.
CLAUDE.md:137:**Signals rollback:** `@preact/signals-react` and its Babel transform are not installed. Reintroducing Signals requires a new approved plan, dependency change, and migration guidance update.
.codex/agents/dev.toml:24:- Do not use `@preact/signals-react`; the package is not installed.
.codex/agents/tariq.toml:21:- Do not use `@preact/signals-react`; the package is not installed.
.claude/skills/moneyapp-expert-panel/SKILL.md:59:Do not use `@preact/signals-react`; the package is not installed.
.claude/agents/tariq.md:25:- Do not use `@preact/signals-react`; the package is not installed.
.claude/agents/dev.md:28:- Do not use `@preact/signals-react`; the package is not installed.
.agents/skills/moneyapp-expert-panel/SKILL.md:59:Do not use `@preact/signals-react`; the package is not installed.
```

Measured count: **8 matching lines across 8 live paths**.

Every matching path:

```text
.agents/skills/moneyapp-expert-panel/SKILL.md
.claude/agents/dev.md
.claude/agents/tariq.md
.claude/skills/moneyapp-expert-panel/SKILL.md
.codex/agents/dev.toml
.codex/agents/tariq.toml
AGENTS.md
CLAUDE.md
```

### Manifest contract

Command:

```bash
node -e "const m=require('./harness/manifest.json'); console.log(JSON.stringify({policyModules:m.policyOrder.length,personas:m.personas.length,generatedTargets:m.targets.length,verificationChecks:m.verification.checks.map((c)=>c.id)},null,2))"
```

Raw output:

```json
{
  "policyModules": 6,
  "personas": 5,
  "generatedTargets": 16,
  "verificationChecks": [
    "format",
    "lint",
    "typecheck",
    "test",
    "doctor",
    "prebuild"
  ]
}
```

This matches the approved fixed Phase 1 contract.

### Generated-target budgets and live semantic result

Command:

```bash
npm run harness:check
```

Raw output:

```text
> moneyapp@1.0.0 harness:check
> node scripts/harness/check.js

Harness budget AGENTS.md: 274 lines, 22544 bytes
Harness budget CLAUDE.md: 274 lines, 22563 bytes
Harness budget .codex/agents/sarah.toml: 42 lines, 2515 bytes
Harness budget .claude/agents/sarah.md: 44 lines, 2556 bytes
Harness budget .codex/agents/marcus.toml: 46 lines, 2782 bytes
Harness budget .claude/agents/marcus.md: 48 lines, 2822 bytes
Harness budget .codex/agents/layla.toml: 46 lines, 2680 bytes
Harness budget .claude/agents/layla.md: 48 lines, 2709 bytes
Harness budget .codex/agents/tariq.toml: 51 lines, 3041 bytes
Harness budget .claude/agents/tariq.md: 53 lines, 3087 bytes
Harness budget .codex/agents/dev.toml: 52 lines, 3010 bytes
Harness budget .claude/agents/dev.md: 54 lines, 3045 bytes
Harness budget .agents/skills/moneyapp-expert-panel/SKILL.md: 84 lines, 3926 bytes
Harness budget .claude/skills/moneyapp-expert-panel/SKILL.md: 84 lines, 3926 bytes
Harness budget .claude/commands/feature.md: 16 lines, 639 bytes
Harness budget .claude/commands/status.md: 17 lines, 614 bytes
Harness valid (16 generated targets)
```

The command exited 0 and emitted no semantic-rule error: **zero known
contradictions across registered live targets**.

### Narrow contradiction scan

Command:

```bash
rg -n 'Babel signals transform is installed|Signals migration shape:|for migrated state, use `@preact/signals-react`|approve(s)? (and|&) merge(s)?|merge(s)? code reviews on the user.s behalf|Gate 1 \(plan approval\)|Gate 2 \(code review\)' \
  AGENTS.md CLAUDE.md .agents .claude .codex
```

Raw output: no matching lines. `rg` exited 1, its documented no-match status.

## Generation idempotence

Commands:

```bash
npm run harness:generate
shasum AGENTS.md CLAUDE.md .codex/agents/*.toml .claude/agents/*.md \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md .claude/commands/*.md
npm run harness:generate
shasum AGENTS.md CLAUDE.md .codex/agents/*.toml .claude/agents/*.md \
  .agents/skills/moneyapp-expert-panel/SKILL.md \
  .claude/skills/moneyapp-expert-panel/SKILL.md .claude/commands/*.md
```

First checksum list:

```text
9f0591a09bd462d5933d0eb8ecd0d931baefaf01  AGENTS.md
ee3348c6aef773173fc8365af4981b6fe6d7c61e  CLAUDE.md
8e4c713fad8719a4720440b056f4ed455843804d  .codex/agents/dev.toml
b123218a74202228a6593c3af8e8d4512adf7f8f  .codex/agents/layla.toml
48961128e157325cbd9a849cf41f77efb063a827  .codex/agents/marcus.toml
80ddf35f97f8479047e86bf2c38d525ed39e5e42  .codex/agents/sarah.toml
ed810610282110b251ccf4c844c4a884edbc1931  .codex/agents/tariq.toml
9f6efbed06dc43e4a1b9bb46863371e6e98db0fb  .claude/agents/dev.md
8a1b053ba2c80acf3ae271e1f7e2972f176fd1ea  .claude/agents/layla.md
839152ceb12b8e4e930e33a55eaab9d2e0d62ca9  .claude/agents/marcus.md
f0e8a87b283cc67b2519de8e00e14adede92b75c  .claude/agents/sarah.md
29022495f83679ba88dcd23b8c5ec26bfd24483f  .claude/agents/tariq.md
c92446411126fcefc99defc76cf0242e092532cd  .agents/skills/moneyapp-expert-panel/SKILL.md
c92446411126fcefc99defc76cf0242e092532cd  .claude/skills/moneyapp-expert-panel/SKILL.md
c84427f9ddcff54167f482056285345d8fef65ab  .claude/commands/feature.md
1f8c011087427d90edf0b7ba31d87006201d64d6  .claude/commands/status.md
```

Second checksum list:

```text
9f0591a09bd462d5933d0eb8ecd0d931baefaf01  AGENTS.md
ee3348c6aef773173fc8365af4981b6fe6d7c61e  CLAUDE.md
8e4c713fad8719a4720440b056f4ed455843804d  .codex/agents/dev.toml
b123218a74202228a6593c3af8e8d4512adf7f8f  .codex/agents/layla.toml
48961128e157325cbd9a849cf41f77efb063a827  .codex/agents/marcus.toml
80ddf35f97f8479047e86bf2c38d525ed39e5e42  .codex/agents/sarah.toml
ed810610282110b251ccf4c844c4a884edbc1931  .codex/agents/tariq.toml
9f6efbed06dc43e4a1b9bb46863371e6e98db0fb  .claude/agents/dev.md
8a1b053ba2c80acf3ae271e1f7e2972f176fd1ea  .claude/agents/layla.md
839152ceb12b8e4e930e33a55eaab9d2e0d62ca9  .claude/agents/marcus.md
f0e8a87b283cc67b2519de8e00e14adede92b75c  .claude/agents/sarah.md
29022495f83679ba88dcd23b8c5ec26bfd24483f  .claude/agents/tariq.md
c92446411126fcefc99defc76cf0242e092532cd  .agents/skills/moneyapp-expert-panel/SKILL.md
c92446411126fcefc99defc76cf0242e092532cd  .claude/skills/moneyapp-expert-panel/SKILL.md
c84427f9ddcff54167f482056285345d8fef65ab  .claude/commands/feature.md
1f8c011087427d90edf0b7ba31d87006201d64d6  .claude/commands/status.md
```

Both generation commands reported `Generated 16 harness targets`. The lists are
byte-identical, a subsequent `npm run harness:check` exited 0, and
`git status --short` remained empty.

## Focused regression evidence

### Full Node harness suite

Command:

```bash
npm run harness:test
```

Exact summary:

```text
ℹ tests 247
ℹ suites 0
ℹ pass 246
ℹ fail 0
ℹ cancelled 0
ℹ skipped 1
ℹ todo 0
```

The one skipped case is the capability-gated
`resolve rejects an exact existing component with an additional folded alias`;
the current filesystem does not preserve case-distinct sibling entries.

### Structural rejection fixtures

Command:

```bash
node --test --test-name-pattern='direct target edits|generated files not registered|different consecutive render passes' scripts/harness/__tests__/structure.test.js
```

Raw focused output:

```text
✔ direct target edits fail generation parity
✔ generated files not registered in the manifest fail
✔ different consecutive render passes fail determinism
ℹ tests 3
ℹ suites 0
ℹ pass 3
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Fixture-to-stable-identifier evidence:

| Fixture | Stable rule identifier |
| --- | --- |
| `direct-generated-edit` | `GENERATION-PARITY` |
| `unregistered-generated-output` | `UNREGISTERED-GENERATED-OUTPUT` |
| `nondeterministic-generation` | `NONDETERMINISTIC-GENERATION` |

### Semantic rejection fixtures

Command:

```bash
node --test --test-name-pattern='reports ' scripts/harness/__tests__/semantics.test.js
```

Exact focused summary:

```text
ℹ tests 29
ℹ suites 0
ℹ pass 29
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
```

Every declared semantic fixture produced its intended stable rule identifier:

| Fixture | Stable rule identifier |
| --- | --- |
| `signals-installed` | `STACK-NO-SIGNALS` |
| `signals-use-directive` | `STACK-NO-SIGNALS` |
| `signals-prefer-directive` | `STACK-NO-SIGNALS` |
| `signals-enforce-directive` | `STACK-NO-SIGNALS` |
| `signals-migrate-directive` | `STACK-NO-SIGNALS` |
| `signals-stack-claim` | `STACK-NO-SIGNALS` |
| `signals-transform-installed` | `STACK-NO-SIGNALS` |
| `agent-merge-authority` | `AUTH-USER-INTEGRATION` |
| `obsolete-gates` | `GATE-SPEC-SIGNOFF` |
| `missing-src-prefix` | `PATH-SRC-CANONICAL` |
| `divergent-persona-ownership` | `PERSONA-MARCUS-OWNERSHIP` |
| `missing-critical-trigger` | `GATE-CRITICAL-TRIGGER` |

The additional seventeen focused cases exercise coordinated, contrastive,
mixed, implicit, and unqualified positive Signals guidance; every case reports
`STACK-NO-SIGNALS`.

## Verification evidence

### Focused commands

The Task 9 commands produced:

| Command | Result |
| --- | --- |
| `npm run harness:check` | Exit 0; `Harness valid (16 generated targets)` |
| `npm run validate:agent-assets` | Exit 0; generic assets validated, then canonical harness valid |
| `npm run format:check` | Exit 0; 737 files checked |
| `npm run lint` | Exit 0; 1,603 warnings and zero errors |
| `npm run typecheck` | Exit 0; typed-route generation and `tsc --noEmit` completed |
| `npm test -- --ci` | Exit 0; 211 suites and 1,902 tests passed |

The type-aware lint warnings are the repository's current non-blocking
baseline. This tooling-only task does not change application or generic test
source to address them.

Exact Jest summary:

```text
Test Suites: 211 passed, 211 total
Tests:       1902 passed, 1902 total
Snapshots:   0 total
Time:        2.337 s
Ran all test suites.
```

### Canonical six-check verification

Command:

```bash
npm run verify:pr
```

The first sandboxed attempt completed `format`, `lint`, `typecheck`, and `test`,
then failed at `doctor` because the sandbox could not resolve
`registry.npmjs.org`:

```text
npm error code ENOTFOUND
npm error syscall getaddrinfo
npm error network request to https://registry.npmjs.org/expo-doctor failed, reason: getaddrinfo ENOTFOUND registry.npmjs.org
PR verification failed at doctor
```

The complete command was rerun with the required network permission. It exited
0 after executing all checks in manifest order:

1. `format` — `All matched files use the correct format.`; 737 files.
2. `lint` — exit 0; generic assets and `Harness valid (16 generated targets)`;
   1,603 warnings and zero errors.
3. `typecheck` — exit 0 after typed-route generation and `tsc --noEmit`.
4. `test` — 211 suites and 1,902 tests passed.
5. `doctor` — `19/19 checks passed. No issues detected!`
6. `prebuild` — Android directory reused, `package.json` had no changes, and
   `✔ Finished prebuild`.

Exact successful tail:

```text
Test Suites: 211 passed, 211 total
Tests:       1902 passed, 1902 total
Snapshots:   0 total
Time:        2.353 s
Ran all test suites.
Running 19 checks on your project...
19/19 checks passed. No issues detected!
- Creating native directory (./android)
✔ Created native directory | reusing /android
- Updating package.json
› Using react-native@0.83.6 instead of recommended react-native@0.83.10.
- Updating package.json
✔ Updated package.json | no changes
- Running prebuild
✔ Finished prebuild
CI parity green — safe to request push authorization
```

The generated `android/` directory remains present and ignored by
`.gitignore:58:/android`; it was not cleaned.

### Separate known coverage baseline

`npm run test:coverage` is not one of the six registered publish-readiness
checks. It ran separately to preserve the known application-coverage baseline.
All tests passed, but the command exited 1 on existing global branch and
function thresholds:

```text
All files | 94.66 % statements | 82.35 % branches | 89.28 % functions | 94.36 % lines
Jest: "global" coverage threshold for branches (100%) not met: 82.35%
Jest: "global" coverage threshold for functions (95%) not met: 89.28%

Test Suites: 211 passed, 211 total
Tests:       1902 passed, 1902 total
Snapshots:   0 total
Time:        2.632 s
Ran all test suites.
```

The configured 80% line threshold is met. The remaining coverage baseline is
therefore **17.65 percentage points below the branch threshold** and **5.72
percentage points below the function threshold**. No application coverage was
changed by Phase 1.

## Commit and preservation evidence

`git rev-parse HEAD` immediately before the Task 9 evidence edit:

```text
b107599224d90fc0840273852e9773383561aa99
```

Implementation commits from the signed base through the verification head:

```text
cc0c10d51535f4c2a2e8e4650de9b42f406bd3f9 docs: capture harness phase 1 baseline
c0431f1020ccdf3bea14d83b22498def69f00ba5 test: add bounded harness manifest model
737cb560bd400e048fab261f4fe94a34af9101c0 feat: add deterministic harness renderer
e373171ffe27d625af533334f659baa0f94f32b3 fix: enforce harness source ownership
d4b21ae9074e6a445893ee984b7c45ae912acba3 feat: validate harness semantics and repository facts
242393e11c615317c8e70494c9d15fa7ac486ccd fix: isolate harness node tests from jest
a5816b56e54dced3b86737d9545662925d3c686e docs: generate canonical root harness policy
7deae7aeb653550f2b9f33a05f85756864fb03df docs: generate canonical MoneyApp personas
4016a9f2b41bfaa5d135d96c180817246430bc06 docs: generate canonical Claude workflow commands
f4fe9490fc27d361cfe32b5ef9c1496d582dfd55 feat: make publish readiness executable
b107599224d90fc0840273852e9773383561aa99 ci: enforce canonical harness validation
```

The Task 9 pre-verification and post-verification
`git worktree list --porcelain` outputs were byte-identical:

```text
worktree /Users/musta/Code/projects/practice/MoneyApp
HEAD 7f235c27490d4c8f042317aee91a71186207f3b9
branch refs/heads/refactor/project-harness-automation

worktree /Users/musta/Code/projects/practice/MoneyApp/.worktrees/dashboard-performance-snapshot
HEAD 4880043fa685e6e0b2756a6c9f531b6a9be34117
branch refs/heads/perf/dashboard-owned-snapshot

worktree /Users/musta/Code/projects/practice/MoneyApp/.worktrees/harness-phase-1
HEAD b107599224d90fc0840273852e9773383561aa99
branch refs/heads/refactor/harness-phase-1-implementation

worktree /Users/musta/Code/projects/practice/MoneyApp/.worktrees/onboarding-heroui-redesign
HEAD 94e36d6602bb62b0993e27cb49e9297935303081
branch refs/heads/feat/onboarding-heroui-redesign

worktree /Users/musta/Code/projects/practice/MoneyApp/.worktrees/startup-async-ownership
HEAD 003691a08318a3d6267bc2a2182fcf5e7a92a3e4
branch refs/heads/fix/startup-async-ownership
```

The Task 9 pre-verification and post-verification `git -C ../.. status --short`
outputs were also identical:

```text
?? docs/superpowers/reviews/2026-07-23-whole-app-quality-performance-audit.md
```

The unrelated main-checkout audit remains untracked and was not staged, copied,
removed, or edited by this worktree. Its post-verification checksum is:

```text
df9dcb2d2317213ae2b3e1f38a899c99feb85c4f  ../../docs/superpowers/reviews/2026-07-23-whole-app-quality-performance-audit.md
```

Phase 1 changes tooling and policy only. No product-behavior device QA matrix
is inferred or required.
