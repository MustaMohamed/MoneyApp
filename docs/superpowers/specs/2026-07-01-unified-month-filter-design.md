# Unified Month Filter Design

## Status

Approved by user on 2026-07-01 after browser prototype iteration.

## Problem

Transactions and Commitments currently expose month filtering through different UI patterns:

- Transactions uses a horizontal period carousel with `All`, recent months, and `Custom`.
- Commitments uses a centered month navigator with previous/next arrows.

The requested change is to make both main feature screens work the same way: put the month filter at the top of the screen, open a month picker when the month date is pressed, and reload the selected month's data.

## Approved Direction

Create one shared top month filter component and use it on both screens.

The shared filter must provide:

- The same top placement directly below each screen title.
- The same previous-month arrow.
- The same tappable month button, formatted as `Month YYYY`.
- The same next-month arrow.
- The same month picker sheet.
- A single selected month value in `YYYY-MM` format.

Transactions and Commitments keep their screen-specific summary cards, search, chips, lists, and empty states below the shared month filter.

## Picker Behavior

Pressing the month button opens a HeroUI-backed `Sheet` with:

- Title: `Select month`.
- Year controls for previous/next year.
- A 3-column grid of the 12 months.
- The currently selected month highlighted when its year is visible.

Selecting a month closes the sheet and calls the screen's month-change handler with the new `YYYY-MM` value.

## Screen Behavior

Transactions:

- The selected month becomes the transaction period.
- The transactions query and totals use the selected month's first and last day.
- The old top carousel is removed from the screen.

Commitments:

- The selected month is passed to the existing commitment store month loader.
- Previous/next arrows continue to step one month at a time.
- The old local `MonthNavigator` is removed from the screen.

## Out of Scope

- Dashboard and Budget month controls.
- New dependencies or native modules.
- Reintroducing custom date ranges in the top filter.
- Changing transaction type chips, advanced filters, search, or commitment status chips.

## Acceptance Criteria

- Transactions and Commitments render the same shared month filter component.
- Pressing the displayed month opens the same month picker sheet on both screens.
- Pressing previous/next changes the selected month by one month on both screens.
- Selecting a month in the picker updates screen data for that selected month.
- Month math handles year boundaries, including January to December and December to January.
- Focus-time smooth-transition fixes from the merged Zustand rollback branch remain untouched.
