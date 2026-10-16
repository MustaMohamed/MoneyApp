# ADR: the transaction detail heroes its own amount and shows the other currency in one amount row

- **Date:** 2026-10-16
- **Status:** accepted
- **Ticket:** MA-192 (#744), under MA-094 (#550), epic #543
- **Applies to:** `src/modules/transactions/screens/transactions/detail/detail.helpers.ts`, `detail/components/detail.geometry.ts` and `detail/index.tsx`

The detail hero printed `egp_amount` in EGP for every transaction, so a USD 15 expense at 49 read `−735 EGP` in the hero while the list row read `−15.00 USD`, and its USD figure sat in an Original amount row under the date. The user ruled on 2026-10-08 (Decision F) that the hero prints the transaction's own amount in its own currency, and that an Amount in EGP row takes the place of the Original amount row, with an Amount in USD row on a transfer from an EGP account to a USD account. That departs from frame C5, which draws the EGP figure in the hero.

## 1. The hero prints `tx.amount` in `tx.currency`

The hero reads the list row's own function, `primaryAmountFor(tx, cardCredit)` in `components/transaction_row.helpers.ts`, which formats `tx.amount` in `tx.currency` through `formatDisplayAmountParts`. Its `text` is the hero's `amountValue` and its `withCode` the hero's `amountAccessibilityLabel`; `amountCode` is `CURRENCY_CONFIG[tx.currency].code`. One function prints both, so the hero and the row cannot drift, and `detail_helpers.test.ts` still compares them on expense, income, card credit, and transfer and card payment on all four currency pairs. The sign rule does not change: `−` on an expense, `+` on an income and a card credit, none on a transfer or card payment, and none on a figure that prints as zero. `DETAIL_HERO_CURRENCY` is removed.

## 2. One function picks the amount row from the transaction alone

`resolveDetailAmountRowFigure(transaction: Transaction): ConvertedAmount | undefined`, in `detail/components/detail.geometry.ts`, returns the figure the row prints, in the `{ amount, currency }` shape the form's converted amount uses (`docs/adr/2026-10-13-converted-amount.md` §2). It reads the transaction alone, so the skeleton, which has no accounts, picks the same row the loaded screen does. It lives in the geometry file because the helpers import geometry and not the reverse.

| Transaction | Returns | At rate 49 |
|---|---|---|
| USD, any type, rate stored or not | `{ amount: egp_amount, currency: EGP }` | USD 15 expense gives 735 EGP; USD 100 transfer or card payment, to EGP or to USD, gives 4,900 EGP |
| EGP transfer or card payment, rate stored, `to_amount` set | `{ amount: to_amount, currency: USD }` | EGP 5,000 gives 102.04 USD |
| EGP transfer or card payment with no rate | `undefined` | EGP to EGP, no row |
| EGP expense or income | `undefined` | no row |
| A commitment's payment from an EGP account toward a USD commitment: an EGP expense with a rate and no `to_amount` | `undefined` | its Rate row alone |

A rate is stored only when USD is involved (`transaction_amounts.ts:141`), so an EGP transfer or card payment that stores a rate has a USD destination, and `to_amount` is what arrived in USD. The row therefore shows in USD whether or not the destination account resolved. A USD transaction shows its Amount in EGP row with no stored rate, as the list row prints its EGP figure without one.

## 3. The row prints through `formatDisplayAmount`, unsigned

The value is `formatDisplayAmount(figure.amount, figure.currency)`, the amount and its code with no sign: `735 EGP`, `102.04 USD`. That is the convention for a converted leg in `docs/adr/2026-10-13-converted-amount.md` §3, so USD 0.01 at 49 reads `0.49 EGP` where `formatCurrencyAmount` would print `0 EGP`. The label is `Strings.detailAmountInEgp` or `Strings.detailAmountInUsd`, stored as `Amount in EGP` and `Amount in USD`.

## 4. The skeleton slot keys on the same function

`buildDetailSkeletonGeometry` holds the amount row's slot when `resolveDetailAmountRowFigure` returns a figure, in place of the old test on `currency === USD`. An EGP to USD transfer now reads six row slots, and a commitment's EGP payment that stores a rate reads five, its Rate slot included. The Rate slot still keys on the stored rate.

## 5. The labels print in capitals until MA-181

The two rows draw through today's `DetailRow`, unchanged, whose label class carries `uppercase` (`detail/components/detail_row.tsx:89`). They read `AMOUNT IN EGP` and `AMOUNT IN USD` beside the other capitalised labels until MA-181 (#722) moves every row to the new anatomy.

## What this does not decide

The flow card's arrived amount and its EGP fallback for an unresolved destination (`detail.helpers.ts`, `destinationAmount` and `destinationCurrency`) do not change. The label-left rows, mixed-case labels, the note card and the actions are MA-181 (#722).
