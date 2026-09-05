---
name: boundaries
description: "Use when an epic or a task exists and its scope must be investigated and locked before any code: '/boundaries <n>', 'brainstorm epic N', 'investigate N', 'write the full ticket for N', 'lock the scope of N', or a title-only issue at Todo. Phase 2 of the define workflow: codebase evidence, one question at a time, then the body rewritten and locked at Defined. Not for creating the issue (epic) or cutting tasks (tickets)."
argument-hint: "<epic or task number>"
---

# Boundaries

Phase 2 of the define workflow. Interview the user from codebase evidence until the issue's scope stops moving, then lock the body. Works on an epic or on a task. An epic locks Building, Not building and Rules. A task, a bug or a chore recorded as a title to be done later, locks Acceptance, Rules and Context, so an agent can deliver it without this conversation. Main thread throughout: the interview cannot be delegated. Writes nothing to disk. The `unslop` skill binds the body.

## Preconditions

`bash scripts/board.sh get <n>` prints `Todo` and `gh issue view <n> --json body --jq .body` has no `Scope locked` line. Defined or later: say so and stop; there is nothing to do here. Not on the board yet: `bash scripts/board.sh status <n> Todo` first.

Kind: an issue with the `epic` label is an epic; anything else is a task. A task at Todo has two exits and the user picks by invoking: `/tickets <n>` cuts it into sub-issues, this skill defines it as one leaf.

## Method

1. **Read the issue and its neighbours.** `gh issue view <n>`. Epic: every other epic on the milestone, `gh issue list --milestone "<m>" --label epic --state all`, and their open tickets, so a boundary here does not overlap one there. Task: its parent, `gh api repos/MustaMohamed/MoneyApp/issues/<n>/parent --jq '.number, .body'` (exit 1 when it has none), and its siblings, `gh api repos/MustaMohamed/MoneyApp/issues/<parent>/sub_issues --jq '.[] | "\(.number) \(.title)"'`, so Rules carries the parent's and Out of scope names the sibling that owns each exclusion. A parent body from before the standard has no `## Rules`; its Not building and every heading ending in `rules` stand in for it.
2. **Evidence before questions.** Dispatch up to four read-only scouts in one message, `subagent_type: Explore`, breadth "medium", each with the issue body and, for a task, the parent body:
   - code: the modules and screens the Building list, or the task's title, touches, with files, symbols and call sites. Task: also what the code does today on that path against what the title asks, and the smallest set of files a change touches;
   - prior art: related PRs (`gh pr list --state all --search "<feature words>"`), sibling features, the installed catalog (`npm run ui:inventory`);
   - history: `docs/superpowers/reviews/` audits and `docs/adr/` decisions on those modules;
   - danger: SQLite migrations, money paths, onboarding resume state, routes under `src/app/`, native config in `app.json`.

   Reports stay in this session. Task: when the code scout cannot say what the screen shows, reproduce it once with the `emulator-verify` skill before the first question, one path and one interaction, and write what the screen showed into Context in words.
3. **One question at a time.** Multiple choice, recommended option first and marked. Every question comes from what the scouts found, never from a template. `[layla]` answers money questions inline, `[marcus]` flow and screen questions, `[tariq]` feasibility (the `moneyapp-expert-panel` skill). Stop when answers stop changing the body.
4. **Decisions land as you go.** Epic: every decided edge goes into Rules in plain words at once; `/tickets` turns each rule into acceptance lines on the ticket that owns it, so a rule not written here is lost. Task: what must be true to accept goes into Acceptance, what binds the work goes into Rules, and what the scouts showed goes into Context. There is no scenario table and no spec.
5. **Spike** when a question can only be answered by code: `git worktree add .claude/worktrees/spike-<n> origin/main`, try it there, write the answer into Rules or Not building, then `git worktree remove --force .claude/worktrees/spike-<n>`. Spike code never survives.
6. **Mockup is a ticket by default**; MA-014 on #378 is the pattern. Draw only when a boundary cannot be settled in words, then one artifact with the `design` skill, its URL under Links. A task whose design already exists links it under Links; a task that needs a new one names the design ticket in Depends on.
7. **Before the gate:** two or three approaches, recommendation first, then the strongest objections to it and what would make it wrong.
8. **Gate.** Present the full rewritten body, per [epic-body.md](../epic/references/epic-body.md) for an epic or [ticket-body.md](../tickets/references/ticket-body.md) for a task, and ask exactly: **"Lock this scope?"** Yes, epic: write it with `Scope locked <today>` as the first line, `gh issue edit <n> --body "$BODY"`, then `bash scripts/board.sh status <n> Defined`. Yes, task: write it with the header line first, `gh issue edit <n> --body "$BODY"`, `bash scripts/board.sh status <n> Defined`, then `bash scripts/board.sh promote <parent>` when it has a parent, so a task with nothing open in Depends on becomes pullable. Anything else is a revision request: revise and ask again. Earlier enthusiasm is not approval.

**Blocked.** When the boundaries cannot lock until another issue ships: `bash scripts/board.sh status <n> Blocked`, then `gh issue comment <n> --body "Blocked on #<m>: <why>"`, and stop.

## Reply after the lock

Epic: the issue URL, the number of Rules, and `Next: /issue-review <n>`, then `/tickets <n>`. Task: the issue URL, its board Status, and `Next: /issue-review <n>`.
