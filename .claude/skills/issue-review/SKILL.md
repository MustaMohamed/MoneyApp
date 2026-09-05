---
name: issue-review
description: "Use after an epic is locked or tickets are created, or any time a Defined issue should be checked: '/issue-review <n>', 'review epic N', 'review the tickets of N'. The define workflow's review step: fresh reviewers check the issue, or its children when it has any, against its Goal, its parent and the code; the bodies are edited on approval. Not for reviewing code or a PR (ship)."
argument-hint: "<issue number>"
---

# Issue review

The review step of the define workflow. Runs after `/boundaries` locks an epic or a task, after `/tickets` creates its children, and again whenever a Defined issue should be checked. Every lens runs in a fresh subagent that did not write the bodies and is read-only on the repository, so the skill works in the session that drafted them. One stop for the user. Writes nothing to disk. The `unslop` skill binds every delta.

## Preconditions

`bash scripts/board.sh get <n>` says Defined or Ready For Development. Anything else: say what you found and stop.

## What gets reviewed

The issue's children when it has any, otherwise the issue itself. Among the children, only those whose board Status is Defined, Ready For Development, or Todo (a task created for its own breakdown): a child past Ready For Development is in delivery, is listed as skipped, and is never edited here.

```bash
gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --paginate --jq '.[] | select(.state == "open") | .number'
gh api repos/MustaMohamed/MoneyApp/issues/<n>/parent --jq .number   # exit 1, with the error JSON on stdout, when it has none
gh project item-list 2 --owner MustaMohamed --limit 500 --format json --jq '.items[] | select(.content.number != null) | "\(.content.number) \(.status)"'
```

## Lenses

Self and Parent go to group reviewers under [references/reviewer-charter.md](references/reviewer-charter.md); Children goes to one set reviewer under [references/children-lens.md](references/children-lens.md).

- **Self**, every issue: complete against its own Goal and the code, outcomes not solutions, Rules and Acceptance assertable, shape, triggers, overlap with sibling epics.
- **Parent**, any issue with a parent: the parent's Rules carried, a Building bullet served, One PR against the real files, Verify and Flags true to the code, Depends on real.
- **Children**, a set: coverage both ways for Building and for Rules, edges across the set, overlap on the milestone, the cut.

An epic gets Self, then Children once its tickets exist. A leaf ticket gets Self and Parent. A task cut further gets all three over its life, one hop at a time. Each review checks a body against its own parent only; the parent was checked against its parent when it was the child.

## Steps

1. **Gather.** The bodies under review and their board Status; the parent body when there is one; the milestone sheet: every issue on the milestone with number, title, labels, state and the first line of its body, `gh issue list --milestone "<m>" --state all --limit 1000 --json number,title,labels,state,body`; when reviewing children, the cut, `gh issue view <parent> --json comments --jq '[.comments[].body | select(startswith("Cut:"))] | last'`.
2. **Map the code.** Reviewing children: one read-only scout (`subagent_type: Explore`, breadth "medium") lists, per child, the folders, screens, migrations, money paths, native config and user copy it touches, and names its main surface, the deepest folder under `src/modules/` it changes; a child with no code surface (a design ticket) is its own surface. Reviewing one issue: no scout; the reviewer maps for itself.
3. **Group.** Children that share a main surface form a group, in MA order, at most four per group; the fifth starts the next group. A child on two surfaces goes with its main one. A single issue is its own group.
4. **Dispatch** one fresh subagent per group, all in one message (`subagent_type: general-purpose`): the charter verbatim; the group's bodies, each with number, title and board Status; the parent body; the code map; the milestone sheet; the paths of the standard the bodies follow ([epic-body.md](../epic/references/epic-body.md) or [ticket-body.md](../tickets/references/ticket-body.md)) and of CLAUDE.md, which the reviewer reads itself. Reviewers return deltas as text; they run no `gh` and edit no file.
5. **Children lens**, when reviewing a set: one more fresh subagent (`subagent_type: general-purpose`) with [references/children-lens.md](references/children-lens.md) verbatim, every body under review, the parent body, the code map, the milestone sheet and the cut. Dispatched in the same message as the groups.
6. **Stop.** Show every delta grouped by issue: mechanical ones with their replacement text, `ask` ones with the question. Ask exactly: **"Apply these deltas?"** Anything but yes: revise and ask again. A clean review shows `approve` per issue and asks nothing.
7. **Apply.** Per issue with accepted deltas, take the body fetched in step 1, apply the deltas, `gh issue edit <n> --body "$BODY"`. The lock line and the title stay. An epic body is edited here only while it has no tickets; once tickets exist the review edits the children. Then the two status corrections the header can force: a ticket at Ready For Development whose Depends on now names an open issue goes back, `bash scripts/board.sh status <n> Defined`; a header that lost its last open dependency is promoted, `bash scripts/board.sh promote <parent>`. Nothing is created or closed.
8. **Reply.** Per issue, `approve` or `<k> deltas applied`, with its board Status after step 7 and the children skipped as in delivery; one line with the number of dispatches and minutes; then `Next: /tickets <n>` after an epic's Self review.
