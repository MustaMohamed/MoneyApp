# MA-063 — Commitments: "Unnamed account" on the form, pay sheet and detail rows, the filter options and summary
base: efd1d2da07a95a38698fd0c1b1e6e43c2f60f1e6 · verify: emulator · flags: none · expected diff: ~15 lines

Resolver: `resolveAccountName(account: Account | undefined): string` in `src/utils/account_name.ts` (unknown → `Strings.unknownAccount`, `is_deleted === 1` → `Strings.deletedAccount`, `name.trim() === ''` → `Strings.unnamedAccount` at `src/constants/strings.ts:894`, else the stored name). Every step below imports it from `@/utils/account_name`; none adds a branch or a string. The commitments files type `Account` from `@/database/entities/account.entity`, a `export type` re-export of the module entity the resolver takes, so no import changes.

MA-052 (#454) has no merged PR at this base (`git log --oneline -8 -- src/modules/commitments/screens/commitments/detail` ends at MA-050, #470); the detail line numbers below are HEAD's.

## Steps
### 1. Search on "Unnamed" matches no blank-named account, and the filter checkbox still reaches it
- File: tests only, no source change. `src/modules/commitments/screens/commitments/commitments.hook.ts:116` keeps `accountsById.get(accountId)?.name`; `filter/filter.helpers.ts:118-132` keeps matching on `candidate.accountName`.
- Change: none.
- Test: `__tests__/screens/commitments.hook.test.ts`, beside the case at `:428`. First a populated-map pre-assertion: `setup({ commitments: [makeCommitment('commitment-blank', { account_id: 'account-wallet' })], payments: [makePayment('blank', CommitmentPaymentStatus.Due)], accounts: [makeAccount('account-wallet', 'Wallet')], searchQuery: 'wallet' })` renders `['blank']`, so `accountsById` is known to reach `commitmentMatchesSearch`. Then `setup({ commitments: [makeCommitment('commitment-blank', { account_id: 'account-blank' })], payments: [makePayment('blank', CommitmentPaymentStatus.Due)], accounts: [makeAccount('account-blank', '')], searchQuery: 'Unnamed' })` renders `state.sections` with no rows; a second `setup` with `searchQuery: ''` and `appliedFilters: { ...EMPTY_COMMITMENT_FILTERS, accountIds: ['account-blank'] }` renders `['blank']` (`makePayment('blank', …)` sets `commitment_id: 'commitment-blank'`, `:82`). All three pass at base by design; the `'Unnamed'` case fails if `commitments.hook.ts:116` is ever routed through the resolver. No `filter_helpers.test.ts` case: `filter.helpers.ts:80-89,118-132` are untouched and the id-match arm is already at `filter_helpers.test.ts:135`, so a case there cannot fail on this ticket's files.

### 2. The filter's draft account summary reads the label
- File: `src/modules/commitments/screens/commitments/filter/filter.hook.ts` (`accountSummary`, `:63-68`)
- Change: `.map((account) => resolveAccountName(account))` replaces `.map((account) => account.name)`; the `.filter` stays on `account.id`. `formatCommitmentSelectionSummary` and the category summary are untouched.
- Test: `__tests__/screens/commitments/filter/filter_hook.test.ts`: `beforeEach` adds `useAccountStore.getState().reset()` (the suite uses the real store, nothing mocks it; `reset` is at `account.store.ts:172`); new case `useAccountStore.setState({ accounts: [makeTestAccount({ id: 'a1', name: '' }), makeTestAccount({ id: 'a2', name: 'Wallet' })] })`, `toggleAccountId('a1')` then `('a2')` inside `act`, and `result.current.state.accountSummary` is `` `${Strings.unnamedAccount}, Wallet` `` per `formatCommitmentSelectionSummary` (`filter.helpers.ts:134-139`); with no selection it is `Strings.filterSummaryAccountsEmpty`. Adds the `useAccountStore` (`@/modules/accounts/store/account.store`), `Strings` and `makeTestAccount` (`@/test_helpers/transaction`) imports. Fails at base: the summary reads `, Wallet`.

### 3. The filter option and its accessibility label read the label
- File: `src/modules/commitments/screens/commitments/filter/components/account_accordion.tsx` (`:32,34`)
- Change: `label: resolveAccountName(account)` and `accessibilityLabel: Strings.commitmentFilterAccountAccessibility(resolveAccountName(account))`; `id` and `selected` stay on `account.id`, so the checkbox still reaches the account. `__tests__/screens/filter_component_architecture.test.ts` lists this file: no `useMemo`, and `@/utils/account_name` is not a forbidden import.
- Test: none. `.tsx`, no render tests (`.claude/rules/tests.md`). The ticket's Context says `filter_sheet.test.tsx` asserts this label; it does not: that suite mocks `CommitmentAccountAccordion` to a `<Text>Accounts section</Text>` (`filter_sheet.test.tsx:88-93`). The emulator walk shoots it (Screens).

### 4. The detail's Default account row reads the label, and "None" with no account
- File: `src/modules/commitments/screens/commitments/detail/components/details_card.tsx:38`
- Change: `value={account ? resolveAccountName(account) : Strings.commitmentsDetailNone}` replaces the `??`, which never fires on `''`. `detail.hook.ts:144-147` keeps handing an undefined `account` for a commitment without `account_id`.
- Test: none. `.tsx`, no render tests; the branch on `undefined` is the resolver's own `Strings.unknownAccount` case kept out by the ternary. The emulator walk shoots the blank row.

### 5. The pay sheet's account row reads the label
- File: `src/modules/commitments/screens/commitments/detail/components/pay_sheet.tsx:183`
- Change: `{resolveAccountName(state.selectedAccount)}` replaces `{state.selectedAccount.name}` inside the existing `state.selectedAccount ?` branch; the icon, colour and balance lines stay. `pay_sheet.hook.ts:198-201` keeps returning the raw `Account`.
- Test: none. `.tsx`, no render tests; `__tests__/screens/commitments_pay_sheet.hook.test.ts` reads the hook, which does not change. The emulator walk shoots it.

### 6. The commitment form's account row reads the label
- File: `src/modules/commitments/screens/commitments/components/commitment_form_body.tsx:388`
- Change: `{resolveAccountName(selectedAccount)}` replaces `{selectedAccount.name}` inside the existing `selectedAccount ?` branch (`:380`); the placeholder branch `Strings.addTxPickAccountTitle` stays. Nothing is written to the form values.
- Test: none. `.tsx`, no render tests; `__tests__/screens/commitments_form_body.hook.test.ts` covers the hook, which does not change. The emulator walk shoots it.

## Screens
- Seed on the device DB: `UPDATE accounts SET name = '' WHERE id = '<the default account of one commitment>'`, then `am force-stop` and relaunch (the account store caches names).
- Commitment detail, that commitment: the Default account row reads "Unnamed account"; tap Pay, the pay sheet's account row reads "Unnamed account" with the balance line under it.
- Same commitment, Edit: the Default account row reads "Unnamed account". No test reaches this row.
- Commitments tab, filter sheet, Accounts accordion expanded: the blank account's option reads "Unnamed account"; after selecting it the accordion summary reads "Unnamed account". Step 2's test asserts the summary; the option label has no test, which is why the sheet is on the walk despite the ticket's Context.
- Not shot: search on "Unnamed" and the checkbox reaching the account (step 1), a commitment with no account reading "None" (a ternary on `undefined`, unchanged).

## Non-goals
- `Strings.unnamedAccount`, the resolver and `src/modules/accounts/components/account_picker_sheet.tsx:68` (MA-059, merged at base).
- Dashboard (MA-060), onboarding (MA-061), transactions (MA-062); blank commitment names (MA-058).
- `filter/filter.helpers.ts:141-143` `selectedNames`: no caller in `src/` or `__tests__/`; not routed through, not deleted.
- Search matching the label: `commitments.hook.ts:116` stays on the stored name.
- The pay sheet's title `Strings.commitmentsPayTitle(commitment.name)` (`pay_sheet.tsx:92`) is the commitment's name, not an account's.
- Trimming or rewriting a stored name; no repository, store or migration change.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check: step 2's test fails at base (`accountSummary` reads `, Wallet`). Step 1's tests pass at base by design.

## Risks
- MA-052 (#454, Planned) edits `pay_sheet.tsx` and the detail; if it merges first, steps 4 and 5 rebase onto its lines, the symbols stay.
- `filter_hook.test.ts` writes the real `useAccountStore` with `setState`; if a later change wraps the store in a selector helper that rejects direct `setState`, the case needs the harness `commitments.hook.test.ts` uses (`attachMockSelectorStore`).
- Amended after review: step 1's `filter_helpers.test.ts` half dropped, it could not fail on this ticket's files; the hook case gains the populated-map pre-assertion.
- Step 1's hook case relies on `useDebouncedValue` seeding its state from the first `searchQuery` (`use_debounced_value.hook.ts:5`), the same way the existing `:428` case does.

## Self-assessment
Step 1's hook case is the least sure. The harness at `commitments.hook.test.ts:160-222` mocks four stores through `attachMockSelectorStore`, and the existing search case at `:428` proves a `searchQuery` set in `setup` reaches `sections` on the first render, but that case searches a commitment name; the account-name arm of `commitmentMatchesSearch` is exercised only through `accountsById`, which is a `useMemo` over the mocked `accounts` selector. If the selector mock returned `accounts` under a different key than the hook's `useAccountStore((s) => s.accounts)` reads, `accountsById` would be empty, the blank account would resolve to `undefined`, and the `'Unnamed'` case would pass for the wrong reason; the pre-assertion on a named account is there to catch that, and it is the part of the step that has not been run.
