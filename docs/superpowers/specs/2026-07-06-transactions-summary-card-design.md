# Transactions Summary Card Design

## Context

The transactions screen currently shows three separate compare boxes for Income, Expense, and Net. The approved redesign makes that area feel closer to the commitments screen summary card while preserving the existing transactions data contract: current period totals, previous period totals, and a previous-period label.

## Approved Direction

Use a single compact HeroUI-style summary card in the transactions screen.

The compact card contains:

- A top value row with three aligned current month numbers:
  - Income uses success green and a `+` prefix.
  - Expense uses danger red and a `-` prefix.
  - Net uses info blue and a signed prefix based on value.
- A red progress rail between the value row and the compare row.
  - Formula: `expenseEgp / incomeEgp`.
  - Clamp the fill from 0% to 100%.
  - If income is zero, render a 0% fill to avoid division ambiguity.
  - Purpose: show how much of current month income has gone out as expenses.
- A bottom comparison row aligned to the same three columns.
  - Each cell shows a direction icon plus absolute percentage, with no plus/minus sign.
  - Direction icon points up for positive deltas, down for negative deltas, and a neutral dot/mark for zero if needed.
  - Color follows metric polarity, not arrow direction:
    - Income up is green, income down is red.
    - Expense up is red, expense down is green.
    - Net up is green, net down is red.
  - The visible `vs {previousLabel}` caption appears under the comparison row when `previousLabel` exists.
- No visible header or metric-label row. The card should match the commitments summary card outer sizing and margin: `mx-4 mb-2`, tight vertical padding, low row gaps, and a thin 3px rail.

## Non-Goals

- No database, repository, or store changes.
- No new dependencies or native code changes.
- No new screen route or navigation behavior.
- No custom UI primitive where a HeroUI primitive exists. The outer card should use HeroUI `Card`, matching the commitments summary card pattern.

## Acceptance Criteria

- Transactions totals render as one summary card instead of three separate boxes.
- The card uses the existing `TotalsStrip` props: `current`, `previous`, `previousLabel`.
- The expense rail uses `current.expenseEgp / current.incomeEgp`.
- Net values use the info blue token/class, not gold/accent.
- Comparison percentages show direction icons and unsigned absolute percentages.
- Expense increases render red even though the direction icon points up.
- Existing period and polarity helper tests continue passing.
- The compact card uses commitments-card density: matching outer sizing/margins, tight padding/gaps, and a 3px progress rail.

## Dashboard Placement

- Dashboard overview includes a `Transactions` card near the existing commitments dashboard card.
- The dashboard card follows the commitments dashboard card shell: icon/title/month header, full-width HeroUI `Card`, same outer spacing, and tap-to-open behavior.
- Dashboard transaction data uses current and previous month `getPeriodTotals` values so the card can show income, expense, net, the expense-vs-income rail, and `vs {previousLabel}` comparison context.
