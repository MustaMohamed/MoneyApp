# Ticket standard

Every task issue has this body. `/issue-review` rejects a body that skips a heading or leaves Acceptance empty. No file paths, no code, no technical design outside Context; design is planning's job at delivery.

```markdown
Part of #378 · Depends on MA-014 (#380) · Verify emulator · Flags none

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

## Context
- What the code shows today, for whoever delivers this without the conversation: the screen or path, what happens now against what is wanted, reproduction steps, the files and symbols involved, prior art, the danger surfaces met. The one section where file paths belong. `/boundaries` on a task fills it; `/tickets` writes what its scout found, or `none`.
```

## Header line

| Field | Values |
|---|---|
| Part of | the parent issue number, or `none` for a task recorded on its own |
| Depends on | `MA-nnn (#N)` list, or `nothing`; real dependencies only |
| Verify | `emulator` when the task changes what a screen shows or what the app writes; else `none` |
| Flags | any of `data-loss migration`, `money path`, `native change`, `user copy`, `secure store`; else `none`. These are CLAUDE.md's critical triggers, written where the merge gate reads them |

Title `MA-nnn — <title>`, the number from `bash scripts/board.sh next-ma`.

## Filled example, MA-015

```markdown
Part of #378 · Depends on MA-014 (#380) · Verify emulator · Flags none

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

## Context
- none
```

## Context on a defect, MA-013

```markdown
## Context
- Screen: the account-type grid in the add-account form, on both paths that render it, onboarding N2 and in-app add account. Tap a type tile; the lit tile reads like its neighbours.
- Today: `src/modules/accounts/components/account_form/account_type_tile.tsx` gives the selected and unselected states the same `backgroundColor`, lines 43 to 51; the only active fill is a `LinearGradient` in the hero navy palette from `src/components/ui/hero_gradient.ts` over a surface a few percent darker, plus a `HeroGlow` clipped by the box's `overflow: hidden`.
- Wanted: the lit tile per `docs/scopes/MA-onboarding-redesign/assets/mockup.html` lines 508 to 534, a gradient at 135 degrees with a 60% stop, corner glow, inset highlight and shadow.
- Prior art: #226 created the tile, #359 last changed its selected colours. The house pattern for a lit selectable is `bg-accent/15` plus a gold border, `src/modules/onboarding/screens/onboarding/welcome/components/currency_choice.tsx`.
- Danger: none of migrations, money, onboarding resume, routes or native config. `hero_gradient.ts` is shared by six screens; the fix stays in the tile's own constants. No test asserts the tile's selected background.
```
