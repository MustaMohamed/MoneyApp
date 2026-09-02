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
