# ADR — where `roundMoney` belongs on a write path

- **Date:** 2026-08-22
- **Status:** accepted
- **Ticket:** MA-018 (issue #286), chunk 283a — the architectural deliverable
- **Decided by:** @tariq (architecture, per CLAUDE.md domain sovereignty). Composes with
  @layla's input-floor ruling of the same date (`MIN_MONEY_AMOUNT = 0.01`, checked on the raw
  parsed value before rounding) and with `.claude/rules/money.md`'s *"Round at this layer, once."*
- **Applies to:** the six money columns of MA-018 §6.5 —
  `transactions.amount`, `commitment_payments.amount_paid`, `commitments.amount`,
  `budgets.limit_amount`, budget-month income, spending-plan total and allocations.

## 1. The decision

**Round at the first point that is downstream of the user's raw input and upstream of every
derivation, validation and balance effect that reads the value.** That point is not one layer,
because the six columns are not one shape. It resolves, mechanically, from a single membership
question:

> Does this column have a **derived sibling** — another column computed from it in the same write
> (`egp_amount`, `to_amount`, an `AccountDelta`)?

- **Yes → the domain resolver, first line.** `resolveTransactionAmounts` and
  `resolveCommitmentPaymentAmounts` round the amount they *receive* before deriving anything from
  it, and **return** that rounded amount alongside the derived siblings. Every write binds the
  resolver's return value; no write binds a field of the object that was passed to the resolver.
- **No → the owning repository method, first statement.** `CommitmentRepository.add` / `.update`,
  `BudgetRepository.setExpectedIncome` / `.setBudget` / `.setSpendingPlan` round their input before
  they validate it, before they open a transaction, and before any query layer sees it.

Two layers, by construction, with a membership rule that decides which one a new column gets
without a second ADR. §6 states the invariant a reviewer checks each chunk against.

## 2. The constraint that forces "upstream", not "at the column"

The obvious fix — round where the value lands in the row — is wrong twice, in two different
modules, and both failures are `.claude/rules/review.md` item 3's drift class *introduced by the
fix*.

**Transactions.** `transaction.repository.ts:309` (add) and `:409` (update) are where `data.amount`
lands. Upstream of both:

- `validateNormalizedInput` (`:272`, `:375`) calls `normalizedAmountsMatch` (`:131-153`), which
  **re-derives** `egp_amount` from `input.amount` and compares it to the caller's;
- `toPolicyCommand` (`:295-303`, `:407-415`) feeds `data.amount` into the balance-delta effect.

Round only at `:309` and a `10.005 USD` transaction at rate 48 persists `amount = 10.00` beside
`egp_amount = 480.24` (re-derivation says `480.00`), while `current_balance` moved by `10.005`.
Three numbers, one payment, none of them agreeing.

**Spending plans.** `budget.schema.ts:99-105` rejects a plan whose allocations sum above its total.
`roundMoney` is monotone per value but **not** across a sum: total `1.00` with allocations
`[0.335, 0.335, 0.33]` sums to exactly `1.00` raw and to `1.01` after banker's rounding
(`0.335 → 0.34` twice). Round downstream of `validateSpendingPlanInput`
(`budget.repository.ts:439`) and the app persists a plan its own validator would reject. Round
upstream of it and the user gets `budgetPlanAllocationOver` at the field, which is the correct
outcome.

Same rule, two modules, no exceptions: **the rounded value is the one that gets validated, derived
from, and written.**

~~The converse total `1.00` with allocations `[0.5049, 0.5049]` does **not** silently pass end to
end, even though the repository's own check would let it through in isolation: `setSpendingPlan`
rounds first, so `validateSpendingPlanInput` (`budget.repository.ts:439`) sees `[0.50, 0.50]`
against a rounded total of `1.00` — exact, and it passes. But `spending_plan_sheet.hook.ts:149`
runs the identical schema against the **raw**, pre-rounding input first, and raw sum `1.0098` is
over the raw total `1.00`, so the hook's own check rejects it with `budgetPlanAllocationOver`
before `setSpendingPlan` is ever called — `budget.store.ts:284` is the repository method's only
caller, reached only once that check has passed. Verified by execution:~~

```
raw sum 1.0098 | rounded [0.5, 0.5]
RAW   (hook, pre-round)    success = false  Allocations exceed the plan total.
ROUNDED (repo, post-round) success = true
```

~~So the two example totals are not symmetric the way they first look. `[0.335, 0.335, 0.33]`'s raw
sum lands exactly on the total (`1.00`, not over), so the hook's raw check passes it through, and
only the repository's post-rounding check — reached as defence-in-depth — catches the rounded
overage. `[0.5049, 0.5049]`'s raw sum is already over, so the hook's raw check catches it first and
the repository check never runs. Both end in the same user-visible outcome — `budgetPlanAllocationOver`,
nothing written — just at different layers. There is no accepted converse case to record.~~

**Superseded by Addendum A (MA-020).** Both struck paragraphs above describe a layer split this
merge removes. Under the integer-cents basis the hook and the repository run the identical
comparison, so neither example is decided by which layer sees it first. `[0.335, 0.335, 0.33]` is
rejected at the **hook** — `34 + 34 + 33 = 101 > 100` — and `setSpendingPlan` is never reached;
on `main` it passed the hook, because `0.335 + 0.335 + 0.33 === 1` exactly and `1 > 1` is false,
and only the repository's post-rounding check caught it. `[0.5049, 0.5049]` is **accepted at
both** — `50 + 50 = 100`, not over — and is written as `[0.50, 0.50]`: the accepted converse case
the struck text said did not exist. The execution block above records the old behaviour and is
retained for that purpose. See Addendum A, points 2 and 3.

## 3. The three classes and their coverage

| # | Column | Class | Rounding point | Value bound at the write |
|---|---|---|---|---|
| 1 | `transactions.amount` | A | `resolveTransactionAmounts`, first line | `amounts.amount` at `transaction.repository.ts:309` / `:409`, supplied by `add_transaction.hook.ts:409-419` / `edit_transaction.hook.ts:312-322` |
| 2 | `commitment_payments.amount_paid` | A | `resolveCommitmentPaymentAmounts`, first line | `amounts.paymentAmount`, threaded from `commitment.repository.ts:207` into `commitment_payments.ts:274` **in place of `details.amount_paid`** |
| 3 | `commitments.amount` | B | `CommitmentRepository.add` (`:107`) and `.update` (`:121`), first statement | the rounded field of the composed `Commitment` / `UpdateCommitmentData`, into `commitments.ts:47` / `:91` — `Commitment.amount: number \| null` (null for Variable commitments), so this is the actual production caller of `roundMoney`'s `null` overload |
| 4 | `budgets.limit_amount` | C | `BudgetRepository.setBudget` (`:326`), first statement — `setLimit` (`:351`) delegates to it | `input.limit` into `setBudgetRow` (`budgets.ts:47`), whose own finite-and-positive check then runs on the rounded value |
| 5 | budget-month income | C | `BudgetRepository.setExpectedIncome` (`:317`), first statement — **before** `withExclusiveTransactionAsync` | `setBudgetMonthIncome(tx, …)` at `:321`, so `snapshotBudgetMonthCategoryGroups` at `:322` sees the rounded value |
| 6 | spending-plan total / allocations | C | `BudgetRepository.setSpendingPlan` (`:429`), first statement — **before** `validateSpendingPlanInput` at `:439` | `:493` `total_amount`, `:505` `allocated_amount` (null-preserving, see §7) |

**Class A's contract change.** Both resolvers gain a returned field carrying the rounded input:
`TransactionAmounts.amount` and `CommitmentPaymentAmounts.paymentAmount`. The names are fixed here,
not per chunk, because three chunks consume them.

Both resolvers round **before** their positivity throw (`transaction_amounts.ts:31-33`, `:77-79`),
so the throw fires on any amount that rounds to zero — which is what @layla's regression pins 23 and
25 require (`resolveTransactionAmounts({ amount: 0.005 })` must throw, and `0.005 > 0` is true).
`Number.isFinite` on the rounded value still catches `NaN` and `Infinity`.

Both resolvers become **idempotent under their own output**: `resolve(resolve(x).amount)` deep-equals
`resolve(x)`. That property is what keeps `normalizedAmountsMatch` green when the repository is
handed the rounded amount, and it is a one-line property test per resolver.

**`normalizedAmountsMatch` (`:148`) must also compare `amount`.** Today it compares only
`egpAmount` and `toAmount`, so a caller persisting a raw `amount` beside a correctly-derived
`egp_amount` passes the gate. Adding `input.amount === expected.amount` turns
`transactionRepository.add` / `.update` into a machine-enforced guard for column 1, for every future
caller. Blast radius is two callers today (`add_transaction.hook.ts:418`,
`edit_transaction.hook.ts:332`) plus direct-repository tests, all of which use already-2dp amounts.

**Free inheritance:** `commitment_housekeeping.helpers.ts:52` writes
`commitment_payments.amount_due` as `commitment.amount`. Rounding column 3 at its write makes
`amount_due` correct for every commitment created after this ticket, with no code in that file.

## 4. Why the other candidates lose

**(b) Form-mapping everywhere**, the `account_form.helpers.ts:24-36` pattern. It *can* satisfy §2 —
rounding `data.amount` in the two transaction hooks before the resolver call would work. It loses on
three counts:

1. **It scales with call sites, not columns.** `add_transaction.hook.ts` and
   `edit_transaction.hook.ts` are structurally identical and each pass `data.amount` twice (spec
   row 16). Four places for one column, against one in the resolver.
2. **It does not close row 18 by construction.** `commitment_payments.amount_paid` is written
   *inside* `commitment_payments.ts:274` from `details.amount_paid` — the resolver's own input
   object. A rounded value in the pay sheet does not reach that line; only "the write binds the
   resolver's return" does. Row 18 is the highest-value row in the ticket and this layer misses it.
3. **It contradicts `money.md:20`** and leaves the resolver a function that rounds its outputs and
   not its inputs — the exact asymmetry that produced all six defects.

**(c) Schema-enforced — a CHECK or a trigger.** Rejected, on four independent grounds:

1. **A CHECK detects, it does not round.** `CHECK(amount = ROUND(amount, 2))` still requires a
   rounding layer above it; it is additive cost, not an alternative.
2. **It is an equality test between two IEEE-754 doubles** — JS `Math.round(x*100)/100` against
   SQLite's `ROUND`. Agreement is not guaranteed for every value, and a disagreement is a hard write
   failure on a correctly-rounded amount with no user-visible recovery.
3. **SQLite cannot `ALTER TABLE … ADD CHECK`.** Six columns means six 12-step table rebuilds across
   `004_create_transactions.ts`, the commitments tables, budgets and `014_create_spending_plans.ts`,
   with every foreign key re-pointed — and the rebuild would **fail on real user data**, because
   pre-MA-018 sub-cent rows exist and spec §2 puts backfill out of scope as a data-loss risk
   (critical trigger 3). Choosing this layer converts MA-018's "no schema change, no migration"
   (spec §5) into the largest migration in the app's history.
4. **A rounding trigger breaks read-your-writes.** `transactionRepository.add` returns the
   `Transaction` object it constructed (`:306-335`), not a re-read row. A trigger that silently
   rounds on insert leaves the returned object — and every store consumer of it — holding a value
   the database does not have.

Its one genuine advantage is conceded in §7: it is the only layer that survives a write path added
later without anyone reading this ADR.

## 5. The `accounts.*` exception

`accounts.opening_balance`, `credit_limit`, `minimum_payment` and `apr` are rounded at
`account_form.helpers.ts:28/:35`, in the form-mapping layer. Under §1 they are class B and belong in
`AccountRepository`. MA-018 does not move them.

**Verdict: temporary, with a named follow-up** — move the two `roundMoney` calls out of
`requiredAmount` / `optionalAmount` and into `AccountRepository`'s write methods, leaving the helper
a pure parse-and-map. Not permanent: calling it permanent would license form-layer rounding as a
third legitimate pattern, and the whole value of §1 is that there is a rule rather than a
precedent per module.

**Why it is not in this ticket.** Spec row 32 puts it out of scope, and MA-018's `roundMoney`
overload set (spec §5) exists *specifically* so this file stays out of the diff. Editing it here
would make the overload argument moot and grow the ticket — scope balloon, critical trigger 6.

Note that accounts is already split, correctly, along §1's own membership line: `current_balance` is
a **derived** column and is rounded in the policy resolver (`transaction_policy.ts:86`), which is
this ADR's class-A rule already in force.

**The floor is not grandfathered the way the rounding layer is.** §5's exception is scoped to
`roundMoney` — the write-path rounding call this ADR governs. `MIN_MONEY_AMOUNT` is a separate
mechanism (Layla's input-floor ruling) enforced inside `parseNonNegativeDecimal` /
`parsePositiveDecimal` (`src/utils/parse_decimal.ts`), which `add_account.schema.ts` already
imported before this ticket. `accounts.*` therefore inherits the floor for free, through the shared
parser, with no change to this file. `add_account.schema.ts` routes five fields through
`parseNonNegativeDecimal`: `balance` (`:13`), `credit_limit` (`:46`), `min_payment` (`:64`),
`due_day` (`:87`), `apr` (`:110`). `'0.005'` in balance, credit_limit or min_payment now fails the
schema's own check with `Strings.errAmountInvalid`, reachable and legible rather than the pre-diff
silent `0`. `due_day` is unaffected — it already required an integer in `[1, 31]`, so `< 1` was
rejected before this floor existed and still is. `apr` is a percentage, not money, and its
behaviour genuinely changes: on `main`, `parseNonNegativeDecimal` only checked `>= 0`, so
`apr: '0.005'` (a 0.005% rate) parsed and passed; after the floor it fails with
`Strings.errAmountInvalid`. Benign in practice — no real card carries a 0.005% APR, and `0%` still
parses and passes, both before and after — but it is a real, if inconsequential, behaviour change
this PR causes outside its stated scope. The broader problem this is one instance of — the shared
floor leaking into non-money parsers — is filed as **#305**; not re-argued here. `toNewAccountInput`'s
`optionalAmount` null-fallback branch stays unreachable, since it and the schema share
`parseNonNegativeDecimal`, so a string the schema accepted always re-parses successfully in the
mapper.

**Addendum (MA-019): two write paths on one column, two classes.** §5 says above:

> Note that accounts is already split, correctly, along §1's own membership line: `current_balance` is
> a **derived** column and is rounded in the policy resolver (`transaction_policy.ts:86`), which is
> this ADR's class-A rule already in force.

That is correct and stays correct, scoped to the write path it names. `accounts.current_balance` has
**two** writers, and §1's membership question has to be asked of each. The transaction effect
(`transaction_policy.ts:85-86` → `normalizeMoney` → `AccountDelta`) derives siblings in the same
write, so it is **class A** — the domain resolver, unchanged by MA-019. The manual adjust
(`AccountRepository.adjustBalance` → `setAccountBalance`, `accounts.ts:117-132`) derives nothing —
one `UPDATE`, a value and a flag — so it is **class B**, and MA-019 adds the `roundMoney` as the
first statement of that repository method. Before it, that path reached SQLite with no rounding
anywhere on it. **This does not reclassify the column**; it classifies one of its two write paths,
and a wholesale reclassification would contradict the sentence quoted above.

§6's allowlist below reads "the only files in which **an MA-018 diff** may add a `roundMoney` call"
— scoped to that ticket by its own words, so it does not forbid this one. Mechanical check 1 will
still flag `account.repository.ts` in an MA-019 diff; this paragraph is the record that it is
intended.

Accepted asymmetry: `AccountRepository` now rounds in `adjustBalance` and trusts its caller in
`add`, whose only reachable input already rounds at `account_form.helpers.ts:28`. Closing that is
§5's named follow-up above, which this paragraph does not prejudge.

## 6. The invariant

> **No money value reaches a `db.runAsync` parameter list without having passed `roundMoney`
> exactly once, upstream of every derivation, validation and balance effect that reads it — inside
> `resolveTransactionAmounts` / `resolveCommitmentPaymentAmounts` for the two columns with derived
> siblings, where the write binds the resolver's *return* value and never the input object handed
> to it, and as the first statement of the owning repository method for the four columns without —
> so the only files in which an MA-018 diff may **add** a `roundMoney` call are `src/utils/money.ts`,
> `src/modules/transactions/domain/transaction_amounts.ts`,
> `src/modules/commitments/repositories/commitment.repository.ts` and
> `src/modules/budget/repositories/budget.repository.ts`.**

Three mechanical checks, none of which require re-deriving the call graph:

1. **Allowlist.** `git diff main...HEAD -U0 | grep -nE 'roundMoney\(|toCents\(|sumAllocations\('` —
   every added call site is in one of the four files above. A `roundMoney` in a hook, a schema, a
   component, a `*.state.ts`, a `*.helpers.ts` or anything under `src/modules/*/database/` is a
   finding, improvement or not. The two transitive rounders are in the pattern so that the grep can
   see the call sites at all; where they are permitted to appear is Addendum A point 1's ruling, not
   this list's. The paren keeps every alternative matched on call sites rather than mentions.
2. **Six bindings.** At each of §3's six write lines, the bound identifier is either a resolver
   return field or a local rounded at the method's first statement. Six `file:line` reads.
3. **Two properties.** The resolver idempotence tests exist and pass, and
   `transaction.repository.ts:148` compares `amount`.

The allowlist governs **added** calls only. `roundMoney` is legitimately used at 33 call
expressions on `main`, most of them in the display and aggregation layer (`dashboard.helpers.ts`
×10, `transaction_policy.ts` ×7); those are untouched, and two files carrying them —
`account_card.tsx:167` and `format_amount.ts:122`, the latter *removed* by c2 — are in this ticket's
diff for unrelated reasons. `account_form.helpers.ts:28/:35` is the one grandfathered write-path
call site outside the allowlist (§5) and is not in this ticket's diff at all.

## 7. Accepted residuals

- **The budget copy path is not covered.** `copyBudgetsToMonth` / `copyLimitsToMonth`
  (`budget.repository.ts:357/:374`) read stored rows into JS and re-write them through `setBudgetRow`,
  so copying a pre-MA-018 unrounded budget creates a **new** unrounded row. Rounding there would be
  a partial backfill performed silently under a button labelled "copy", and spec row 26 rules out
  backfill. **What MA-018 makes true is therefore: every money value originating at an input
  boundary is 2dp — not: every row written after MA-018 is 2dp.** Stated here so nobody claims the
  stronger version.
- **A future write path added without reading this ADR is unprotected.** That is schema
  enforcement's one real advantage and §4 declines to pay for it. The mitigation is §6 check 1 — a
  grep an implementation reviewer runs on every diff — not a database constraint.
- **Existing rows are not rewritten** (spec row 26 / @layla Q6). The residual is aggregation
  exactness, already an accepted class under `.claude/rules/review.md` item 3.
- **Three rounding locations ship in this repo** after MA-018: two sanctioned (§1) and one
  grandfathered (§5). §6's allowlist is what stops a fourth.
- **Display and persisted value disagree at exact half-cent ties.** `formatDisplayMagnitude`'s
  escalate branch (`src/utils/format_amount.ts`) borrows only `roundMoney`'s 2dp *precision*, never
  its half-even *mode* — a display string is never aggregated, so the unbiasedness `roundMoney`'s
  mode exists to protect does not apply to it, and `Intl.NumberFormat`'s half-expand is what every
  other call to `formatAmount` already uses. At an exact 2dp tie this means the digit on screen can
  differ from the digit `roundMoney` would persist for the same raw value: `0.025 EGP` displays
  `'0.03'` (half-expand) while `roundMoney(0.025)` persists `0.02` (half-even). Confirmed, not merely
  argued: no escalate-branch output is ever summed, re-parsed, or fed back into a resolver — it is a
  terminal display string at all five call sites (`transactions.helpers.ts`, `detail.helpers.ts`,
  `transaction_row.helpers.ts`, `transfer_flow_card.tsx`, `formatCommitmentAmount`). This is a
  residual of §1's write-path rounding mode, not a defect in it, and is scoped to values that are
  simultaneously (a) below the site's display precision and (b) an exact half-unit at the 2dp
  escalation cap — a narrow intersection, but real whenever it lands.

## 8. Consequences for the implementation chunks

- **c6 (transactions):** resolver rounds first and returns `amount`; both hooks bind
  `amounts.amount` for the persisted amount; `normalizedAmountsMatch` compares `amount`;
  idempotence test.
- **c7 (commitments):** resolver returns `paymentAmount`; `markAsPaid` threads it into
  `commitment_payments.ts:274`; `CommitmentRepository.add` / `.update` round `amount`. Confirm by
  grep that `markAsPaid` has exactly one caller chain (`commitment.store.ts:261` ← `pay_sheet.hook.ts:153`)
  and that nothing passes `updatePaymentStatus`'s optional `amount_paid` field.
- **c8 (budgets):** `parseLimit` is deleted in favour of `parse_decimal.ts`; the three repository
  methods round at their first statement. `allocated_amount` (`014_create_spending_plans.ts:18`)
  needs `null` to survive, but `setSpendingPlan` (`budget.repository.ts:435-436`) special-cases
  `undefined` before the call rather than exercising the overload, so this is not where
  `roundMoney`'s `null` overload is actually used in production — see §3's row 3 note above for the
  real caller.

## Addendum A — the allocation-sum comparison moves to an integer-cents basis (MA-020)

2026-08-23, `#304` / `#303`. Amends §2. §1's rule, §3's classes, §5's exception and §6's
invariant are unchanged.

1. **The basis.** The spending-plan allocation-sum-versus-total comparison no longer compares
   floats. It runs on integer cents through `toCents(n) = Math.round(roundMoney(n) * 100)` and
   `sumAllocations(amounts, total)`, both in `src/utils/money.ts`. `roundMoney` moves *inside*
   `toCents`, so §6's allowlist is satisfied by construction rather than by exception —
   `src/utils/money.ts` is the only file in which MA-020 **adds a `roundMoney` call**, and check 1
   still resolves to one file. Check 1 is over added call sites, not textual mentions — this
   addendum names `roundMoney` in prose several times and adds no call site anywhere. But from this
   merge on, a `toCents(` or `sumAllocations(` added in a repository, hook or schema **is** itself a
   rounding call site, so §6 check 1's pattern is widened to cover both: §7 names that grep as the
   sole mitigation for a write path added without reading this ADR, and unwidened it would already
   be blind to the one this addendum adds at `budget.schema.ts:94`.
   `budget.schema.ts`'s `superRefine` and
   `spending_plans.helpers.ts`'s `computeAllocationHelper` both delegate to `sumAllocations`, so
   the live preview and the save gate cannot disagree. `#303`'s literal proposal
   (`Math.round(x * 100)`, without `roundMoney`) was rejected: it diverges from the persisted
   value at every exact half-cent — 9,999 of 199,999 sampled values, 5.0%, all ties.

2. **§2's `[0.5049, 0.5049]` execution changes verdict at the hook layer.** Under integer cents,
   `toCents(0.5049)` is `50` twice, `100 > 100` is false, and the plan is **accepted** — where
   `main@8a0d104` rejected it on the raw sum `1.0098 > 1.00`. This is the correct outcome under
   §2's own stated principle: the values that get written are `[0.50, 0.50]`, which are exact
   against `1.00`. The two-layer structure is unchanged and both `safeParse` calls stay — the
   repository's is the only guard `setSpendingPlanRow` and `replaceSpendingPlanCategoryRows` have
   for any future non-sheet caller. What is gone, for this check specifically, is the property
   §2 called defence-in-depth: the layers no longer compute different things, so the second one
   no longer catches what the first missed. Keep both calls for guard coverage; stop describing
   them as independently verifying.

3. **§2's `[0.335, 0.335, 0.33]` example keeps its verdict, changes its layer, and its test still
   passes.** `0.335 * 100` is exactly `33.5`, so the roundMoney-based and bare-`Math.round`
   derivations agree: `34 + 34 + 33 = 101 > 100`, rejected under either. The rejection is what is
   unaffected; **where it happens is not.** On `main@8a0d104` only the **repository** rejected this
   — it rounds to `[0.34, 0.34, 0.33]` before validating — while the hook passed it through, since
   the raw sum is exactly `1.00` and `1 > 1` is false. Under integer cents the hook rejects it too
   and `setSpendingPlan` is never called.
   `__tests__/budget.repository.round_at_write.test.ts:227-253` invokes the repository directly, so
   it is untouched by that shift and passes with **no assertion edited**, verified by execution.
   Its comment at `:227-234` did not survive: `:229` said these raw values "pass the hook's own
   pre-check", which was true of `main@8a0d104` and is false the moment the basis changes, so
   MA-020 corrects that clause in the same commit that changes the basis. The record of the old
   layering is this point, in this addendum — not a sentence left standing in a test file after it
   stopped being true. Recorded here so nobody "fixes" that test's assertions while changing the
   basis, and so nobody restores the struck clause.

4. **Display precision on the running-total line.** `Strings.budgetPlanAllocationHelper`'s three
   interpolations render at a fixed 2dp via a named `SPENDING_PLAN_ALLOCATION_DECIMALS` constant
   passed to `formatAmount`'s own `decimals` parameter, and the `Math.max(0, buffer)` clamp is
   deleted so an over-allocated plan shows its true signed buffer. This surface deliberately
   overrides the currency display default: it is a live-entry confirmation line, not an at-rest
   amount, so `formatDisplayMagnitude`'s escalate-on-zero rule is the wrong instrument — `45.40`
   renders `"45"` at EGP's 0dp, silently wrong and never literally zero, so escalation never
   fires. Cross-referenced from
   `docs/adr/2026-08-21-currency-aware-display-decimals.md`.
