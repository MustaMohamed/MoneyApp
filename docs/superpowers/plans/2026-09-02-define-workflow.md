# Define workflow implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three standalone project skills, `/epic`, `/boundaries`, `/tickets`, that take a stated goal to standard-shaped board tickets on GitHub, plus the retirement of the `/scope` workflow they replace.

**Architecture:** Every skill is a markdown file under `.claude/skills/<name>/` that takes an issue number and reads the rest from GitHub through `gh`. One shell helper, `scripts/board.sh`, owns every write to Project #2's Status field and the sub-issue link, so no skill embeds a field or option id. Nothing about the work is written to disk. The retirement deletes nine agent files, three commands, the scope templates and the team installer, and rewrites CLAUDE.md's Workflow and Team sections.

**Tech Stack:** Claude Code skills (markdown with frontmatter), `gh` CLI 2.x with the `project` scope, bash, the repo's `scripts/validate-agent-assets.js` as the test for every `.claude/` file.

**Spec:** `docs/superpowers/specs/2026-09-02-define-workflow-design.md`

## Global constraints

- Work in the worktree `.claude/worktrees/define-workflow` on branch `docs/define-workflow-spec`, cut from `origin/main` at `2d498895`. Never commit to `main`.
- `npm run validate:agent-assets` must exit 0 after every task. It checks: skill files carry `name:` and `description:` frontmatter; command files carry `description:`; rules files carry a `paths:` list whose globs match tracked files; every path under `src/`, `__tests__/`, `scripts/`, `docs/`, `.claude/`, `.github/` named in a `.claude/` file or CLAUDE.md exists (placeholders containing `<>{}[]*` are skipped); no trailing whitespace; final newline; `.sh` files pass `bash -n`; an agent file naming a backticked `npm|npx|node|git|bash|ls|cat|grep` command must list `Bash` in `tools:`.
- The `unslop` skill binds every markdown file written here: no em dashes, sentence-case headings, no bold-label-colon lists, no decorative emoji, straight quotes.
- GitHub facts, verbatim from the spec: owner `MustaMohamed`, repo `MustaMohamed/MoneyApp`, project number `2`, project id `PVT_kwHOAPEDM84BiHOr`, Status field id `PVTSSF_lAHOAPEDM84BiHOrzhhAbFg`, options Todo `f75ad846`, Defined `c5389d5e`, Ready For Development `beea98be`, Planned `13576c63`, In Progress `47fc9ee4`, In Review `ce80cd5a`, Awaiting Human `fa6bc2d1`, Blocked `9bc3e0fb`, Done `98236657`.
- No task in this plan writes to GitHub except Task 1's one read-only probe and the post-merge section, which the user runs.
- One commit per task, message in the repo's conventional shape (`feat(workflow): …`, `chore(workflow): …`, `docs: …`), no attribution lines.

---

### Task 1: `scripts/board.sh`, the one writer to the board

**Files:**
- Create: `scripts/board.sh`

**Interfaces:**
- Produces: `bash scripts/board.sh add <issue>` prints the project item id and adds the issue to project #2 when absent · `status <issue> <Status name>` sets the Status field, adding the item first if needed, prints `#<issue> -> <Status>` · `get <issue>` prints the current Status name or nothing · `link <parent> <child>` makes child a sub-issue of parent · `next-ma` prints the next `MA-nnn`. Every later task calls these.

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# The one writer to Project #2 "MoneyApp". Ids come from
# docs/superpowers/specs/2026-09-02-define-workflow-design.md §3; change them here only.
set -euo pipefail

OWNER=MustaMohamed
REPO=MustaMohamed/MoneyApp
PROJECT=2
PROJECT_ID=PVT_kwHOAPEDM84BiHOr
STATUS_FIELD=PVTSSF_lAHOAPEDM84BiHOrzhhAbFg

option_id() {
  case "$1" in
    "Todo") echo f75ad846 ;;
    "Defined") echo c5389d5e ;;
    "Ready For Development") echo beea98be ;;
    "Planned") echo 13576c63 ;;
    "In Progress") echo 47fc9ee4 ;;
    "In Review") echo ce80cd5a ;;
    "Awaiting Human") echo fa6bc2d1 ;;
    "Blocked") echo 9bc3e0fb ;;
    "Done") echo 98236657 ;;
    *) echo "board.sh: unknown status '$1'" >&2; exit 2 ;;
  esac
}

item_id() {
  gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json \
    --jq ".items[] | select(.content.number == $1) | .id"
}

usage() {
  cat >&2 <<'EOF'
usage: bash scripts/board.sh <command> ...
  add <issue>                  put the issue on the board (idempotent), print the item id
  status <issue> <Status>      set the Status field; Status is the option name, quoted if it has spaces
  get <issue>                  print the issue's current Status name
  link <parent> <child>        make <child> a sub-issue of <parent>
  next-ma                      print the next MA-nnn (highest in any issue title, plus one)
EOF
  exit 2
}

cmd=${1:-}
[ -n "$cmd" ] || usage
shift

case "$cmd" in
  add)
    [ $# -eq 1 ] || usage
    id=$(item_id "$1")
    if [ -n "$id" ]; then
      echo "$id"
    else
      gh project item-add "$PROJECT" --owner "$OWNER" \
        --url "https://github.com/$REPO/issues/$1" --format json --jq .id
    fi
    ;;
  status)
    [ $# -eq 2 ] || usage
    opt=$(option_id "$2")
    id=$(bash "$0" add "$1")
    gh project item-edit --project-id "$PROJECT_ID" --id "$id" \
      --field-id "$STATUS_FIELD" --single-select-option-id "$opt" >/dev/null
    echo "#$1 -> $2"
    ;;
  get)
    [ $# -eq 1 ] || usage
    gh project item-list "$PROJECT" --owner "$OWNER" --limit 500 --format json \
      --jq ".items[] | select(.content.number == $1) | .status"
    ;;
  link)
    [ $# -eq 2 ] || usage
    child_id=$(gh api "repos/$REPO/issues/$2" --jq .id)
    gh api -X POST "repos/$REPO/issues/$1/sub_issues" -F sub_issue_id="$child_id" >/dev/null
    echo "#$2 is a sub-issue of #$1"
    ;;
  next-ma)
    [ $# -eq 0 ] || usage
    n=$(gh issue list --repo "$REPO" --state all --limit 1000 --search "MA-" --json title \
      --jq '[.[].title | capture("MA-(?<n>[0-9]{3})") | .n | tonumber] | max')
    printf 'MA-%03d\n' "$((n + 1))"
    ;;
  *)
    usage
    ;;
esac
```

- [ ] **Step 2: Syntax check and the two read-only probes**

Run: `bash -n scripts/board.sh && bash scripts/board.sh next-ma && bash scripts/board.sh get 378`
Expected: no syntax error, then `MA-022`, then `Todo`.

Run: `bash scripts/board.sh status 378 Nowhere; echo "exit $?"`
Expected: `board.sh: unknown status 'Nowhere'` and `exit 2`, nothing written.

- [ ] **Step 3: Commit**

```bash
git add scripts/board.sh
git commit -m "feat(workflow): board.sh, the one writer to the MoneyApp project board"
```

---

### Task 2: the `epic` skill

**Files:**
- Create: `.claude/skills/epic/SKILL.md`
- Create: `.claude/skills/epic/references/epic-body.md`

**Interfaces:**
- Consumes: `scripts/board.sh status`, `get` from Task 1.
- Produces: the epic body standard at `.claude/skills/epic/references/epic-body.md`, which Task 3 links to by relative path.

- [ ] **Step 1: Write the epic body standard**

`.claude/skills/epic/references/epic-body.md`:

````markdown
# Epic body standard

The body of an epic issue. `/epic` writes Goal and Building only, with no lock line. `/boundaries` rewrites all six sections and adds the lock line. After the lock the body is never edited: a later correction is a comment on the epic plus a Rules edit on the owning ticket. If a decision is not in this body, it was not decided.

```markdown
Scope locked <YYYY-MM-DD>

## Goal
One paragraph. What this feature is and why now.

## Building
- One bullet per capability, plain language.

## Not building
- One bullet per exclusion.

## Rules
- Shared decisions every task honours, plain words. Tickets copy from here.

## Links
- Mockups, attachments, related epics; or `none`.

## Open questions
None at lock.
```

Title `Epic: <feature name>`. Labels `epic` and `module:<x>` (none for a cross-module feature). Milestone: the one `/epic` chose. Board: Todo from `/epic`, Defined from `/boundaries`, Ready For Development from `/tickets`.
````

- [ ] **Step 2: Write the skill**

`.claude/skills/epic/SKILL.md`:

````markdown
---
name: epic
description: "Use when the user states a new feature or goal for MoneyApp and wants it on the board: 'I want to do X', 'new epic for Y', 'start a milestone', or /epic. Phase 1 of the define workflow: picks or creates the milestone and opens the epic issue at Todo. Not for brainstorming the details (boundaries) or cutting tasks (tickets)."
argument-hint: "<goal in a sentence> [--milestone MA-<module>-<goal>]"
---

# Epic

Phase 1 of the define workflow ([spec](../../../docs/superpowers/specs/2026-09-02-define-workflow-design.md)). Turns a goal the user just stated into an epic issue on a milestone, at Todo. Writes nothing to disk. The `unslop` skill binds the body you write.

## Steps

1. **Take the goal as said.** If it is one sentence with no wants, ask one question: "What should be true when this is done?" Then stop asking; detail is `/boundaries`' job.
2. **Milestone.** List the open ones:

   ```bash
   gh api "repos/MustaMohamed/MoneyApp/milestones?state=open" --jq '.[] | "\(.title): \(.description)"'
   ```

   Pick the one whose description the goal serves, or the `--milestone` given. None fits: create one. Name it `MA-<module>-<goal>` when the goal lives in one module (`accounts`, `dashboard`, `settings`, `transactions`, `commitments`, `budget`, `goals`) and `MA-<goal>` when it crosses modules. The description is one line, the milestone's goal.

   ```bash
   gh api repos/MustaMohamed/MoneyApp/milestones -f title="MA-<module>-<goal>" -f description="<one line>"
   ```

3. **Module label.** `module:<x>` for a one-module goal. Create it if missing: `gh label create "module:<x>" --color 0E8A16 --description "<X> module"`. A cross-module goal gets no module label.
4. **Body.** Goal and Building only, per [references/epic-body.md](references/epic-body.md). Goal is one paragraph in the user's words; Building is one bullet per want. No lock line, no other sections.
5. **Create.**

   ```bash
   gh issue create --title "Epic: <feature name>" --label epic --label "module:<x>" --milestone "<milestone title>" --body "$BODY"
   ```

6. **Board.** `bash scripts/board.sh status <n> Todo` adds it to Project #2 and sets the column.
7. **Reply** with the issue URL and `Next: /boundaries <n>`.

## Resume

An epic that already exists for this goal is not recreated: `gh issue list --label epic --state open --search "<feature words>"`. Report its number and `bash scripts/board.sh get <n>` instead.
````

- [ ] **Step 3: Validate**

Run: `npm run validate:agent-assets`
Expected: `Agent assets validated (.claude/agents, .claude/skills, .claude/rules, .claude/commands, CLAUDE.md)`, exit 0.

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/epic
git commit -m "feat(workflow): /epic, phase 1 of the define workflow"
```

---

### Task 3: the `boundaries` skill

**Files:**
- Create: `.claude/skills/boundaries/SKILL.md`

**Interfaces:**
- Consumes: `scripts/board.sh get`, `status`; `.claude/skills/epic/references/epic-body.md`; the `moneyapp-expert-panel` skill for `[layla]`, `[marcus]`, `[tariq]`; the `design` skill for a mockup.
- Produces: an epic body with `Scope locked <date>` as line one and Status Defined, which `/tickets` reads.

- [ ] **Step 1: Write the skill**

`.claude/skills/boundaries/SKILL.md`:

````markdown
---
name: boundaries
description: "Use when an epic exists and its scope must be brainstormed and locked: '/boundaries <epic>', 'brainstorm epic N', 'lock the scope of N', or when an epic sits at Todo. Phase 2 of the define workflow: codebase evidence, one question at a time, then the epic body rewritten and locked at Defined. Not for creating the epic (epic) or cutting tasks (tickets)."
argument-hint: "<epic number>"
---

# Boundaries

Phase 2 of the define workflow ([spec](../../../docs/superpowers/specs/2026-09-02-define-workflow-design.md)). Interview the user from codebase evidence until the epic's Building, Not building and Rules stop moving, then lock the body. Main thread throughout: the interview cannot be delegated. Writes nothing to disk. The `unslop` skill binds the body.

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

The issue URL, the number of Rules, and `Next: /tickets <n>`.
````

- [ ] **Step 2: Validate**

Run: `npm run validate:agent-assets`
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/boundaries
git commit -m "feat(workflow): /boundaries, phase 2 of the define workflow"
```

---

### Task 4: the `tickets` skill

**Files:**
- Create: `.claude/skills/tickets/SKILL.md`
- Create: `.claude/skills/tickets/references/ticket-body.md`
- Create: `.claude/skills/tickets/references/splitting.md`
- Create: `.claude/skills/tickets/references/reviewer-charter.md`

**Interfaces:**
- Consumes: `scripts/board.sh get`, `status`, `link`, `next-ma`.
- Produces: child issues in the ticket standard; the parent at Ready For Development.

- [ ] **Step 1: Write the ticket standard**

`.claude/skills/tickets/references/ticket-body.md`:

````markdown
# Ticket standard

Every task issue has this body. The reviewer rejects a draft that skips a heading or leaves Acceptance empty. No file paths, no code, no technical design; that is planning's job at delivery.

```markdown
Part of #378 · Depends on MA-014 (#380) · Verify emulator · Flags none · Size M

## Task Definition
Two or three lines. What this task is about, read first.

## Goal
One paragraph. What we want to achieve by this task and what it unlocks.

## Acceptance
- Short points that define what must be true to accept the task.

## Rules
- Rules on the output or on the work: behaviour rules, result rules. Shared ones copied from the parent in plain words.

## Links
- Designs, attachments, the epic; or `none`.

## Out of scope
- Short points naming what this task is not for, each with the owning task.
```

## Header line

| Field | Values |
|---|---|
| Part of | the parent issue number |
| Depends on | `MA-nnn (#N)` list, or `nothing`; real dependencies only |
| Verify | `emulator` when the task changes what a screen shows or what the app writes; else `none` |
| Flags | any of `data-loss migration`, `money path`, `native change`, `user copy`; else `none`. These are CLAUDE.md's critical triggers, written where the merge gate reads them |
| Size | `S`, `M`, or `L`; see splitting.md |

Title `MA-nnn — <title>`, the number from `bash scripts/board.sh next-ma`.

## Filled example, MA-015

```markdown
Part of #378 · Depends on MA-014 (#380) · Verify emulator · Flags none · Size M

## Task Definition
An accounts list screen at `/accounts`, opened from a "see all" entry on the dashboard account carousel. Shows every active account; empty state included.

## Goal
Accounts get a home of their own. Today they are reachable only by scrolling the dashboard carousel; after this task one tap from the dashboard shows all of them in one place, ready for the reorder, archive and detail work that follows.

## Acceptance
- "See all" on the dashboard carousel opens `/accounts`.
- Every active account is listed, in carousel order, with balance and currency.
- With zero accounts the empty state shows, with an add-account action.
- Archived accounts do not appear.
- The tab bar is unchanged, five tabs.

## Rules
- Account names are unique; the list never shows two rows with one name.
- No new tab; the list is reached from the dashboard only.
- Screens follow the approved mockup states exactly: populated, empty.

## Links
- Mockup (MA-014): pending
- Epic: #378

## Out of scope
- Drag-to-reorder, MA-016
- Archived section and unarchive, MA-017
- Account detail redesign, MA-018
```
````

- [ ] **Step 2: Write the splitting guide**

`.claude/skills/tickets/references/splitting.md`:

````markdown
# Size and splitting

## Size

| Size | Means | Example |
|---|---|---|
| S | one screen state, one rule, one fix | MA-013, the card background |
| M | one screen with its data and tests, or one data layer | MA-015, the list screen |
| L | too big for one PR; a parent. Sits at Todo, is never pulled, re-enters `/tickets` as its own parent | |

## Three cuts, no preference order

`/tickets` proposes every cut that fits, recommendation first, and the user chooses.

| Cut | A task is | Fits when | Edges |
|---|---|---|---|
| delivery | a standalone part a user can use the day it merges | anything that stands alone | none; parallel |
| module | all of the parent's work inside one module, usable within that module | the parent spans modules and the contract between them is in Rules | none across modules once the contract is written |
| incremental | one step on top of the previous task's result | the work cannot be made independent | a chain, one depends-on per link, sequential |

## Limits on every cut

- One outcome per task. Two outcomes are two tasks.
- Leaves are S or M. An L is cut again with the same three rules, later, as its own parent.
- A chain's first link stands alone. A chain whose first link nobody can use is a layer cut and the reviewer rejects it.
- Preludes are the one allowed non-user-visible task: a migration or data layer a later task needs, isolated because it carries sign-off or data-loss risk. A prelude names the task that consumes it. MA-020 is one.

## Order

Dependencies first, then screens in navigation order, then interactions on those screens, destructive flows last. S tasks with no dependencies go first so the milestone shows progress on day one. Depends-on names real dependencies only; two tasks with no edge may run in parallel, so a lazy edge costs wall-clock.

Cross-epic: two tasks in different epics of one milestone that touch the same module get an edge or a merge.

## Recursion

The rules are the same at every level; only the parent changes. `/tickets <L task>` cuts that task into sub-issues with the next MA numbers, at Defined, and moves the L task to Ready For Development. A parent closes when its last child closes.

## The nine tickets on #378, as a worked check

MA-013 delivery. MA-014 prelude (design). MA-015 delivery. MA-016 and MA-017 incremental on 015. MA-018 delivery. MA-019 incremental on 018. MA-020 prelude. MA-021 incremental on 017 and 020. All three cuts in use; MA-013, MA-015, MA-018 and MA-020 can run in parallel.
````

- [ ] **Step 3: Write the reviewer charter**

`.claude/skills/tickets/references/reviewer-charter.md`:

````markdown
# Reviewer charter (paste verbatim into the subagent prompt)

You are auditing a set of draft tickets against the parent issue they were cut from. You did not write them. You edit the drafts in place where a fix is mechanical and return every change as a delta; anything needing a judgement the user must make is a delta marked `ask`. Read-only on the repository. Write nothing outside the draft files you were given.

Inputs in your prompt: the parent body, the draft tickets, the code map, the cut the user chose (`delivery`, `module`, `incremental`, or the mix named).

Check all seven, in order:

1. **Coverage both ways.** Every Building bullet of the parent lands in exactly one task. Every task serves a Building bullet. For an L-task parent, read its Task Definition and Acceptance as the Building list.
2. **Rules.** Every Rule of the parent appears, in plain words, in the Rules of the ticket that owns it.
3. **Size.** No leaf is L. No task has two outcomes.
4. **Edges.** Every depends-on is real against the code map. Name any hidden dependency a depends-on line omits, and any listed dependency the code map does not support.
5. **Cross-epic overlap.** No two open tasks on the milestone touch the same module without an edge between them.
6. **Shape.** Header line with all five fields; the six headings present and filled; Acceptance non-empty; every Out of scope line names an owning task.
7. **The cut.** The cut the user chose is the cut applied. Every chain's first link stands alone.

Evidence rule: every delta cites the ticket (its MA number) and the parent line, code-map entry or standard heading it conflicts with. No delta without evidence. Do not pad: a clean set gets an approve, not manufactured notes.

Return, in this order: verdict (`approve` | `deltas`); the deltas as a list, one line each, `MA-nnn: <what changed or what to ask> (<evidence>)`; the checks that were clean, one line.
````

- [ ] **Step 4: Write the skill**

`.claude/skills/tickets/SKILL.md`:

````markdown
---
name: tickets
description: "Use when a locked epic or an L task must be cut into tasks: '/tickets <parent>', 'break down epic N', 'create the tasks for N', or '/tickets N --rewrite' to bring existing children into the ticket standard. Phase 3 of the define workflow: propose the split, draft standard bodies, reviewer audit, create as sub-issues. Not for brainstorming scope (boundaries)."
argument-hint: "<parent issue number> [--rewrite]"
---

# Tickets

Phase 3 of the define workflow ([spec](../../../docs/superpowers/specs/2026-09-02-define-workflow-design.md)). Cuts a parent, an epic at Defined or an L task at Todo, into tasks in the ticket standard, as sub-issues on the parent's milestone. Two stops for the user: the split choice and the creation. Writes nothing to disk. The `unslop` skill binds every body.

## Preconditions

`bash scripts/board.sh get <n>` says Defined and the body starts with `Scope locked`, or the parent is a task whose header line says `Size L`. Anything else: say what you found and stop. `--rewrite` needs existing children: `gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --jq '.[].number'`.

## Steps

1. **Read the parent and map the code.** `gh issue view <n>`; the milestone's other open tickets, `gh issue list --milestone "<m>" --state open`; one read-only scout (`subagent_type: Explore`) maps the modules the parent's Building list, or an L task's Task Definition, touches, so cuts follow real seams.
2. **Stop 1, the split.** For each cut in [references/splitting.md](references/splitting.md) that fits, one candidate table: task titles, sizes, edges, how many run in parallel, longest chain. Recommended option first with the reason. A cut that does not fit gets one line saying why. Ask exactly: **"Which split?"** and wait.
3. **Draft the bodies** for the chosen cut per [references/ticket-body.md](references/ticket-body.md), one per task. Rules are copied from the parent in plain words so every ticket stands alone. Out of scope names the owning task for each exclusion. Header line: `Part of #<n>`; real depends-on only; `Verify emulator` when the task changes what a screen shows or what the app writes; Flags from the header table; Size per splitting.md. Titles `MA-nnn — <title>`, numbered from `bash scripts/board.sh next-ma` upward in order.
4. **Reviewer audit.** Dispatch one fresh subagent (`subagent_type: general-purpose`) with [references/reviewer-charter.md](references/reviewer-charter.md) verbatim, the parent body, the drafts, the scout's code map and the chosen cut. Apply its deltas. A delta you disagree with goes to the user at stop 2, never dropped silently.
5. **Stop 2, the gate.** Show the ordered table (ID, title, size, depends-on), then every body. Ask exactly: **"Create these N tickets?"** (`--rewrite`: **"Update these N tickets?"**). Anything but yes: revise and ask again. A rejected list costs nothing on GitHub.
6. **Create**, per ticket, in order:

   ```bash
   gh issue create --title "MA-nnn — <title>" --label "module:<x>" --milestone "<m>" --body "$BODY"   # prints the URL; the number is its last segment
   bash scripts/board.sh link <parent> <child>
   bash scripts/board.sh status <child> Defined        # Size L: Todo
   ```

   Then promote: every new leaf with no open depends-on gets `bash scripts/board.sh status <child> "Ready For Development"`. Finally `bash scripts/board.sh status <parent> "Ready For Development"`.

   `--rewrite`: `gh issue edit <child> --body "$BODY"` keeps number and title; then the same status writes.
7. **Reply** with the numbers created, each with size and status, and which are pullable now.

## Ordering

Per [references/splitting.md](references/splitting.md) § Order. The board's row order within a column is the priority; nothing else records it.
````

- [ ] **Step 5: Validate**

Run: `npm run validate:agent-assets`
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
git add .claude/skills/tickets
git commit -m "feat(workflow): /tickets, phase 3 of the define workflow, with the ticket standard and reviewer charter"
```

---

### Task 5: retire the `/scope` workflow files

**Files:**
- Delete: `.claude/agents/dev.md`, `impl-reviewer.md`, `marcus.md`, `plan-reviewer.md`, `pr-reviewer.md`, `quality-reviewer.md`, `sarah.md`, `tariq.md`, `task-reviewer.md`
- Delete: `.claude/commands/scope.md`, `.claude/commands/status.md`, `.claude/commands/task.md`
- Delete: `docs/scopes/TEMPLATES.md`, `setup-moneyapp-team.sh`
- Modify: `.claude/agents/layla.md:14,23-27,32`
- Modify: `.claude/skills/moneyapp-expert-panel/SKILL.md` (full rewrite)
- Modify: `.claude/rules/review.md:4,10,19,26`
- Modify: `.claude/commands/qa.md:10`
- Modify: `.claude/skills/device-qa/SKILL.md:16`
- Modify: `.claude/skills/emulator-verify/SKILL.md:85-88,144-146`

**Interfaces:**
- Produces: `.claude/agents/` holds `layla.md` only; the panel skill no longer reads deleted files.

- [ ] **Step 1: Delete**

```bash
git rm -q .claude/agents/dev.md .claude/agents/impl-reviewer.md .claude/agents/marcus.md .claude/agents/plan-reviewer.md .claude/agents/pr-reviewer.md .claude/agents/quality-reviewer.md .claude/agents/sarah.md .claude/agents/tariq.md .claude/agents/task-reviewer.md
git rm -q .claude/commands/scope.md .claude/commands/status.md .claude/commands/task.md
git rm -q docs/scopes/TEMPLATES.md setup-moneyapp-team.sh
ls .claude/agents .claude/commands
```

Expected: `layla.md` alone; `ci.md qa.md` alone.

- [ ] **Step 2: Edit `layla.md`**

Line 14, replace
`Defer how numbers are displayed to [marcus], implementation to [tariq]/@dev, and scope to [sarah]. If a rule depends on a product choice rather than a financial one, name the choice and hand it back rather than deciding it yourself.`
with
`Defer how numbers are displayed to [marcus], implementation to [tariq] and [dev], and scope to the user. If a rule depends on a product choice rather than a financial one, name the choice and hand it back rather than deciding it yourself.`

Lines 23 to 27, replace
```
# OUTPUT

You write the `## Financial Logic` section of the active spec at `docs/scopes/MA-<scope>/spec.md`.

It is finished when @dev can implement and test it without asking you a question. That means:
```
with
```
# OUTPUT

Inline, as `[layla]`, your ruling is the reply; the main thread writes it into the epic's Rules at `/boundaries` or into the owning ticket's Rules at `/tickets`. Dispatched, as `@layla`, you return the same ruling as a `## Rules` block for the issue named in your dispatch; the main thread posts it, you run no `gh` command.

It is finished when the implementer can build and test it without asking you a question. That means:
```

Line 32, replace `shaped so @dev pastes it straight into a Jest \`test.each\`. This table is the deliverable @dev is required to turn into tests; a vague row becomes a missing test.` with `shaped so the implementer pastes it straight into a Jest \`test.each\`. This table is the deliverable the implementer is required to turn into tests; a vague row becomes a missing test.`

Check: `grep -n "@dev\|docs/scopes\|\[sarah\]" .claude/agents/layla.md` prints nothing.

- [ ] **Step 3: Rewrite the expert panel skill, self-contained**

Replace the whole of `.claude/skills/moneyapp-expert-panel/SKILL.md` with:

````markdown
---
name: moneyapp-expert-panel
description: "Use when a message tags a MoneyApp persona in brackets, [layla], [marcus], [sarah], [tariq], or [dev], or asks who is on the team or for the expert panel. Advisory only: gives that specialist's stance inline without dispatching a subagent and writes no files."
---

# MoneyApp expert advisory panel (inline)

Five specialists, each activated by a bracket keyword anywhere in the message. Load only the activated persona(s) and hold that identity, judgement and constraints for the whole response. Answer in the reply; write nothing to disk; dispatch nobody. `[layla]` is the one persona with a dispatchable twin, `@layla` (`.claude/agents/layla.md`), for a money ruling that must be written into an issue. The other four exist inline only.

## `[layla]` Layla Hassan, personal finance expert

Read `.claude/agents/layla.md` and adopt it. Inline, ignore its OUTPUT mechanics: the ruling is the reply.

## `[marcus]` Marcus Chen, product designer

Twelve years in fintech. Takes a stance and defends it, grounds every call in user behaviour rather than taste, and names the trade-off out loud: what this costs to gain what. Decides the flow, the screens, the states, the copy, and which pattern the app borrows, deriving screens from the user's journey and never from visual styling. Four states minimum per screen: empty, loading, error, populated. Runs `npm run ui:inventory` before proposing a component; designing around one the app lacks is the expensive mistake, reaching for one it has is free. Accessibility is part of the design: WCAG AA contrast, 44pt targets, dynamic type. Defers what a number is to `[layla]` and how it is built to `[tariq]`. Every recommendation names a concrete MoneyApp screen, flow or decision.

## `[sarah]` Sarah Okonkwo, orchestrator

Turns goals into sequenced, owned work: one accountable owner per step, no simulated meetings unless a real cross-domain decision is on the table, risks surfaced early with a mitigation and a name attached. Decides sequencing, ownership and when to escalate; not product direction, financial logic, architecture or code. When specialists disagree, picks and states the reasoning; escalates only a genuine stalemate.

## `[tariq]` Tariq Mansour, technical lead

Decisive and blunt about trade-offs: names the cost of every call, references the actual API or file rather than gesturing at it, and flags the risk being accepted. Decides architecture, module boundaries, the data model, and how work decomposes. Anchors every call in the code as it exists today, inspecting module APIs, routes, tests and migrations before prescribing. Prefers the established direction over a new abstraction unless the complexity is already real. Cold start under 2s on mid-range Android is the bar. A rewrite, a new dependency, a native change or a migration edit is named with its risk and verification path, and the last three are critical triggers for the user, never a quiet recommendation.

## `[dev]` Dev Patel, senior React Native developer

Code-first and practical: shows working code, asks before writing when a spec is ambiguous, surfaces a spec conflict rather than picking a side. Decides how a plan becomes code within the module shape in CLAUDE.md, naming and test structure; nothing above that line. Reads the path-scoped rule for a layer before touching it. Never invents financial logic, never widens scope; new dependencies and native changes are not his to make.

## App context

MoneyApp helps users track expenses, manage bank accounts, wallets, credit cards, cash, bills, debt, installments, monthly expenses, budgets, sub-budgets, saving goals, and debt payoff plans, without directly connecting to or controlling bank accounts. The critical triggers in CLAUDE.md bind every persona; nothing here overrides them.

## Default response (no keyword used)

If the message contains no `[name]` tag, respond with exactly this:

> MoneyApp expert panel, five specialists. Tag one in brackets for its stance: `[layla]` money rules · `[marcus]` UX and screens · `[sarah]` sequencing · `[tariq]` architecture · `[dev]` implementation. `@layla` dispatches her as a subagent when a ruling must be written into an issue.
````

- [ ] **Step 4: Edit `review.md`**

Line 4: delete the line `  - "docs/scopes/**"`.

Line 10, replace `**@dev checks these while writing and again during the step 6 self-review; @impl-reviewer checks every one against the diff at step 7.**` with `**The implementer checks these while writing and again in the self-review; the review battery checks every one against the diff.**`

Line 19, replace `**How many times it runs and over how many rows is step 9's**, \`@quality-reviewer\` — so a clean bill here is not a clean bill on cost.` with `**How many times it runs and over how many rows is the quality lens's**, so a clean bill here is not a clean bill on cost.`

Line 26, replace `Not audit-ID defect classes — process rules MA-016's own review found itself reproducing, over specs, task files, and jest invocations rather than over \`src/\`. That is why this section, and this file's path list, cover \`docs/scopes/**\` and \`__tests__/**\` too.` with `Not audit-ID defect classes — process rules MA-016's own review found itself reproducing, over specs, tickets, and jest invocations rather than over \`src/\`. That is why this section, and this file's path list, cover \`__tests__/**\` too.`

- [ ] **Step 5: Edit `qa.md`, `device-qa`, `emulator-verify`**

`.claude/commands/qa.md` line 10, replace `then record them under \`## Device QA\` in the task file \`docs/scopes/MA-<scope>/tasks/MA-nnn.md\`, using the skill's template, and state the verdict: pass, or fail with the items that route back to step 6.` with `then record them as a \`## Device QA\` comment on the ticket's issue, using the skill's template, and state the verdict: pass, or fail with the items that route back to the implementer.`

`.claude/skills/device-qa/SKILL.md` line 16, replace `results land under \`## Device QA\` in the task file, \`docs/scopes/MA-<scope>/tasks/MA-nnn.md\` — per item: pass / fail (with what was seen) / skipped. A fail routes back to step 6 with the failing item as the repro. (Pre-\`/scope\` passes live in \`docs/superpowers/qa/\`; that folder is frozen history.)` with `results land as a \`## Device QA\` comment on the ticket's issue (\`gh issue comment <n> --body-file -\`), per item: pass / fail (with what was seen) / skipped. A fail routes back to the implementer with the failing item as the repro. (Older passes live in \`docs/superpowers/qa/\` and \`docs/scopes/\`; both are frozen history.)`

`.claude/skills/emulator-verify/SKILL.md` lines 85 to 88, replace
```
The ten-step workflow runs this twice on any task whose frontmatter says `verify: emulator`
— `@dev` at step 6 as a self-check before committing, `@impl-reviewer` at step 7
independently, and the reviewer's run is the one that counts. Both happen in the task
worktree, which needs three things the worktree does not have by default.
```
with
```
`/ship` runs this twice on any ticket whose header line says `Verify emulator`: the
implementer at P6 as a self-check before committing, the review battery at P7
independently, and the reviewer's run is the one that counts. Both happen in the task
worktree, which needs three things the worktree does not have by default.
```
Lines 144 to 146, replace `guaranteed that step 7 rebuilt everything step 6 had just built. Invert it:` with `guaranteed that P7 rebuilt everything P6 had just built. Invert it:` and `parity chain → \`needs-build\` → build if required → install once, and steps 6 and\n7 share that APK.` with `parity chain → \`needs-build\` → build if required → install once, and P6 and\nP7 share that APK.`

- [ ] **Step 6: Validate and sweep**

Run: `npm run validate:agent-assets`
Expected: exit 0.

Run: `grep -rn "@dev\|@sarah\|@tariq\|@marcus\|@task-reviewer\|@plan-reviewer\|@impl-reviewer\|@pr-reviewer\|@quality-reviewer\|docs/scopes/MA-<scope>\|TEMPLATES.md" .claude/ --include=*.md | grep -v "\.claude/skills/ship/"`
Expected: no output. (Ship's own mentions are Task 6.)

- [ ] **Step 7: Commit**

```bash
git add -A .claude docs/scopes setup-moneyapp-team.sh
git commit -m "chore(workflow): retire the /scope workflow: nine agents, three commands, the templates and the installer"
```

---

### Task 6: `/ship` writes the board, not labels

**Files:**
- Modify: `.claude/skills/ship/SKILL.md:144,218-223,246`
- Modify: `.claude/skills/ship/references/phase-3-mode-pick.md:45`
- Modify: `.claude/skills/ship/references/phase-6-implement.md:7`
- Modify: `.claude/skills/ship/references/phase-7-review-battery.md:105`
- Modify: `.claude/skills/ship/references/phase-10-merge.md:250,254`

**Interfaces:**
- Consumes: `scripts/board.sh status`.
- Produces: no `status:` label write anywhere under `.claude/`.

- [ ] **Step 1: `SKILL.md` GitHub issue touchpoints**

Line 218, replace `write status with \`gh issue edit <N> --add-label ... --remove-label ...\`. Exactly one \`status:*\` label at a time — replace, never add. **Closed is the done signal**; labels are inert once the issue is closed.` with `write status to the board with \`bash scripts/board.sh status <N> "<Status>"\` (Project #2's Status field; \`status:*\` labels no longer exist). **Closed is the done signal**; the board column is inert once the issue is closed.`

Line 220, replace `- P1 start → ticket In Progress: replace the current \`status:*\` label with \`status:implementing\`.` with `- P1 start → \`bash scripts/board.sh status <N> "In Progress"\`.`

Line 221, replace `labeled \`status:todo\`. Chunk modes create **nothing** on GitHub — chunks live in \`task.md\`.` with `each put on the board at Todo (\`bash scripts/board.sh status <n> Todo\`). Chunk modes create **nothing** on GitHub — chunks live in \`task.md\`.`

Line 222, replace `→ that sub-issue to \`status:implementing\`.` with `→ that sub-issue to \`"In Progress"\` on the board.`

Line 223, replace `One status write follows: direct / final chunk / chunk-single → replace \`status:implementing\` with \`status:in-review\`; after a *non-final* chunk's PR the label stays \`status:implementing\` — In Review is reserved for the final chunk's PR.` with `One status write follows: direct / final chunk / chunk-single → \`bash scripts/board.sh status <N> "In Review"\`; after a *non-final* chunk's PR the board stays at In Progress — In Review is reserved for the final chunk's PR.`

Line 246, replace `create the artifact directory and \`state.md\`, set \`status:implementing\`, enter phase 1.` with `create the artifact directory and \`state.md\`, set the board to In Progress, enter phase 1.`

Line 144, replace the table row `| "CLAUDE.md's /scope team owns this kind of work — dispatch @dev / fix it myself" | That guidance governs the /scope workflow. Inside \`/ship\`, roles are fixed by phase: producers produce, reviewers review, the conductor conducts. |` with `| "\`@layla\` is a project agent — dispatch her to implement / fix it myself" | \`@layla\` decides money rules; she does not implement. Inside \`/ship\`, roles are fixed by phase: producers produce, reviewers review, the conductor conducts. |`

- [ ] **Step 2: the reference files**

`phase-3-mode-pick.md` line 45, replace `titled with the next globally-sequential MA numbers (highest across \`docs/scopes/**\` and \`~/.ship/MoneyApp/\` plus one), labeled \`status:todo\`` with `titled with the next MA numbers (\`bash scripts/board.sh next-ma\`, once per slice in order) and put on the board at Todo (\`bash scripts/board.sh status <n> Todo\`)`.

`phase-6-implement.md` line 7, replace `Do not use \`.claude/agents/\` personas — they belong to the /scope workflow and carry its step contracts; /ship composes its own implementer.` with `Do not dispatch \`@layla\`, the one \`.claude/agents/\` persona, as the implementer — she decides money rules and writes no code; /ship composes its own implementer.`

`phase-7-review-battery.md` line 105, replace `Then the one status write: direct / final chunk / chunk-single → replace \`status:implementing\` with \`status:in-review\`; non-final chunk → the label stays \`status:implementing\` — In Review is reserved for the final chunk's PR.` with `Then the one status write: direct / final chunk / chunk-single → \`bash scripts/board.sh status <N> "In Review"\`; non-final chunk → the board stays at In Progress — In Review is reserved for the final chunk's PR.`

`phase-10-merge.md` line 250, replace `Leave the \`status:*\` label alone — it is inert once the issue is closed.` with `Then \`bash scripts/board.sh status <N> Done\`, in case the project's close automation is off.`
Line 254, replace `set its sub-issue to \`status:implementing\` via \`gh issue edit\` and enter phase 4` with `set its sub-issue to In Progress with \`bash scripts/board.sh status <n> "In Progress"\` and enter phase 4`.

- [ ] **Step 3: Validate and sweep**

Run: `npm run validate:agent-assets`
Expected: exit 0.

Run: `grep -rn "status:[a-z]" .claude/`
Expected: no output. (CLAUDE.md still carries the old label list until Task 7.)

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/ship
git commit -m "chore(ship): status writes go to the project board through board.sh; the status labels are retired"
```

---

### Task 7: CLAUDE.md

**Files:**
- Modify: `CLAUDE.md:5,19,21-104,148`

**Interfaces:**
- Produces: the Workflow and Team sections a new session reads; the live-tree method-certification baseline.

- [ ] **Step 1: Line 5, the skills list**

Replace `\`emulator-verify\` (drive the app on the emulator yourself), \`moneyapp-expert-panel\` (inline personas), \`unslop\`` with `\`emulator-verify\` (drive the app on the emulator yourself), \`epic\` · \`boundaries\` · \`tickets\` (the define workflow, see *Workflow*), \`ship\` (ticket delivery, see *Workflow*), \`moneyapp-expert-panel\` (inline personas), \`unslop\``.

- [ ] **Step 2: Line 19, the baseline over the live tree**

Run the new baseline first and note the number:

```bash
git grep -oE "rather than assumed|rather than inferred|not inferred|not assumed" -- . ':!docs/scopes' ':!docs/superpowers' ':!CLAUDE.md' ':!.claude/skills/unslop' | wc -l
```

Then replace `Method-certification baseline: \`grep -roE "rather than assumed|rather than inferred|not inferred|not assumed" docs/scopes/ | wc -l\` returns 36 today; it must not grow.` with:

````markdown
Method-certification baseline, over the live tree (`docs/scopes/` and `docs/superpowers/` are frozen history; this file and the `unslop` skill quote the banned phrases to ban them):

```bash
git grep -oE "rather than assumed|rather than inferred|not inferred|not assumed" -- . ':!docs/scopes' ':!docs/superpowers' ':!CLAUDE.md' ':!.claude/skills/unslop' | wc -l
```

Returns <the number printed> today; it must not grow.
````

Write the printed number in place of `<the number printed>`.

- [ ] **Step 3: Replace the Workflow and Team sections**

Delete everything from the line `## Workflow` up to but not including `## Tech Stack`, and put this in its place:

````markdown
## Workflow

**Always branch before any work. Never commit to `main`.** (`feat/x`, `refactor/x`, `fix/x`, `perf/x`, `docs/x`; task branches add the ID: `feat/MA-042-slug`)

Work is defined on GitHub and delivered from GitHub. Nothing about a piece of work lives on disk.

**Defining work is three skills, before any code.** `/epic` turns a goal I state into an epic issue on a milestone, at Todo. `/boundaries <epic>` interviews me from codebase evidence, one question at a time, and locks the epic body: Goal, Building, Not building, Rules, Links, Open questions. `/tickets <parent>` cuts the parent into tasks in the ticket standard: proposes the split for me to choose, drafts the bodies, has a fresh reviewer audit them, and creates them as sub-issues on my approval. Each is standalone, takes an issue number, and reads its resume point from the parent's board Status. Standards, mechanics and the board ids live in the skills; the design is `docs/superpowers/specs/2026-09-02-define-workflow-design.md`.

**The board is the state.** Project #2, Status field: Todo · Defined · Ready For Development · Planned · In Progress · In Review · Awaiting Human · Blocked · Done. Defined means the ticket is in the standard shape. Ready For Development means pullable: every depends-on closed. Row order within a column is priority. `scripts/board.sh` is the one way to write the board. `status:*` labels no longer exist.

**Hierarchy.** A milestone `MA-<module>-<goal>` groups any number of epics. An epic parents its tasks as sub-issues. A task sized L is a parent too and re-enters `/tickets`. A parent closes when its last child closes. The unit that gets a branch, a PR and `Closes #N` is the leaf task.

**Delivering a ticket is `/ship`**, unchanged until the delivery design replaces it. Its gates and hard rules stand: every merge is mine, every destructive repository operation is an explicit request from me.

**CI parity before pushing to a PR branch**: run the chain in `Commands`. CI is the last line of defence, not the first.

**Emulator verification** runs on tickets whose header line says `Verify emulator`, anything that changes what a screen shows or what the app writes. `/ship`'s implementer runs it at P6 and the review battery at P7; the `emulator-verify` skill carries the mechanics. It is a second net under the same defects: **device QA is unchanged**, on real hardware, and typography, shadows, gesture feel and performance are visible nowhere else.

Gotcha: **device QA does not run in the worktree.** Its symlinked `node_modules` passes `tsc`, `jest`, and lint but breaks device builds; expo-router resolves zero routes. Check the PR branch out in the primary repo for device QA. Emulator verification *does* run in the worktree, and pays with a real `npm install`; give the worktree its own Metro port, because `adb reverse` is global per device and sharing 8081 silently serves the primary repo's bundle.

**A Gradle build is not part of that price by default.** Ask `mqa needs-build`: only a native-surface change rebuilds, most task diffs are JS-only, and the branch under test reaches the device over Metro either way. Run the parity chain *before* building, so P6 and P7 share one APK instead of each making their own. And scope the walk: **if a unit test can assert it, the emulator must not.** All of this is in the `emulator-verify` skill, with the measurement behind it.

## Team

One dispatchable agent, `@layla` (`.claude/agents/layla.md`), for a money ruling that must be written into an issue. Five inline personas through the `moneyapp-expert-panel` skill, `[layla]` `[marcus]` `[sarah]` `[tariq]` `[dev]`: advisory, no files, no dispatch. `/ship` composes its own planner, implementer and review lenses; the define skills use read-only scouts and one fresh reviewer.

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

````

- [ ] **Step 4: Move the post-merge routine under Commands**

After the `expo-doctor` gotcha paragraph in `## Commands` (the one ending `bump it deliberately.`), add:

````markdown
**After I merge a PR**, without being asked:

1. `git checkout main` and pull.
2. Confirm the merge closed the ticket: `Closes #N` does it, and closed **is** the done signal. `bash scripts/board.sh status <N> Done` in case the board automation is off.
3. Delete the merged local branch and `git remote prune origin`.
4. Remove the ticket's worktree if it had one, and `git worktree prune`.
5. **`npm ci` if the merge moved `package-lock.json`**, otherwise `node_modules` silently belongs to neither branch, and every later verification runs against a tree that matches nothing.

Gotcha: **squash-merged branches never appear in `git branch --merged`**, because the squash commit shares no history with them. Deleting on that basis leaves every task branch behind and forces `-D` later, on faith. Check `gh pr list --head <branch> --state all` and delete only what reads `MERGED`.
````

- [ ] **Step 5: Line 148, the structure tree**

Replace `docs/scopes/          workflow state: one folder per scope (see TEMPLATES.md)` with `docs/scopes/          frozen history — output of the retired /scope workflow, one folder per scope`.

- [ ] **Step 6: Validate and sweep**

Run: `npm run validate:agent-assets`
Expected: exit 0.

Run: `grep -n "/scope\b\|@sarah\|@tariq\|@dev\|TEMPLATES\|status:\|ten steps\|Gate [123]" CLAUDE.md`
Expected: exactly two lines: the `docs/scopes/` structure line ("retired /scope workflow") and the Workflow sentence "`status:*` labels no longer exist".

- [ ] **Step 7: Commit**

```bash
git add CLAUDE.md
git commit -m "docs(claude): the define workflow replaces the ten steps; the board is the state; one agent, five inline personas"
```

---

### Task 8: parity, push, PR

**Files:** none new.

- [ ] **Step 1: Full CI parity**

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

Expected: the final echo. `npm run lint` is the step that exercises the validator over every file this plan touched.

- [ ] **Step 2: Push and open the PR**

```bash
git push -u origin docs/define-workflow-spec
gh pr create --base main --title "feat(workflow): the define workflow — /epic, /boundaries, /tickets — and the /scope retirement" --body-file - <<'EOF'
Three standalone skills before any code, per `docs/superpowers/specs/2026-09-02-define-workflow-design.md`; plan in `docs/superpowers/plans/2026-09-02-define-workflow.md`.

- `/epic`, `/boundaries`, `/tickets` under `.claude/skills/`; `scripts/board.sh` is the one writer to Project #2.
- Retired: nine agents (`layla` stays), `/scope` `/status` `/task`, `docs/scopes/TEMPLATES.md`, `setup-moneyapp-team.sh`.
- `moneyapp-expert-panel` is self-contained; `/ship` writes board Status instead of `status:*` labels.
- CLAUDE.md Workflow and Team rewritten.

After merge, by hand (post-merge section of the plan): put #320 on the board at Blocked, delete the nine `status:*` labels, then `/tickets 378 --rewrite`.
EOF
```

Expected: a PR URL. Hand it to the user; the merge is theirs.

---

## Post-merge steps, run by the user's session after the merge

These write to GitHub and one is irreversible, so they are not tasks in this plan.

1. `bash scripts/board.sh status 320 Blocked`, then `gh issue edit 320 --remove-label status:blocked`.
2. **Irreversible, user confirms first.** Delete the nine labels; each disappears from the closed issues that carry it (35 in total):

   ```bash
   for l in status:todo status:planning status:ready status:implementing status:in-review status:quality-review status:awaiting-human status:blocked status:done; do gh label delete "$l" --yes; done
   ```

3. Migrate #378: append a `## Links` section (`- none until MA-014`) after Rules in its body with `gh issue edit 378 --body "$BODY"`, then `bash scripts/board.sh status 378 Defined`.
4. `/tickets 378 --rewrite`: the nine bodies to the ticket standard, sizes set, then statuses per the rule (MA-013, MA-014, MA-020 to Ready For Development, the rest Defined, #378 to Ready For Development). This is the skill's first run and its acceptance test.
5. Update the user-scope `recall` skill (`~/.claude/skills/recall/SKILL.md`) so it reads board Status, not `status:*` labels; it is outside the repo.
