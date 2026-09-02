# Define workflow: epic, boundaries, tickets

Three standalone skills that turn a stated goal into board tickets an agent can pull without the user. They run before any code, on GitHub only. Delivery per ticket is a separate design; `/ship` delivers a ticket until that lands.

Decided in conversation on 2026-09-02. Supersedes the `/scope` ten-step workflow (`docs/superpowers/specs/2026-08-06-scoped-task-workflow-design.md`) for everything before code.

## 1. Goal

The user says what they want. Two conversations later, every task exists on the board in one standard shape, sized, ordered, with real dependencies, and a task whose dependencies are closed is pullable by an agent with no further input. Nothing about the work lives on disk.

## 2. Hierarchy

| Level | Object | Made by | Unit of |
|---|---|---|---|
| milestone | GitHub milestone `MA-<module>-<goal>` or `MA-<goal>`; flat list, progress bar, one-line description, no brief | `/epic` when no open milestone fits | nothing; it groups |
| epic | one feature; one locked brief in its body; label `epic`; parent of its tasks | `/epic` | `/boundaries`, `/tickets` |
| task | sub-issue of the epic, on the same milestone, label `module:<x>` | `/tickets` | delivery |
| L task | a task too big for one PR; a parent awaiting its own breakdown | `/tickets` | `/tickets <n>` again |

Rules:

- A milestone holds any number of epics. A small milestone is its single epic.
- Nothing runs on a milestone. Every skill takes an issue number.
- A parent closes when its last child closes, epic or L task alike. No branch, no PR, no `Closes`.
- Sub-issues nest on GitHub; the breakdown is recursive. Two levels are expected in practice.
- Next MA number is the highest `MA-nnn` in any issue title on GitHub plus one. `docs/scopes/` no longer participates. Today the highest is MA-021.

## 3. Board

Project #2 "MoneyApp", `PVT_kwHOAPEDM84BiHOr`. One custom field, Status, `PVTSSF_lAHOAPEDM84BiHOrzhhAbFg`.

| Status | Option id | Parent (epic, L task) | Leaf | Set by |
|---|---|---|---|---|
| Todo | `f75ad846` | created, not brainstormed | never; a leaf is born Defined | `/epic`, `/tickets` for an L child |
| Defined | `c5389d5e` | boundaries locked, not cut | standard shape, reviewed, some depends-on may be open | `/boundaries`, `/tickets` |
| Ready For Development | `beea98be` | children cut | pullable: every depends-on closed | `/tickets`; delivery on closing a dependency |
| Planned | `13576c63` | | reserved for delivery | delivery |
| In Progress | `47fc9ee4` | | reserved for delivery | delivery |
| In Review | `ce80cd5a` | | reserved for delivery | delivery |
| Awaiting Human | `fa6bc2d1` | | reserved for delivery; never used before code, the user is in the conversation at both gates | delivery |
| Blocked | `9bc3e0fb` | boundaries cannot lock until another epic ships; reason as an issue comment | reserved for delivery | `/boundaries` |
| Done | `98236657` | last child closed | merged | whoever closes the issue |

Promotion rule for Ready For Development: mechanical, never a judgement. `/tickets` promotes every new leaf with no open depends-on at creation. The delivery step that closes a task promotes each Defined leaf whose last open dependency it was. Parking a task is adding a depends-on or setting Blocked, never holding it in Defined.

Priority is the board's row order within a column. No Priority, Size or Iteration field is added.

The built-in "item closed, Done" automation cannot be read from the API. The skill that closes an issue sets Done itself; the automation is redundant at worst.

Resume, read from the parent's Status:

| Found | Next |
|---|---|
| epic at Todo | `/boundaries` |
| epic at Defined | `/tickets` |
| epic at Ready For Development | nothing to do here |
| L task at Todo | `/tickets <n>` |
| leaf at Ready For Development | pullable; delivery's business |

Labels: `epic`, `module:<x>`, `debt:quality`, `debt:perf`, `bug` stay. `scope:MA-onboarding-redesign` stays as history. The nine `status:*` labels are deleted; `#320` goes on the board at Blocked first. The GitHub default labels stay untouched.

Views: "Board" is columns by Status grouped by Milestone; "View 1" is a plain table. Group by parent issue is available for the sub-issue tree. No view changes are required.

## 4. Skills

Three project skills under `.claude/skills/`, committed because they carry MoneyApp facts: the project and field ids above, the milestone naming, the labels, the two standards. Each takes an issue number and reads everything else from GitHub. Each writes nothing to disk. The `unslop` contract binds every issue body and comment they write.

### 4.1 `/epic`

| | |
|---|---|
| Input | the user's goal in chat; optional milestone name |
| Reads | open milestones; open epics on the chosen milestone |
| Does | pick the milestone whose description the goal serves, or create `MA-<module>-<goal>` with a one-line description; write the epic body with Goal and a rough Building list from what the user said; create the issue with label `epic` and `module:<x>`; add it to project #2 at Todo |
| Output | the epic issue number |
| Gate | none; the user is talking |

### 4.2 `/boundaries`

| | |
|---|---|
| Input | epic number |
| Reads | the epic body; every other epic on the milestone and their open tickets; the code |
| Does | steps 1 to 8 below |
| Output | the epic body rewritten to the standard in §5 with the lock line; Status Defined |
| Gate | "Lock this scope?" |

Method. Main thread throughout; the interview cannot be delegated.

1. Read the epic and its sibling epics so boundaries do not overlap a sibling.
2. Evidence before questions. Up to four read-only scouts dispatched in one message: the code the Building list touches; prior art in the repo and sibling features; history in `docs/superpowers/reviews/` and `docs/adr/`; danger surfaces, which are SQLite migrations, money paths, onboarding resume state, routes under `src/app/`, native config. Reports stay in the session.
3. One question at a time, multiple choice, recommended option first. Every question comes from what the scouts found, not from a template. `[layla]` answers money questions inline, `[marcus]` flow and screen questions, `[tariq]` feasibility. The interview stops when answers stop changing Building, Not building and Rules.
4. Every decided edge goes into Rules in plain words at once. There is no scenario table and no spec; Rules is where decisions land, and phase 3 turns each rule into acceptance lines on the ticket that owns it.
5. Spike when a question can only be answered by code: scratch worktree, answer written into Rules or Not building, worktree deleted. Spike code never survives.
6. Mockup is a ticket by default (the MA-014 pattern). Phase 2 draws only when a boundary cannot be settled in words, then it is one artifact made with the `design` skill and linked from Links.
7. Before the gate: two or three approaches, recommendation first, then the strongest objections to it and what would make it wrong.
8. Gate. Present the rewritten body in full, ask "Lock this scope?". Yes writes the body with the lock line and sets Defined. Anything else is a revision request; revise and ask again. Cross-epic dependency that prevents locking: set Blocked, comment the reason, stop.

If a decision is not in the body, it was not decided. Phase 3 may run in another session with nothing but the body and the code.

### 4.3 `/tickets`

| | |
|---|---|
| Input | a parent: epic number or L task number |
| Reads | the parent body; the milestone's other open tickets; the code the parent's Building or Task Definition touches |
| Does | steps 1 to 6 below |
| Output | child issues in the §6 standard, sub-issues of the parent, on the milestone, labelled `module:<x>`; Status per §3; the parent moved to Ready For Development |
| Stops | 1: the split choice · 2: "Create these N tickets?" |

Method.

1. Read the parent and map the code. One read-only scout maps the modules the Building list (or the L task's Task Definition) touches, so cuts follow real seams.
2. Stop 1, the split. For each strategy in §7 that fits, one candidate table: task titles, sizes, edges, how many run in parallel, longest chain. Recommended option first with the reason; a strategy that does not fit gets one line saying why. The user chooses.
3. Draft the full §6 body for every task of the chosen cut. Rules are copied from the parent in plain words so each ticket stands alone. Out of scope names the owning task for every exclusion.
4. Reviewer audit. One fresh subagent, charter in §8, given the parent body, the draft bodies and the code map. It edits the drafts in place and returns the deltas.
5. Stop 2, the gate. Present the ordered table (ID, title, size, depends-on) and every body. Ask "Create these N tickets?". A rejected list costs nothing on GitHub.
6. Create, per ticket, in this order: `gh issue create` with title `MA-nnn — <title>`, body, `--milestone`, `--label module:<x>`; link as sub-issue of the parent (`POST /repos/MustaMohamed/MoneyApp/issues/<parent>/sub_issues` with `sub_issue_id` set to the child's numeric `id`, not its number); `gh project item-add 2 --owner MustaMohamed --url <issue url>`; `gh project item-edit` Status to Defined; then promote per §3. An L child is set to Todo instead. Finally move the parent to Ready For Development.

Rewrite mode. `/tickets <parent> --rewrite` reads the existing children instead of drafting new ones, rewrites each body into the §6 standard keeping its number and title, assigns sizes, and re-runs steps 4 to 6 with "Update these N tickets?" at stop 2 and no creation. This is the migration path for #378.

## 5. Epic body standard

```markdown
Scope locked <date>

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

`/epic` writes Goal and a rough Building list with no lock line. `/boundaries` rewrites all six sections and adds the lock line. After the lock the body is never edited; a later correction is a comment on the epic and a Rules edit on the owning ticket.

## 6. Ticket standard

```markdown
Part of #378 · Depends on MA-014 (#380) · Verify emulator · Flags none · Size M

## Task Definition
Two or three lines. What this task is about, read first.

## Goal
One paragraph. What we want to achieve by this task and what it unlocks.

## Acceptance
- Short points that define what must be true to accept the task.

## Rules
- Rules on the output or on the work: behaviour rules, result rules. Shared ones copied from the epic.

## Links
- Designs, attachments, the epic; or `none`.

## Out of scope
- Short points naming what this task is not for, each with the owning task.
```

Header line fields:

| Field | Values |
|---|---|
| Part of | the parent issue number |
| Depends on | `MA-nnn (#N)` list, or `nothing`; real dependencies only |
| Verify | `emulator` when the task changes what a screen shows or what the app writes; else `none` |
| Flags | any of `data-loss migration`, `money path`, `native change`, `user copy`; else `none`. These are the CLAUDE.md critical triggers, written where the merge gate reads them |
| Size | `S`, `M`, or `L` per §7 |

Title `MA-nnn — <title>`. No file paths, no code, no technical design; that is planning's job at delivery.

## 7. Size and splitting

| Size | Means | Example |
|---|---|---|
| S | one screen state, one rule, one fix | MA-013 |
| M | one screen with its data and tests, or one data layer | MA-015 |
| L | too big for one PR; a parent, sits at Todo, never pulled, re-enters `/tickets` | |

Three cuts, no preference order. `/tickets` proposes the ones that fit and the user chooses.

| Cut | A task is | Fits when | Edges |
|---|---|---|---|
| delivery | a standalone part a user can use the day it merges | anything that stands alone | none; parallel |
| module | all of the parent's work inside one module, usable within that module | the parent spans modules and the contract between them is in Rules | none across modules once the contract is written |
| incremental | one step on top of the previous task's result | the work cannot be made independent | a chain, one depends-on per link, sequential |

Limits on every cut:

- One outcome per task. Two outcomes are two tasks.
- Leaves are S or M. An L is cut again with the same three rules, later, as its own parent.
- A chain's first link stands alone. A chain whose first link nobody can use is a layer cut and the reviewer rejects it.
- Preludes are the one allowed non-user-visible task: a migration or data layer a later task needs, isolated because it carries sign-off or data-loss risk. A prelude names the task that consumes it.

Order: dependencies first, then screens in navigation order, then interactions on those screens, destructive flows last. S tasks with no dependencies go first so the milestone shows progress on day one. Depends-on names real dependencies only; two tasks with no edge may run in parallel, so a lazy edge costs wall-clock.

Cross-epic check: two tasks in different epics of one milestone that touch the same module get an edge or a merge.

The nine existing tickets already use all three cuts: MA-013 delivery, MA-014 prelude, MA-015 delivery, MA-016 and MA-017 incremental on 015, MA-018 delivery, MA-019 incremental on 018, MA-020 prelude, MA-021 incremental on 017 and 020.

## 8. Reviewer charter (phase 3, fresh subagent)

Inputs: the parent body, the draft ticket bodies, the code map, the chosen cut. Read-only on the repo; edits the drafts in place; returns the deltas as a list. Checks, all mandatory:

1. Coverage both ways: every Building bullet of the parent lands in exactly one task; every task serves a Building bullet.
2. Every Rule of the parent appears in the ticket that owns it.
3. Size: no leaf is L, no task has two outcomes.
4. Edges: every depends-on is real against the code map; no hidden dependency the line omits.
5. Cross-epic overlap: no two open tasks on the milestone touch the same module without an edge.
6. Shape: the header line and all six headings present and filled; Acceptance non-empty; every Out of scope line names an owner.
7. The cut the user chose is the cut applied, and every chain's first link stands alone.

Evidence rule: every delta cites the ticket and the parent line it conflicts with.

## 9. Repo changes

Delete:

| Path | Why |
|---|---|
| `.claude/agents/*` except `layla.md` | nine files; nothing dispatches them once `/scope` is gone, and `/ship` composes its own |
| `.claude/commands/scope.md`, `status.md`, `task.md` | the `/scope` workflow; `/ci` and `/qa` stay |
| `docs/scopes/TEMPLATES.md` | replaced by §5 and §6, which live in the skills |
| `setup-moneyapp-team.sh` | installer for the deleted team |
| labels `status:todo`, `status:planning`, `status:ready`, `status:implementing`, `status:in-review`, `status:quality-review`, `status:awaiting-human`, `status:blocked`, `status:done` | the Status field; `#320` is added to the board at Blocked before `status:blocked` is deleted |

Edit:

| Path | Change |
|---|---|
| `CLAUDE.md` | skills list names the three new skills; the method-certification grep runs over the live tree, excluding `docs/scopes` and `docs/superpowers` (from PR #336); the Workflow and Team sections become: defining work is the three skills and the board, delivering a ticket is `/ship` until the delivery design replaces it, critical triggers unchanged; the ten-step table, the gates, the status-label paragraphs and the step 10 list go; the squash-merge and worktree gotchas move under Commands; `docs/scopes/` reads "frozen history" |
| `.claude/skills/moneyapp-expert-panel/SKILL.md` | self-contained: each persona's identity paragraph moves into the skill; `[layla]` still reads `layla.md`; the dispatched `@name` half and the phase-ownership line go; the default response lists inline tags only plus `@layla` |
| `.claude/agents/layla.md` | OUTPUT: inline, her rulings land in the epic's Rules at phase 2 and the owning ticket's Rules at phase 3; dispatched, she writes those sections into the issue; the `[sarah]`/`@dev` deferrals reword to "the user" and "delivery" |
| `.claude/commands/qa.md:10`, `.claude/skills/device-qa/SKILL.md:16` | QA verdicts are a comment on the ticket, not a task file |
| `.claude/rules/review.md:4,26` | drop the `docs/scopes/**` path glob; reword the task-file sentence |
| `.claude/skills/ship/references/phase-3-mode-pick.md:45` | next MA number from GitHub, not `docs/scopes` |
| `.claude/skills/ship/SKILL.md` §GitHub issue touchpoints and Resume, `references/phase-7-review-battery.md` step 1, `references/phase-10-merge.md` steps 2 and 6 | every `status:*` label write becomes a board Status write through `scripts/board.sh`: P1 start In Progress, split sub-issues Todo, PR opened In Review, merged Done. Without this, deleting the labels breaks the next `/ship` run at P1 |
| `.claude/skills/ship/references/phase-6-implement.md:7`, `SKILL.md` rationalization table | the `/scope` persona sentence names `layla` as the one remaining agent, a consult, not an implementer |

Board writes go through one script, `scripts/board.sh`, which carries the project and field ids from §3: `add <issue>`, `status <issue> <Status>`, `get <issue>`, `link <parent> <child>`, `next-ma`. The three skills and `/ship` call it; no skill embeds an option id.

Keep: `docs/scopes/MA-onboarding-redesign/` as frozen history; `.claude/commands/ci.md`, `qa.md`; `scripts/validate-agent-assets.js` unchanged, it works with one agent file.

PR #336 (`claude/remove-scope-skill-f67931`, closed unmerged) did most of the deletions and the CLAUDE.md rewrite; rebase it rather than redo it.

## 10. Migration of #378

#378 is locked with nine children in the old three-line shape, all at Todo, no sizes. Steps, after the skills exist:

1. Add `## Links` to #378's body (mockup `none` until MA-014) and set #378 to Defined.
2. `/tickets 378 --rewrite`: bodies to §6, sizes assigned, depends-on kept, reviewer audit, "Update these N tickets?".
3. Status per §3: MA-013, MA-014, MA-020 to Ready For Development; the rest Defined; #378 to Ready For Development.

This is the first real run of `/tickets` and its acceptance test.

## 11. Out of scope

- Delivery per ticket: planning, implementation, review, merge. `/ship` stays as is for that until its own redesign, which starts after these three skills have run once.
- Adapting `/ship` to read the epic and ticket instead of asking. Only its status writes move to the board (§9), nothing else in it changes.
- Any change to the CI parity chain, the emulator skills, or `gh-stack`.
- Deleting design and dev skills (`animate*`, `apple-design`, `pick-ui-library`, `prototype`, `write-swift`, `ask-sonner`, `emil-design-eng`); not workflow, not touched.

## 12. Decisions log

| Date | Decision |
|---|---|
| 2026-09-02 | Split the pre-code process into three standalone skills; ship stays for delivery |
| 2026-09-02 | Milestone may hold many epics; the one-epic-per-milestone rule from 2026-09-01 is removed |
| 2026-09-02 | No spec artifact anywhere; the epic body and the tickets carry every decision |
| 2026-09-02 | Ticket standard is the user's six sections plus a header line |
| 2026-09-02 | Size is S, M, L; L is a parent only |
| 2026-09-02 | Three cuts with no preference order; the user chooses from proposed options |
| 2026-09-02 | Splitting is recursive; `/tickets` runs on an epic or an L task |
| 2026-09-02 | New Status "Defined" between Todo and Ready For Development; Ready For Development means pullable |
| 2026-09-02 | All agents deleted except `layla`; `moneyapp-expert-panel` kept and made self-contained |

## 13. Open questions

None.
