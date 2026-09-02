---
name: boundaries
description: "Use when an epic exists and its scope must be brainstormed and locked: '/boundaries <epic>', 'brainstorm epic N', 'lock the scope of N', or when an epic sits at Todo. Phase 2 of the define workflow: codebase evidence, one question at a time, then the epic body rewritten and locked at Defined. Not for creating the epic (epic) or cutting tasks (tickets)."
argument-hint: "<epic number>"
---

# Boundaries

Phase 2 of the define workflow. Interview the user from codebase evidence until the epic's Building, Not building and Rules stop moving, then lock the body. Main thread throughout: the interview cannot be delegated. Writes nothing to disk. The `unslop` skill binds the body.

## Preconditions

`bash scripts/board.sh get <n>` prints `Todo` and `gh issue view <n> --json body --jq .body` has no `Scope locked` line. Defined or later: say so and stop; there is nothing to do here. Not on the board yet: `bash scripts/board.sh status <n> Todo` first.

## Method

1. **Read the epic and its siblings.** `gh issue view <n>`, then every other epic on the milestone, `gh issue list --milestone "<m>" --label epic --state all`, and their open tickets, so a boundary here does not overlap one there.
2. **Evidence before questions.** Dispatch up to four read-only scouts in one message, `subagent_type: Explore`, breadth "medium":
   - code: the modules and screens the Building list touches, with files, symbols and call sites;
   - prior art: related PRs (`gh pr list --state all --search "<feature words>"`), sibling features, the installed catalog (`npm run ui:inventory`);
   - history: `docs/superpowers/reviews/` audits and `docs/adr/` decisions on those modules;
   - danger: SQLite migrations, money paths, onboarding resume state, routes under `src/app/`, native config in `app.json`.

   Reports stay in this session.
3. **One question at a time.** Multiple choice, recommended option first and marked. Every question comes from what the scouts found, never from a template. `[layla]` answers money questions inline, `[marcus]` flow and screen questions, `[tariq]` feasibility (the `moneyapp-expert-panel` skill). Stop when answers stop changing Building, Not building or Rules.
4. **Rules grow as you go.** Every decided edge goes into Rules in plain words at once. There is no scenario table and no spec. `/tickets` turns each rule into acceptance lines on the ticket that owns it, so a rule not written here is lost.
5. **Spike** when a question can only be answered by code: `git worktree add .claude/worktrees/spike-<n> origin/main`, try it there, write the answer into Rules or Not building, then `git worktree remove --force .claude/worktrees/spike-<n>`. Spike code never survives.
6. **Mockup is a ticket by default**; MA-014 on #378 is the pattern. Draw only when a boundary cannot be settled in words, then one artifact with the `design` skill, its URL under Links.
7. **Before the gate:** two or three approaches, recommendation first, then the strongest objections to it and what would make it wrong.
8. **Gate.** Present the full rewritten body per [epic-body.md](../epic/references/epic-body.md) and ask exactly: **"Lock this scope?"** Yes: write it with `Scope locked <today>` as the first line, `gh issue edit <n> --body "$BODY"`, then `bash scripts/board.sh status <n> Defined`. Anything else is a revision request: revise and ask again. Earlier enthusiasm is not approval.

**Blocked.** When the boundaries cannot lock until another epic ships: `bash scripts/board.sh status <n> Blocked`, then `gh issue comment <n> --body "Blocked on #<m>: <why>"`, and stop.

## Reply after the lock

The issue URL, the number of Rules, and `Next: /issue-review <n>`, then `/tickets <n>`.
