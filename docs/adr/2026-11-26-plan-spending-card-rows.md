# ADR: the rows on plan detail's Spending card

- **Date:** 2026-11-26
- **Status:** accepted
- **Ticket:** MA-305 (part of #935), plan step 7
- **Decided by:** the ticket's Acceptance, Rules, Copy and Decisions (2026-11-21, 2026-11-27).
  Composes with `docs/adr/2026-09-24-reporting-sign-fragment.md`,
  `docs/adr/2026-11-25-plan-detail-hero.md` and
  `docs/adr/2026-11-26-plan-flexible-card-and-lifecycle-heroes.md`.
- **Applies to:** `getSpendingPlanTransactions` in `src/modules/budget/database/budget_stats.ts`,
  `buildPlanSpendingCard` in `spending_plan_detail/spending_plan_detail.helpers.ts`, and
  `spending_plan_detail/components/spending_plan_spending_card.tsx`.

## 1. Which rows

The card lists every row the plan's Spent figure multiplies by ±1: a transaction in one of the
plan's categories, of type `expense` or `income`, dated from the plan's start day to its end day
inclusive, whose `REPORTING_SIGN_SQL.out` is not 0. `getSpendingPlanSpend` sums the same join with
the same predicates, so the card and the figure never disagree on which rows count.

Two consequences follow. A card credit, an `income` row on a `credit_card` account, counts −1 and
is listed. A bank or wallet income filed under a plan category counts 0 in Spent and is not listed;
a user who calls it a refund will not find it on the card. Transfers never match the type predicate.

## 2. Order and count

Rows run newest first, in the transactions list's order: `transaction_date`, `transaction_time`,
`created_at`, then `id`, each descending. The card lists every row, with no cap and no paging
(2026-11-27 seam); the three-row cap and its See all and Show less are MA-336.

## 3. The header total

The header total is the hero's own `spent`, formatted in EGP, and never a sum of the rows.
`getSpendingPlanSpend` floors each category at 0, so a category whose card credits outweigh its
expenses adds 0 to Spent while its rows still sum below 0. A row sum would then disagree with the
hero. The count beside it is the number of rows listed.

## 4. Row anatomy

Each row is the shipped transaction row, `buildTransactionRowPresentation` drawn by
`TransactionRowBody`, with four parts overridden:

- the title is the trimmed note, else the category name;
- the caption is the short weekday date, the caption separator, then the category name, else
  `Uncategorized`;
- the glyph is the category's, a card credit included;
- the accessibility label is the title, the amount with its own code, the date and the category name.

The amount, its colour, the secondary line and the account tile stay as built. A card credit keeps
its shipped `+` amount in the card-credit colour, as the transactions list draws the same row
(Decision 2026-11-27). A USD row keeps its USD amount and its `≈ … EGP` line. On this card the row
takes `wrapsTitle`, so a long title wraps whole and the row grows from its fixed height; the
transactions list and the account detail activity card keep the one-line title.

## 5. The seventh consumer of the reporting sign

`getSpendingPlanTransactions` is the seventh query that reads `REPORTING_SIGN_SQL`. The case
"spending-plan transactions" in `__tests__/reporting_sign.agreement.test.ts` ties it to the domain
classifier: its ids equal the folded rows in the plan's categories and range whose spending effect
is not 0.
