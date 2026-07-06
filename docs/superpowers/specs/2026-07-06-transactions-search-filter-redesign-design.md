# Transactions Search And Filter Redesign Design

## Status

Approved by user on 2026-07-06 after browser mockup iteration.

## Goal

Redesign the Transactions screen search and advanced filters so the area below
the transaction summary card feels compact, clear, and consistent with the
existing app button and sheet theme.

The redesign keeps the approved shared month/type `FilterRail` and the compact
transactions summary card unchanged. This task only changes the search command
row, the advanced filter trigger, applied-filter context, and the filter sheet
footer layout.

## Approved Direction

Use the compact sheet-led option derived from option 2:

- Keep the main screen lean.
- Put search and the advanced filter trigger in one compact command row below
  the transactions summary card.
- Keep the filter icon at the end of the row.
- Show a small top-right badge on the filter icon when advanced filters are
  applied.
- Keep detailed advanced filter state inside the sheet.
- Show short applied-filter context in the list header when useful, such as
  `CIB + Food`.

## Main Screen

The screen order remains:

1. Header.
2. Shared month/type `FilterRail`.
3. Transactions summary card.
4. Compact search/filter command row.
5. Sectioned transaction list.

The compact command row replaces the current taller search row. It contains:

- A compact search input using the existing `Input` wrapper.
- A trailing filter icon button using existing theme tokens and the current
  HeroUI-backed press feedback pattern.
- A top-right badge on the filter button when `activeFilterCount > 0`.

The row should be visually tighter than the current search row:

- smaller vertical margin below the summary card,
- compact visual input/button height, while preserving a comfortable tap target
  with padding or `hitSlop` if needed,
- no extra active-chip row on the main screen,
- no duplicate explanatory text.

The list header may show the short applied-filter summary on the right. It must
stay concise and truncate gracefully when selected account/category names are
long. If no advanced filters are applied, no right-side filter summary appears.

## Filter Sheet

The sheet keeps the existing advanced filter sections:

- Accounts.
- Categories.
- Amount.

Do not add a separate three-button switcher above the accordions. The accordion
headers are the section navigation and summary surface.

Each accordion header should remain compact and show:

- section title,
- small count badge when that section has selected filters,
- short summary on the right when collapsed,
- chevron indicator for expanded/collapsed state.

The sheet footer contains two equal-width buttons using the existing app button
theme:

- `Reset` uses the shared `Button` component with `variant="secondary"`,
  matching existing secondary actions.
- `Apply` uses the shared `Button` component with `variant="primary"` so it
  keeps the app's gold gradient CTA treatment.
- Both buttons sit in a single row with equal flex values.
- The footer is passed through the existing `Sheet` `footer` prop so it receives
  the standard sheet footer shell, padding, separator, and safe-area behavior.

## Filter Behavior

Opening the sheet still seeds the draft from currently applied filters.

`Reset` clears the draft filters without closing the sheet. The user can then
apply the empty draft to clear already-applied filters.

`Apply` writes the draft into `useTransactionsScreenStore.appliedFilters` and
closes the sheet.

The apply button should be enabled when the draft differs from the applied
filters, including the case where applied filters exist and the user presses
Reset so the draft count becomes zero. This prevents the existing count-only
disabled logic from blocking filter clearing.

The filter icon badge on the main screen reflects applied advanced filters, not
draft filters currently being edited inside the sheet.

## Architecture

Keep the existing module boundaries:

- `src/modules/transactions/screens/transactions/components/search_row.tsx`
  owns the compact command row.
- `src/modules/transactions/screens/transactions/filter/index.tsx` owns the
  sheet layout and equal-width footer buttons.
- `filter.helpers.ts` owns count and summary helpers.
- `filter.store.ts` continues to own draft advanced filters.
- `transactions.store.ts` continues to own applied filters and search query.

Implementation should not introduce a new custom UI primitive. Compose existing
HeroUI-backed project wrappers:

- `Input` for search.
- `Button` for sheet actions.
- `Sheet` for the advanced filter sheet.
- `Accordion` for filter sections.
- `PressableFeedback` for the trailing filter icon button, continuing the
  existing HeroUI-backed interaction pattern and using theme tokens only.

All user-visible copy remains in `src/constants/strings.ts`. Prefer existing
strings such as `filterReset`, `filterApply`, `filterApplyWithCount`, and
`searchTransactionsPlaceholder` unless implementation reveals a missing label.

## Testing

Add or update focused tests for:

- Search row renders a compact search input and trailing filter button.
- Filter badge appears only when `activeFilterCount > 0`.
- Filter badge uses the applied filter count from the screen state.
- Pressing the filter button opens the sheet.
- Filter sheet renders `Reset` and `Apply` in the footer.
- Reset and Apply buttons are equal-width in their footer layout contract.
- Reset clears the draft filters.
- Apply can clear already-applied filters after Reset.
- Existing filter store/helper tests continue passing.

## Non-Goals

- No changes to month/type `FilterRail`.
- No changes to transactions summary calculations or dashboard cards.
- No new filter categories.
- No database, repository, or migration changes.
- No new dependency or native-code change.
- No redesign of transaction rows, section headers, or empty states.
