---
name: issue-review
description: "Use after an epic is locked or tickets are created, or any time a Defined issue should be checked: '/issue-review <n>', 'review epic N', 'review the tickets of N', 'is N ready to pull'. The define workflow's review step: fresh reviewers check the issue, or its children when it has any, against its Goal, its parent and the code; the body is edited on approval. Not for reviewing code or a PR (ship)."
argument-hint: "<issue number>"
---

# Issue review

The review step of the define workflow. Runs after `/boundaries` locks an epic, after `/tickets` creates its children, and again whenever a Defined issue should be checked, for example before a ticket is pulled. Reviewers did not write the bodies and are read-only on the repository. One stop for the user. Writes nothing to disk. The `unslop` skill binds every delta.

## Preconditions

`bash scripts/board.sh get <n>` says Defined or Ready For Development. Anything else: say what you found and stop.

## What gets reviewed

The issue's open children when it has any, otherwise the issue itself. The hierarchy decides; there is no flag.

```bash
gh api repos/MustaMohamed/MoneyApp/issues/<n>/sub_issues --jq '.[] | select(.state == "open") | .number'
gh api repos/MustaMohamed/MoneyApp/issues/<n>/parent --jq .number   # 404 when it has none
```

## Lenses

Which lenses run follows from where the issue sits. Self and Parent are dispatched, per [references/reviewer-charter.md](references/reviewer-charter.md); Children runs in the main thread, per [references/children-lens.md](references/children-lens.md).

- **Self**, every issue: complete against its own Goal and the code, outcomes not solutions, Rules and Acceptance assertable, shape, triggers, overlap with sibling epics.
- **Parent**, any issue with a parent: the parent's Rules carried, a Building bullet served, One PR against the real files, Verify and Flags true to the code, Depends on real.
- **Children**, a set: coverage both ways, edges across the set, overlap on the milestone, the cut.

An epic gets Self, then Children once its tickets exist. A leaf ticket gets Self and Parent. A task cut further gets all three over its life, one hop at a time: each review checks a body against its own parent only, because the parent was checked against its parent when it was the child.

## Steps

1. **Gather.** The bodies under review, `gh issue view <n> --json title,body,milestone,labels`; the parent body when there is one; the milestone's other open issues, `gh issue list --milestone "<m>" --state open --json number,title`; when reviewing children, the parent's latest `Cut:` comment, `gh issue view <parent> --comments`.
2. **Map the code.** Reviewing children: one read-only scout (`subagent_type: Explore`, breadth "medium") lists, per child, the folders, screens, migrations, money paths, native config and user copy it touches, and names its main surface, the deepest folder under `src/modules/` it changes. Reviewing one issue: no scout; the reviewer maps for itself.
3. **Group.** Children that share a main surface form a group, at most four per group; a child on two surfaces goes with its main one. A single issue is its own group.
4. **Dispatch** one fresh subagent per group, all in one message (`subagent_type: general-purpose`): the charter verbatim, the group's bodies with numbers and titles, the parent body, the code map, the standard the bodies follow ([epic-body.md](../epic/references/epic-body.md) or [ticket-body.md](../tickets/references/ticket-body.md)), and CLAUDE.md's business rules and critical triggers. Reviewers return deltas as text; they run no `gh` and edit no file.
5. **Children lens** in the main thread, on the bodies and the code map. Skipped when reviewing one issue.
6. **Stop.** Show every delta grouped by issue: mechanical ones with their replacement text, `ask` ones with the question. Ask exactly: **"Apply these deltas?"** Anything but yes: revise and ask again. A clean review shows `approve` per issue and asks nothing.
7. **Apply.** Per issue with accepted deltas, compose the body and `gh issue edit <n> --body "$BODY"`. The lock line and the title stay. No status write, nothing created or closed.
8. **Reply.** Per issue, `approve` or `<k> deltas applied`; one line with the number of dispatches and minutes, so the cost is on record; then `Next: /tickets <n>` after an epic's Self review, or which children are pullable now.

## Cost

Depth comes from reading code, and children on one surface share it, so one reviewer per group reads each file once and judges every ticket in the group against it. The Children lens compares bodies, not code, and the main thread of a review session did not write them, so it needs no dispatch.
