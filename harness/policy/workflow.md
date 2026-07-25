# Workflow

## Durable Initiative State

The immutable initiative ledger under
`docs/superpowers/initiatives/<initiative-id>/events/` is the workflow
authority after Phase 2. Chat text, an open editor, a task title, and inferred
artifact presence are not workflow state.

- On every resume, run `npm run workflow -- status --id <initiative-id> --json`
  before recommending or recording work. When the ID is omitted, the command
  may select only a unique ledger for the current branch.
- Create a new ledger with `npm run workflow -- init` before plan or
  implementation work. Resume an existing initiative by appending typed
  initiative-level events; never create a global active-state file.
- Use the exact `sequence` reported by status as `--expected-sequence`.
- Only `npm run workflow -- verify` may record verification results. A typed
  status or verification command never gains push, PR, merge, or destructive
  repository authority.
- `integration_ready` means the required evidence is fresh. Push, PR creation,
  merge, and destructive repository operations still require an explicit user
  request.

## How the Team Plugs Into Superpowers

Phase mapping (skills are authoritative — personas contribute to their outputs). Interactive phases run in the **main thread** via inline `[name]` personas; non-interactive phases dispatch `@name` subagents:

1. **Brainstorm** — `brainstorming` · @marcus + @layla shape product + financial intent. Sarah orchestrates internally — no per-question user check-ins.
2. **Design doc** — `docs/superpowers/specs/YYYY-MM-DD-{feature}-design.md` · @tariq synthesizes; embeds @marcus's UX and @layla's formulas.
3. 🛑 **Spec sign-off (user-facing gate)** — Sarah presents the finished spec to the user before plan-writing begins. The only brainstorm/spec touchpoint with the human.
4. **Plan** — `writing-plans` · @tariq writes; lands in `docs/superpowers/plans/YYYY-MM-DD-{feature}.md`. **Sarah approves plans on the user's behalf.** No user check-in unless a critical trigger fires.
5. **Execute** — `executing-plans` or `subagent-driven-development`, in an isolated git worktree (`using-git-worktrees`) · @dev implements.
6. **Code review** — `requesting-code-review` with @tariq's lens. **Tariq returns a review verdict and merge recommendation.** Merging requires an explicit user request and green verification.
7. 🛑 **Device QA gate (user-facing)** — only the user can walk the manual QA matrix on a real device. Always escalated.

## Notion Docs

[PRD](https://app.notion.com/p/351c90e418b681709371cadb86fb1dfa) · [Tech Spec v1.1](https://app.notion.com/p/351c90e418b681eeab72c1f9ab32a541) · [QA & Test Plan](https://app.notion.com/p/351c90e418b6817281ebde95a5eac550) · [M1 Cycle Tracker](https://app.notion.com/p/351c90e418b681268bb4c033a59749a9)
