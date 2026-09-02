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
