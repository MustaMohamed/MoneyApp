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
