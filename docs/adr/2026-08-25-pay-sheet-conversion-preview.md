# ADR — the pay sheet's conversion preview derives from the payment resolver

- **Date:** 2026-08-25
- **Status:** accepted
- **Ticket:** W1B (issues #278, #310)
- **Applies to:** `usePaySheet` and `pay_sheet.tsx`
  (`src/modules/commitments/screens/commitments/detail/components/`),
  `ExchangeRateRow` and the new `useTransactionRatePreview`
  (`src/modules/transactions/screens/transactions/transaction_form/components/`), and
  `requiresExchangeRate` in `src/modules/transactions/domain/transaction_amounts.ts`

The pay sheet computed its converted total as `amountWatch * rateNum` in the render body. For an
EGP commitment paid from a USD account that is the wrong operation in the wrong direction: 5,000 EGP
at 49.06 rendered `= 245,300 USD` where the write debits `101.92 USD`, 2,407× out. The same shape
sat in `ExchangeRateRow.formatPreviewAmount`, which multiplied an already-EGP amount by the rate.
This is `.claude/rules/review.md` class 3 for the third and fourth time, so the rule goes here
rather than in a commit message.

## 1. One derivation point, no exceptions for previews

Every money figure this ticket touches comes from `resolveCommitmentPaymentAmounts` or
`resolveTransactionAmounts`. No component, hook, or schema recomputes what they already return.

The double round is the reason this is a rule and not a preference.
`roundMoney(roundMoney(amount) / rate)` is not `roundMoney(amount / rate)`, and the input has to be
chosen to show it: at **1.005 EGP and rate 40** the resolver rounds the amount to `1.00` first and
returns `0.02`, while a one-step `roundMoney(1.005 / 40)` returns `0.03`. A round figure like
`1.00` does not separate them — its inner round is a no-op, so a re-derivation that skips it still
agrees. A preview that recomputes is wrong by a cent on exactly the inputs nobody tests by hand.

Consequences that are now structural rather than conventional:

- `ExchangeRateRow` holds no arithmetic. It takes `previewEgpAmount: number | undefined` and formats
  it. `formatPreviewAmount` and the `amount` prop that fed it are deleted, which also retires the
  `parseFloat` on money text at `transaction_exchange_rate_row.tsx:12` (MA-019's defect class).
- The schema's sub-floor refine calls the resolver too, on locally re-parsed operands, rather than
  comparing a hand-divided number to the floor.

## 2. The converted line's gate is currency inequality, not `requiresRate`

`requiresRate` answers "does the form demand a rate", and it is true for a USD commitment paid from
a USD account because `egp_amount` is the ledger's storage currency. That is not the same question
as "is there a conversion to show". The line renders on
`commitment.currency !== payAccount.currency` and nothing else.

So the USD/USD case shows no converted line and still demands a rate. The rate row gains a caption
saying why (`commitmentsPayRatePurposeEgp`), above the existing source and freshness line, because a
required field with no visible purpose reads as a bug.

## 3. Suppression is a flag, never an encoded `undefined`

`previewEgpAmount === undefined` means one thing: not derivable from what is on screen yet. It
renders the `—` placeholder. Hiding the whole preview line is a separate prop, `previewHidden`.

The pay sheet sets it for an EGP commitment, where an `≈ 5,000.00 EGP` line would echo the Amount
field one row above. The transaction forms never set it: an EGP-source amount there renders the
identity value, which is the fix for the multiply, not an argument for hiding the row. Collapsing
the two meanings into one prop would make the placeholder and the frame-2 suppression
indistinguishable at the call site.

## 4. Where each surface's preview is derived, and why they differ

| Surface | Derived in | Because |
|---|---|---|
| Pay sheet | `usePaySheet` | The amount is a watched RHF field the hook already re-renders on. |
| Add / edit transaction | `useTransactionRatePreview` | The typed amount is deliberately **not** in the form hooks. |

The second row is load-bearing. `amountStr` lives in its own store so that typing does not republish
the whole form; `add_transaction.hook.test.ts:116` pins it, and subscribing the form hook to the
amount takes the hook's render count from 2 to 3 and reds that test. `useTransactionRatePreview`
subscribes through the existing `useTransactionAmount(mode)`, the same mechanism `AmountHero` and
the rate-row wrapper already use, so a keystroke re-renders the row and nothing above it.

Do not hoist this derivation into `useAddTransaction` or `useEditTransaction` for symmetry with the
pay sheet. The asymmetry is the point.

## 5. The schema must not accept what the write path rejects

Two refines were added to `createPaySheetSchema` rather than to a hook-level `setError`, which
cannot block `handleSubmit`.

**Membership.** A non-empty `account_id` that is not in the store's loaded, non-archived list raises
on `account_id`. Before this, `accounts.find(...)` returned `undefined`, `needsRate` fell to false,
the schema passed, and `markAsPaid` failed at `commitment.repository.ts:211-214` with the generic
save banner. The resolution deliberately does **not** consult `getAccountByIdIncludingArchived`: the
write rejects archived accounts, so the form must too. Prefill drops an id that misses the list
before falling back to `accounts[0]`.

Pinned consequence: a set `commitment.account_id` opened against a store that has not published its
accounts yet is dropped, and **recovery is a manual re-pick**, not a later correction. The prefill
effect keys on `[visible, commitment?.id, payment?.id]` and does not list `accounts`, so it never
re-runs when the list arrives. Spec row 6 already mandates the re-pick, so the behaviour stands as
specified — it is the "it will fix itself in a moment" reading that is wrong.

**Sub-floor.** When `accountNativeAmount` is below `MIN_MONEY_AMOUNT` the Amount field carries
`commitmentsPayErrConvertedBelowMin` instead of the line rendering `= 0.00`. Worked case: 0.01 EGP
at 49.06 resolves to `0.00 USD`. The mockup's 0.40 EGP illustration does not reach this branch;
`roundMoney(0.40 / 49.06)` is `0.01`.

## 6. Decimals

The converted line passes no `decimals` override, so it takes `CURRENCY_CONFIG`'s value for the
paying account's currency: `= 4,906 EGP` at 0 dp, `= 101.92 USD` at 2 dp. The rate row keeps its own
`RATE_PREVIEW_AMOUNT_DECIMALS`, unchanged and already recorded at
`2026-08-21-currency-aware-display-decimals.md`. Frame 1 therefore renders the same quantity twice
at two precisions, `≈ 4,906.00 EGP` on the rate row and `= 4,906 EGP` below it. That is intended:
one is the ledger figure, the other is what leaves the account.
