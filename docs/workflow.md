# MoneyApp workflow

The full board rules, moved out of `CLAUDE.md`, which keeps a summary and links here. Each define and delivery skill carries its own rows; the `board` skill cites this file. `scripts/board_next.mjs` encodes the transition table below; `__tests__/scripts/board_next.test.ts` pins it.

Work is defined on GitHub and delivered from GitHub. The issue is the record; `.work/<MA-id>/` and `~/.ship/MoneyApp/MA-XXX/` hold transient working files.

**Defining work is four skills, before any code.** `/epic` turns a goal I state into an epic issue on a milestone, at Todo. `/boundaries <n>` interviews me from codebase evidence, one question at a time, and locks the body: an epic's Goal, Building, Not building, Rules, Links, Open questions; a title-only task's Acceptance, Rules and Context, so an agent can deliver it without the conversation. `/tickets <parent>` cuts the parent into tasks in the ticket standard: proposes the split for me to choose, drafts the bodies, and creates them as sub-issues on my approval. `/issue-review <n>` runs after each lock and whenever I ask: fresh reviewers check the issue, or its children when it has any, against its Goal, its parent and the code, and edit the bodies on my approval. It is the only road to Ready For Development: a leaf that passes gets `Reviewed <date>` on its header, and `promote` moves it once its depends-on are closed. Each is standalone, takes an issue number, and gates on the board Status. Standards, mechanics and the board ids live in the skills.

**The board is the state.** Project #2, Status field: Todo · Defined · Ready For Development · Planned · In Progress · In Review · Awaiting Human · Blocked · Done. Defined means the ticket is in the standard shape. Ready For Development means pullable: `/issue-review` passed it, `Reviewed <date>` on its header line, and every depends-on closed. A parent's column mirrors its furthest child, Ready For Development with the first child there, In Progress with the first child started, Done with the last child closed; a parent is never pulled, `/prep` and `/ship` take leaves only. Row order within a column is priority. `scripts/board.sh` is the one way to write the board, and its `promote` is the only thing that closes a parent, when every child closed as completed. `status:*` labels are retired; never write one.

`/board [n] [graph|text]` reads it: every open ticket with the skill or command to run next, grouped by who acts, and the dependency graph as an inline widget when the shape needs it. A plain poll needs no session: `bash scripts/board.sh next [n]` prints the same text report from a terminal in about five seconds, `--json` for a script. `scripts/board_next.mjs` carries the rules, one per row of the table below, and writes nothing.

Every move, who makes it, and on what. Nothing else moves a row.

| From | To | Who | On |
|---|---|---|---|
| none | Todo | `/epic`; `/tickets` for a child marked for its own breakdown; `board.sh status <n> Todo` for a task recorded by hand | issue created |
| Todo | Defined | `/boundaries` at the lock; `/tickets` for each child it creates, `Reviewed none` on the header | body in the standard |
| Defined | Ready For Development | `board.sh promote`, run by `/issue-review` on a pass and by the post-merge routine; never by hand | `Reviewed <date>` on the header and on the parent's, every Depends on closed, no sub-issues |
| Defined epic, or a Defined or Ready For Development leaf | Defined, as a parent | `/tickets` after the cut | children created at Defined or Todo. A parent is reviewed and marked before its children, is never planned, and closes through its children |
| Defined parent | Ready For Development | `board.sh promote`, when its first child gets there | the parent mirrors its children; nothing is pulled from it |
| Ready For Development | Defined | `/issue-review` when a Depends on names an open issue again or a review ended on a deferred question; `/tickets --rewrite` on a rewritten body, `Reviewed` back to `none` | the review no longer stands |
| Todo, Defined | Blocked | `/boundaries` | the lock waits on another issue; comment `Blocked on #m` |
| Blocked | Ready For Development | by hand, `board.sh status` | promote reports it and refuses to move it |
| Ready For Development | Planned | `/prep` | plan committed on the ticket branch |
| Ready For Development | Todo | `/prep` | the ticket returned on a gap; next is `/boundaries` or `/tickets` |
| Planned | In Progress | `/ship` phase 1 | implementer dispatched |
| Defined, parent | In Progress | `board.sh status`, carried up from the child, at every level | the first child reaches In Progress; the parent stays there until its last child closes |
| In Progress | In Review | `/ship` phase 2 | PR open, lenses running |
| In Review | Awaiting Human | `/ship` | a dispute, the cycle cap, or the merge gate |
| Awaiting Human | Done | the merge, `Closes #N`; then the post-merge routine, `board.sh status <n> Done` and `promote <parent>` | PR merged |
| parent, any | Done | `board.sh promote` | last child closed as completed; closes the parent, then one level up |

**Hierarchy.** A milestone `MA-<module>-<goal>` groups any number of epics. An epic parents its tasks as sub-issues. A task I choose to break down further is created at Todo and re-enters `/tickets`; a leaf at Defined or Ready For Development that turns out bigger than one PR goes to `/tickets` as it is. One PR is the size gate in the `tickets` skill, a named file list counted at `/tickets` and `/issue-review` and written as the `Size:` line of every ticket's Context; `/prep` recounts it, and a return there is a miss upstream. The gate is hard: no ruling lifts it, scope added during `/ship` is recounted against it and becomes its own ticket when over, and a task under ~100 lines is bundled with a same-screen or same-family sibling when one fits. An issue with sub-issues is a parent: it sits at Defined until its first child is In Progress, then In Progress until its last child closes; `promote`, `/prep` and `/ship` skip it. The unit that gets a branch, a PR and `Closes #N` is the leaf task.

**Delivering a ticket is two skills that compose on the board.** `/prep <n>` takes a leaf task from Ready For Development to Planned: it creates the ticket branch linked to the issue (`gh issue develop`), a cold planner writes `.work/MA-XXX/plan.md`, a fresh reviewer checks it against Acceptance and the code, and the plan is committed on the branch. `/ship <n>` takes it from Planned to Done: implement, review battery, triage and fix, re-check, merge; on a Ready For Development ticket it runs `/prep` first, and `/ship` alone pulls the top Planned row. The plan lives under `.work/`, the transient branch-only folder, never under `docs/`, and never reaches main: ship removes it in its last commit before the merge. One human gate, the merge; every destructive repository operation is an explicit request from me, and the standing ones are listed in `CLAUDE.md` under *When to stop*.
