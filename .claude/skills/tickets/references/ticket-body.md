# Ticket standard

Every task issue has this body. `/issue-review` rejects a body that skips a heading or leaves Acceptance empty. No code, no technical design and no file path outside Context; design is planning's job at delivery. A `Screen checks` row names a features file, not a path. Copy, Screen checks, Decisions and Context's `Consumes` and `Produces` apply from a ticket's next `/issue-review`. A body at Ready For Development or later may lack them, and no step adds them to it.

```markdown
Part of #378 · Depends on MA-014 (#380) · Verify emulator · Flags none · Reviewed none

## Task Definition
Two or three lines. What this task is about, read first.

## Goal
One paragraph. What we want to achieve by this task and what it unlocks.

## Acceptance
- Short points that define what must be true to accept the task.

## Rules
- Product rules: what the app does and never does, in behaviour and in results. Shared ones copied from the parent in plain words.

## Copy
- One bullet per string the task adds or alters, verbatim, with where it shows; a string that counts gives its singular, plural and zero forms. Or `none`.

## Screen checks
- One row per screen state the change alters, `<features file> · <state> · <risk>`, or `none`. The file is a name under `.claude/skills/emulator-verify/features/`; the state is a name from its States table, or a name followed by `new`; the row copies nothing else from that file. The risk names each condition the state meets, in these words, else `none`: a new component, a height that is not a whole number of dp, a font scale above 1.0, a swipe or a drag, a clipped or rounded container. A migration ticket has one row, the upgraded database opening on the first screen. `/tickets` and `/boundaries` write `none`; `/issue-review` writes the rows.

## Decisions
- One line per answer to a question on this task, or a line copied unchanged from the parent's Decisions, `<yyyy-mm-dd> · <question> · <option chosen> · <who chose> · <step>`; or `none`.

## Links
- Designs, attachments, the epic; or `none`.

## Out of scope
- Short points naming what this task is not for, each with the owning task. Never another site of this task's own defect: a site of the same check, resolver, slot or string belongs in Acceptance, and a task that fixes a defect fixes it at every site one `git grep` finds.

## Context
- What the code shows today, for whoever delivers this without the conversation: the screen or path, what happens now against what is wanted, reproduction steps, the files and symbols involved, prior art, the danger surfaces met. The one section where file paths belong. `/boundaries` on a task fills it; `/tickets` writes what its scout found, or `none`.
- Consumes: the contract this task takes from a sibling ticket, and the ticket that ships it; or `none`.
- Produces: the contract this task hands a sibling ticket, and the ticket that reads it; or `none`.
- Size: <k> files outside tests, ~<n> lines, at <sha>: <paths>. Always the last bullet, the list counted per `splitting.md` § Size gate; `/issue-review` recounts it and `/prep` trims a ticket whose list was short. No section other than Context holds a bullet starting `Size:`.
```

## Header line

| Field | Values |
|---|---|
| Part of | the parent issue number, or `none` for a task recorded on its own |
| Depends on | `MA-nnn (#N)` list, or `nothing`; real dependencies only |
| Verify | `emulator` when the task changes what a screen shows, else `none`; on a body with `Screen checks`, `emulator` if and only if that section has a row, binding from the first `/issue-review`. A repository test asserts a write |
| Flags | any of `data-loss migration`, `money path`, `native change`, `user copy`, `secure store`; else `none`. These are CLAUDE.md's critical triggers, written where the merge gate reads them |
| Reviewed | `none` when written; `/issue-review` writes the date when the body passes with no open ask, on a split parent as on a leaf. `board.sh promote` moves only a leaf with a date under a parent with a date, so this field is the road to Ready For Development; a review ends only with every question answered, and a run ended on a deferred question leaves the issue at Defined. No date is written while a question record is open on the issue, `bash scripts/board.sh questions <n>`; a date already written stays. Any rewrite of the body by `/boundaries` or `/tickets` resets it to `none` |

Title `MA-nnn — <title>`, the number from `bash scripts/board.sh next-ma`.

## Writing an answer

A step that writes an answer into Acceptance or Rules writes one Decisions line in the same edit. An answer that settles a string also writes its Copy bullet. One that settles a screen state also writes its Screen checks row, except at `/boundaries`, which leaves Screen checks `none`. A site `/ship` adds to an open ticket's Acceptance brings its Copy bullet and Screen checks row the same way, with no Decisions line. Each line, bullet or row replaces its section's `none`. Verify then follows the rows, per the header table. This holds on a body that has these sections or gains them in the same edit; a body at Ready For Development or later without them gets none of it.

## Filled example, MA-015

The body after its first `/issue-review`; as `/tickets` writes it, Screen checks reads `none`.

```markdown
Part of #378 · Depends on MA-014 (#380) · Verify emulator · Flags none · Reviewed 2026-09-08

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

## Copy
- Carousel entry: `See all`.
- Empty state title: `No accounts yet`.
- Empty state body: `Add your first account to get started.`
- Empty state action: `Add Account`.

## Screen checks
- accounts_list.md · populated, all five types · a new component
- accounts_list.md · no accounts at all · a new component

## Decisions
- 2026-09-08 · Which states does the list follow? · A, the approved mockup states exactly: populated, empty · the user · /issue-review

## Links
- Mockup (MA-014): pending
- Epic: #378

## Out of scope
- Drag-to-reorder, MA-016
- Archived section and unarchive, MA-017
- Account detail redesign, MA-018

## Context
- none
- Consumes: the populated and empty mockup states, MA-014 (#380).
- Produces: the `/accounts` route and its list rows, which MA-016, MA-017 and MA-018 build on.
- Size: 13 files outside tests, ~284 lines, at `91d25998`: `src/app/(app)/accounts/index.tsx`, `src/constants/strings.ts`, `src/constants/theme.ts`, `src/modules/accounts/constants/account_row_a11y_label.ts`, `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts`, `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts`, `src/modules/accounts/screens/accounts/list/components/account_list_row.tsx`, `src/modules/accounts/screens/accounts/list/index.tsx`, `src/modules/dashboard/screens/dashboard/components/total_balance_strip.tsx`, `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`, `src/modules/dashboard/screens/dashboard/index.tsx`, `src/modules/onboarding/screens/onboarding/more_accounts/components/account_row.tsx`, `src/modules/onboarding/screens/onboarding/more_accounts/more_accounts.geometry.ts`
```

## Context on a defect, MA-013

```markdown
## Context
- Screen: the account-type grid in the add-account form, on both paths that render it, onboarding N2 and in-app add account. Tap a type tile; the lit tile reads like its neighbours.
- Today: `src/modules/accounts/components/account_form/account_type_tile.tsx` gives the selected and unselected states the same `backgroundColor`, lines 43 to 51; the only active fill is a `LinearGradient` in the hero navy palette from `src/components/ui/hero_gradient.ts` over a surface a few percent darker, plus a `HeroGlow` clipped by the box's `overflow: hidden`.
- Wanted: the lit tile per `docs/scopes/MA-onboarding-redesign/assets/mockup.html` lines 508 to 534, a gradient at 135 degrees with a 60% stop, corner glow, inset highlight and shadow.
- Prior art: #226 created the tile, #359 last changed its selected colours. The house pattern for a lit selectable is `bg-accent/15` plus a gold border, `src/modules/onboarding/screens/onboarding/welcome/components/currency_choice.tsx`.
- Danger: none of migrations, money, onboarding resume, routes or native config. `hero_gradient.ts` is shared by six screens; the fix stays in the tile's own constants. No test asserts the tile's selected background.
- Consumes: none; the tile reads the `theme.ts` tokens already on main.
- Produces: none; no sibling ticket reads the tile's selected fill.
- Size: 2 files outside tests, ~40 lines, at `4ec43423`: `src/modules/accounts/components/account_form/account_type_tile.tsx`, `src/constants/theme.ts`
```
