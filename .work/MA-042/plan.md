# MA-042 — Retire the duplicate card-credit predicate in the transaction detail
base: a79f361bc330d919495ee2ea2eaba913e8958569 · verify: none · flags: none · expected diff: ~4 lines

## Steps

### 1. The transaction detail asks the shared predicate instead of its own copy

- File: `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` (`isCardCredit`, `detail.helpers.ts:124-126`)
- Change: delete the private `isCardCredit` and import the exported one from `../components/transaction_row.helpers`. The specifier is relative, matching `detail/index.tsx:7` (`../components/tx_delete_confirm_sheet`); it lands in the parent/sibling group next to `./components/detail_row` and `./detail.state`, and `npm run format` settles the order (`.oxfmtrc.json` `sortImports`, groups `["parent","sibling","index"]`, asc). The call site at `detail.helpers.ts:143` and everything downstream of `cardCredit` — `title`, `categoryBadge`, `categoryBadgeTone`, `heroColor` — is untouched. Both `AccountType` and `TransactionType` stay in the `@/constants/enums` import: `AccountType` is still used at `detail.helpers.ts:190`, `TransactionType` throughout. No other import is removed.
- Test: none added. `__tests__/screens/transactions/detail/detail_helpers.test.ts:191-211` already asserts `title`, `amountText`, `categoryBadge`, `categoryBadgeTone` and `heroColor` for credit-card income and is the guard through the change; the demonstration that it can fail is in Verification below. `isCardCredit` has no direct unit test today, on either side — it is covered through `buildTransactionRowPresentation`, `buildAccountActivityPresentation` and `buildTransactionDetailPresentation`, and this task is not the place to add one.

## Non-goals

- The transaction form's inline copy, `transaction_form.helpers.ts:25` — it takes `(type, accountType)`, not `(tx, account)`, and no task on the milestone owns it. Do not widen the shared signature to absorb it.
- The write path's reporting class in the transactions domain.
- `account_activity.helpers.ts`, which already imports the survivor (MA-036, #425).
- No shared "predicates" module, no re-export barrel, no move of `isCardCredit` to a neutral location. The exported function stays where it is.
- `formatTransactionTitle` and the `cardCredit ? Strings.cardCreditTitle : formattedTitle.title` line stay as they are.

## Verification

- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Guard demonstration, once, before the commit: with the change in place, invert the shared predicate (`return !(tx.type === ...)` at `transaction_row.helpers.ts:66-68`), run
  `npx jest __tests__/screens/transactions/detail/detail_helpers.test.ts __tests__/screens/transactions/transaction_row.helpers.test.ts __tests__/screens/accounts/account_activity.helpers.test.ts`
  and confirm the detail suite fails alongside the other two — that is the proof the detail now reads the shared answer rather than a survivor of the deletion. Revert the inversion; the same command must go green. All four cited test paths exist at this checkout (`test -f`, including `detail_hero.test.tsx`).
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks

- `detail.helpers.ts` gains a transitive module-scope dependency on `@/utils/responsive` (`ms()` reads `Dimensions` at import) and `@/constants/theme` through `transaction_row.helpers.ts`. One jest project, `jest-expo` preset, and `transaction_row.helpers.test.ts` already imports that module and passes, so `detail_helpers.test.ts` and `transfer_flow_card.test.ts` should be unaffected — if either breaks on import, that is why.
- No cycle exists today: nothing under `transactions/screens/transactions/components/` imports from `detail/`, and `transaction_row.helpers.ts` imports only constants, entities and utils. A later edit that points a `components/` file at `detail.helpers.ts` would close the loop.
- If a concurrent MA-015/MA-036 ticket rebases `transaction_row.helpers.ts` and moves or renames `isCardCredit`, the import specifier in step 1 is the only line to fix.

## Self-assessment

The step I am least sure about is the import specifier form. I chose the relative `../components/transaction_row.helpers` because `detail/index.tsx:7` reaches into the sibling `components/` folder that way and the ticket's Context names that precedent, but the only other consumer of this symbol, `account_activity.helpers.ts:8`, uses the full `@/modules/...` alias — because it is cross-module, which is a different case. Both compile and both satisfy the formatter's sort; if the reviewer prefers the alias for uniformity with the one existing `isCardCredit` importer, it is a one-token change with no other consequence.
