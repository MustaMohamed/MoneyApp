# MA-037 — Back after See all or a row tap lands on the Dashboard
base: 73da991b6ba530a495324cb6f10ec0ce15d1495a · verify: emulator · flags: none · expected diff: ~50 lines outside tests

Shape: a `/stacked/...` subtree of the `(app)` Stack mirrors the two tab routes a jump can land on, so a jump from the account detail pushes a sibling of the detail instead of a second `(tabs)`; See all and the add link stop pushing altogether and pop to the existing `(tabs)` route.

## Steps

### 1. A route knows whether it is the stacked copy or the tabbed one
- File: `src/modules/navigation/domain/stacked_route.ts` (new; `src/modules/onboarding/domain/onboarding_route.ts` is the precedent for a pure route module under `domain/`)
- Change: export `STACKED_PREFIX = '/stacked'`, the type `StackedPrefix = '' | typeof STACKED_PREFIX`, `stackedPrefixOf(pathname: string): StackedPrefix` returning `STACKED_PREFIX` only when the path's first segment is `stacked`, and `stackedTransactionDetailRoute(transactionId: string)` returning `` `${typeof STACKED_PREFIX}/transactions/detail/${string}` ``. No React import — callers pass `usePathname()`.
- Test: `__tests__/screens/navigation/stacked_route.test.ts` — `/stacked/transactions/detail/tx-1` and `/stacked/commitments/pay-1` give `/stacked`; `/transactions/detail/tx-1`, `/commitments/pay-1`, `/accounts/a-1`, `/` and `/stackedthing` give `''`.

### 2. The stacked subtree exists as routes of the `(app)` Stack
- Files (new, one-line re-exports, same targets as their tabbed twins):
  - `src/app/(app)/stacked/transactions/detail/[id]/index.tsx` → `@/modules/transactions/screens/transactions/detail`
  - `src/app/(app)/stacked/commitments/[id]/index.tsx` → `@/modules/commitments/screens/commitments/detail`
- Change: `stacked` is a plain segment, not a group, so these are distinct URLs from `/transactions/detail/[id]` and `/commitments/[id]` — a group would collide. No `_layout.tsx` under `stacked/`: the two routes must be siblings of `accounts/[id]` in the `(app)` Stack, which is what makes back pop to the account detail. Nothing points at them yet.
- Test: none — a one-line re-export has no logic, and asserting the file's text is the source-text assertion `.claude/rules/tests.md` bans. Step 4's and step 5's hook tests pin the hrefs; the emulator pass proves they resolve.

### 3. The transaction form host outlives the tab navigator
- Files: `src/app/(app)/_layout.tsx`, `src/modules/navigation/screens/tabs/index.tsx` (`TabsLayout`, `index.tsx:86`)
- Change: move `<TransactionFormHost />` from `TabsLayout` to `(app)/_layout.tsx`, rendered as a sibling of `<Stack>` inside a fragment. `freezeOnBlur: true` on that Stack applies to its screens, not to a sibling, so the host is live while a stacked route is on top — today it is frozen inside `(tabs)` and `openEdit` opens nothing. `FABOverlay` stays in `TabsLayout`; it belongs to the tab bar. Keep the `ErrorBoundary` re-export and `useInit` untouched. One host, so no second writer to `useTransactionFormState`.
- Test: none — the change is a mount position, and the repo adds no render tests. `__tests__/screens/transactions/transaction_form/transaction_form_host.test.tsx` renders the host directly and is unaffected.

### 4. The account detail's three jumps stop pushing a second tab navigator
- File: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts` (`goToTransaction:246`, `goToAllTransactions:250`, `addTransactionForAccount:256`, the comments at `:23` and `:255`)
- Change:
  - `goToTransaction` → `router.push(stackedTransactionDetailRoute(transactionId))`, a sibling of the account detail on the `(app)` Stack.
  - `goToAllTransactions` and `addTransactionForAccount` → `jumpToTransactionsTab()`, a local helper that calls `router.dismissTo(TRANSACTIONS_TAB)` twice, with `seedAccountFilter` still before it and the two-frame `openAdd` still after it. Call one is a `POP_TO` at the `(app)` Stack (`POP_TO` is outside `isStackAction`, `StackClient.js:19-25`, so `StackRouter.js:336` handles it): it reuses the existing `(tabs)` route and cannot append one, dropping the account detail, the accounts list and any stacked route with it, and its fresh nested params switch the tab at the tabs navigator's next render (`useNavigationBuilder.js:415-433`). Call two is dispatched before that render, in the same queue drain (`routingQueue.js:23-43`) and against a root state that already holds the pop (`getNavigationAction.js:19`, live through `useOnGetState.js:47-54` and `useSyncState.js:47-64`), so `findDivergentState` diverges one level deeper and the same `POP_TO` pops the transactions tab's own Stack back to `index` (`StackRouter.js:353-363`). Without call two that Stack keeps the detail it was holding — `popToTopOnBlur` never fired, because the tab navigator's own index did not move (`BottomTabView.js:78`, `:92-93`) — the render-time `NAVIGATE 'index'` appends a duplicate instead of matching the current route (`StackClient.js:98-103`, `:205-213`), and back lands on that detail rather than the Dashboard. When the tab is not transactions, call two targets the tab navigator instead, which has no `POP_TO` case (`TabRouter.js:186-309`, default `BaseRouter.getStateForAction`), and `useOnAction.js:71` marks it handled and unchanged — a no-op, not an unhandled-action warning.
  - Replace the `:23` comment, which now describes neither call, with the one line the helper needs: the second `dismissTo` pops the landed tab's own Stack, because after the first the href diverges there.
  - Rewrite the `:255` comment to the reason that survives step 3: the two frames are there because a `Sheet` that first renders already-open never animates in. "The tabs host is frozen until then" stops being true the moment the host leaves `(tabs)`, and a stale reason reads as licence to delete a workaround the ticket keeps.
- Test: `__tests__/screens/accounts/account_detail.hook.test.ts` — the three existing cases at `:356`, `:370`, `:383` change target: add `dismissTo` to the `useRouter` mock at `:30`, assert two `dismissTo(TRANSACTIONS_TAB)` calls for See all and for the add link (filter seeded before both, form opened after both), `push('/stacked/transactions/detail/tx-9')` for the row, and that `navigate` is never called. The comment at `:369` carries the same stale freeze reason; rewrite it with the one at `:255`.

### 5. The commitment payment route follows the copy it is opened from
- Files: `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` (`getCommitmentPaymentRoute:193`), `src/modules/transactions/screens/transactions/detail/detail.hook.ts` (`openCommitment:195`)
- Change: `getCommitmentPaymentRoute(paymentId, prefix: StackedPrefix = '')` returns `` `${StackedPrefix}/commitments/${string}` ``. The hook reads `const stackedPrefix = stackedPrefixOf(usePathname())` at the top level and passes it at `:205`; the tabbed copy resolves `''` and is unchanged. `openAccount:215` keeps its bare `/accounts/${id}` — that route is on the `(app)` Stack in both copies.
- Test: `__tests__/screens/transactions/detail/detail_helpers.test.ts` — one case for the prefixed form beside the existing `:97`. `__tests__/screens/transactions/detail/detail_hook.test.ts` — add `usePathname` to the `expo-router` mock at `:23`; the existing `:303` case keeps `/commitments/payment-1` under a tabbed pathname, and a new case under `/stacked/transactions/detail/tx-1` expects `/stacked/commitments/payment-1`.

### 6. A refocused transaction detail re-claims its own store slot
- File: `src/modules/transactions/screens/transactions/detail/detail.hook.ts` (`useTransactionDetail`, beside the `ownsRoute` derivation at `:129`)
- Change: `useFocusEffect` that calls `bumpReload()` only when `useTxDetailStore.getState().txId !== id` — a gate, not an unconditional focus reload. Step 4 makes two transaction details mountable at once (account detail → row → transaction → account chip → account detail → row), and `useTxDetailStore` is a single slot; without a re-claim the lower copy renders `ownsRoute === false` for good, i.e. a skeleton that never resolves, because its load effect's deps have not changed. Either copy can be the lower one: the tabbed detail survives an `(app)` Stack push, since `popToTopOnBlur` fires only on a tab switch (`BottomTabView.js:92-93`), so the gate belongs in `useTransactionDetail`, which both copies share, not on the `stackedPrefix`.
- Test: `__tests__/screens/transactions/detail/detail_hook.test.ts` — add `useFocusEffect` to the `expo-router` mock (invoke the callback); with the store holding another id, focusing bumps `reloadKey` and re-runs `getById` for this route's id; with the store already holding this id, focusing calls neither.

## Screens
- Account detail (an account with recent activity): before the jump, and after back from a row tap — the same rows, no tab bar on either.
- Account detail after a write made from the stacked detail: edit a row's transaction and go back, the card shows the new amount; delete a row's transaction and go back, the row is gone. This is Acceptance 1's reload clause, and the card's reload rides a focus effect on a screen that now refocuses on a pop rather than a tab switch.
- Stacked transaction detail: loaded state, no tab bar; the form sheet open over it after Edit; the same screen after saving an edit, with the changed amount.
- Stacked commitment payment reached from a commitment-owned transaction: loaded state, and the transaction again after back.
- The tabbed transaction detail after a round trip through the stacked one — that transaction, its account chip, a row, then back and back: the transaction loaded, not a skeleton. This is the lower copy step 6 re-claims.
- Transactions tab after See all: the seeded account filter applied; then the Dashboard after back, and the Dashboard again after a second back.
- See all from an account detail reached two taps deep — transactions tab, a transaction, its account chip, See all: the filter applied, and the Dashboard after one back, not the transaction. This is the entry that leaves a detail in the tab's own Stack.
- Account detail with an empty activity card: the form after the add link, then the transactions tab once it closes, then the Dashboard after back.
- The tab bar after each return: one bar, and each of the five tabs switching.

## Non-goals
- The activity card's appearance (MA-036) and the detail's chrome (MA-035, #424).
- The stacked transaction detail's account chip keeps `router.push('/accounts/<id>')`: the stack grows by a pair per round trip, which is what a stack does, and each back pops one. Step 6 removes the only consequence that is not.
- Edit on the stacked commitment payment is left as it is. `commitments/screens/commitments/detail/detail.hook.ts:181` pushes the tabbed `/commitments/<id>/edit`, so from the stacked subtree it mounts the second tab bar this ticket removes elsewhere. Acceptance 3's walk ends at the payment and the back press to the transaction, and Rule 3 keeps the commitment edit and deactivate writes out of the new subtree. Do not add the `edit` route or prefix that href here; fixing it needs its own Acceptance line, as a sibling task.
- No new write path, no migration, no native config, no sixth tab, no change to any screen's layout or copy. No change to `edit_commitment.hook.ts`'s post-deactivate navigation, which serves no Acceptance line and would alter the tabbed tree.
- No stacked twin for any route beyond the two in step 2. `/accounts/add_account` and `/commitments/add` are already `(app)` Stack routes; `goToEdit` above is the only href reachable from inside the stacked subtree that still points into `(tabs)`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- JS-only: two new route files and hook edits, no native surface. Confirm with `mqa needs-build` and run the parity chain before the render pass so it and the render lens share one APK.

## Risks
- `stackedPrefixOf(usePathname())` reads the *current* route, not the component's own. Correct while only the focused screen's handlers can fire, wrong if a frozen copy's handler ever runs. If the emulator shows the tabbed copy pushing a `/stacked` href, replace the pathname read with a context provider set by a wrapper screen behind each stacked route file.
- Metro resolves routes through `require.context`; two new files may need `--clear` and an `am force-stop` before the render pass sees them, or the walk tests the old route table.
- The second `dismissTo` works only while no render lands between the two dispatches: React defers the re-render that `setState` schedules inside `routingQueue.run`'s effect until the effect returns. If one ever did, the tab's Stack would already read `[index, detail, index]`, `POP_TO 'index'` would match the current route and pop nothing (`StackRouter.js:353-355`), and back would show the detail — the same symptom as dropping the call, which the two-taps-deep Screens state catches.
- `typedRoutes: true` with no `.expo/types` in this worktree means the new hrefs are unchecked here; a machine with generated types will check them after Metro regenerates.

## Self-assessment
Step 6 is required, not a hedge, and freeze semantics do not decide it. The upper transaction detail's unmount runs `resetData()` (`detail.hook.ts:133-138`), which sets `txId` to `undefined` (`detail.store.ts:40`); the lower copy's load effect deps, `id` and `reloadKey`, never change, so `ownsRoute` stays false, `currentStatus` falls to `'initialLoading'` and `viewState` to `'loading'` — a skeleton that never resolves, whether or not passive effects re-run on unfreeze. Implement it.

Step 4's second `dismissTo` is settled against the installed 57.0.19 source. `POP_TO` keeps the `(tabs)` route's nested `state` and only refreshes its params (`StackRouter.js:379-401`), so the transactions tab's own Stack survives the pop with whatever detail `popToTopOnBlur` never removed. No single dispatch resets both stacks: the nested chain carries only `screen`, `params`, `merge` and `pop` downward (`useNavigationBuilder.js:426-433`), and `NavigationOptions` exposes none of them (`global-state/types.d.ts:7-25`). The second call is the smallest thing that reaches the inner Stack, and the queue orders it — `routingQueue.run` drains both `ROUTER_LINK`s in one synchronous loop and resolves each against `getRootState()` at its turn (`routingQueue.js:23-43`). Implement it.
