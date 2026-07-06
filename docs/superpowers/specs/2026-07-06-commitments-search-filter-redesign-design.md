# Commitments Search Filter Redesign Design

## Goal

Apply the approved compact transactions search/filter pattern to the commitments screen without replacing the existing month/status filter rail.

## Scope

- Add a compact search input and trailing filter button to commitments.
- Keep the existing `FilterRail` and status filters unchanged.
- Add a commitments advanced filter sheet with:
  - Accounts
  - Categories
  - Amount range by currency
  - Amount type: fixed, variable
  - Recurrence type: monthly, weekly, annually, custom
- Combine search, status rail, and advanced filters when building the visible commitment payment sections.

## Behavior

- Search matches commitment name, category name, account name, commitment notes, and payment notes.
- Account filters match either the payment account or the commitment default account.
- Category filters match the commitment category.
- Amount range compares the displayed commitment payment amount:
  - Paid payments use `amount_paid ?? amount_due`.
  - Unpaid fixed commitments use `amount_due`.
  - Variable unpaid payments with no amount are excluded when an amount filter is active.
  - Amount filters only apply to payments in the selected amount currency.
- Amount type filters match `commitment.amount_type`.
- Recurrence filters use the existing `detectPreset(every, period)` helper.
- The filter badge counts active advanced filter sections, not individual selected chips.
- Reset clears the draft only; Apply persists the draft to the screen state.

## UI

- The commitments search row uses the same compact height, clear-button padding, in-bounds filter badge, and icon alignment as the fixed transactions row.
- The advanced filter sheet mirrors the transactions sheet: accordions, equal-width Reset/Apply buttons, HeroUI-backed `Sheet`, and existing `Button` variants.
- Status rail remains visible above the summary/search area.

## Testing

- Unit-test helper filtering/count/equality behavior.
- Unit-test screen state for search query and applied advanced filters.
- Unit-test `useCommitments` for search + advanced filter composition.
- Unit-test the commitments screen renders the compact search/filter row and wires actions.
