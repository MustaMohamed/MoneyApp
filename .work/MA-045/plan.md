# MA-045 — The category reassign and the commitment payment announce their transaction writes
base: 1a612bf6d85e56accd99d811fe0f6a981e613c1a · verify: emulator · flags: none · expected diff: ~16 lines outside tests (~117 with tests)

The signal is raised at the store layer, not in the two screen hooks: `useCategoryStore.reassignAndDelete` and `useCommitmentStore.markAsPaid` are the actions that own these writes, and every other transaction write announces from the store that owns it. The announcement is the version bump alone — no list refresh. `transactions.hook.ts` already refreshes its snapshot on focus, and both writes happen on other screens; the bump is what the five consumers key on.

## Steps

### 1. The transaction store exposes an announcement for a transaction-row write it did not perform
- File: `src/modules/transactions/store/transaction.store.ts` (`TransactionStore` type at `:56`, `bumpMutationVersion` at `:124`, returned object at `:138`)
- Change: add `announceExternalWrite: () => void` to the `TransactionStore` type and implement it in the returned object as a single call to `bumpMutationVersion()`. It bumps and does nothing else: no `refreshAfterMutation`, unlike `addTransaction`/`updateTransaction`, because the list snapshot is refreshed by the transactions screen's own focus effect and neither caller writes while that screen is focused. One call is one bump regardless of how many rows the caller changed.
- Test: `__tests__/transaction.store.test.ts` — `announceExternalWrite` raises `mutationVersion` by exactly one and leaves `repo.getAll` uncalled after the initial `setQuery`. The second half is the guard on "bump, not refresh"; without it the step's one real decision is unasserted.

### 2. The category reassign announces
- File: `src/modules/categories/store/category.store.ts` (`createCategoryStore` at `:26`, `reassignAndDelete` at `:84`)
- Change: give `createCategoryStore` a second parameter, `announceTransactionWrite: () => void`, defaulting to `() => useTransactionStore.getState().announceExternalWrite()` — an arrow, so the lookup happens at reassign time and the new `categories → transactions` module edge cannot bite at load. Import the store by its path (`@/modules/transactions/store/transaction.store`), never the `@/modules/transactions` barrel. Wrap the existing operation: `mutateAndReload(async () => { await repo.reassignAndDelete(fromId, toId); announceTransactionWrite(); }, 'reassignAndDelete')`. Inside the closure, not after `mutateAndReload`: the row write has committed by then, so a `reset()` racing it must not swallow the announcement, and a rejecting `repo.reassignAndDelete` never reaches the call. `deleteCategory`, `addCategory` and `updateCategory` are untouched — the no-linked-transactions delete stays silent.
- Test: `__tests__/category.store.test.ts` — pass a `jest.fn()` announcer into `createCategoryStore` in three new cases: `reassignAndDelete` announces exactly once; a rejecting `repo.reassignAndDelete` announces not at all; `deleteCategory` announces not at all. A fourth case covers the default, which is the only announcer production runs and which an injected spy asserts nothing about: build with `createCategoryStore(repo)` and no second argument, import `useTransactionStore` from `@/modules/transactions/store/transaction.store`, read `getState().mutationVersion` before and after `reassignAndDelete`, assert it moved by exactly one. Read the before value rather than expecting `0 → 1` — `useTransactionStore` is a module singleton shared across the file. The suite mocks nothing today and needs no new mock: `TransactionRepository` only reaches `getDb` per call, and `jest.setup.js` already fakes `expo-sqlite`.

### 3. The commitment payment announces
- File: `src/modules/commitments/store/commitment.store.ts` (`createCommitmentStore` at `:77`, `markAsPaid` at `:243`)
- Change: same second parameter and same default arrow as step 2. Call `announceTransactionWrite()` immediately after `const amounts = await repo.markAsPaid(...)` resolves at `:251`, before the optimistic `set` that publishes the paid payment — the transaction row and the account delta are already committed inside `markCommitmentAsPaid`'s `withTransactionAsync`, and a throw from the repository skips the call. `skipPayment` writes no transaction row and stays silent.
- Test: `__tests__/commitment.store.test.ts` — three new cases with a `jest.fn()` announcer: `markAsPaid` announces exactly once; a rejecting `repo.markAsPaid` announces not at all; `skipPayment` announces not at all. Plus the same fourth case as step 2 for the default: `createCommitmentStore(repository)` with no second argument, `useTransactionStore.getState().mutationVersion` read before and after `markAsPaid`, asserted to have moved by exactly one.

## Screens
Two walks, each forced. No navigation reaches either write with a consumer still holding a snapshot — every real path first pops or unmounts the screen that would show the staleness — so each walk disables the single line that does that, and nothing else. **Both forces are reverted before the implementer commits.** The check before the PR opens: `git diff --stat 1a612bf6..HEAD` names only `transaction.store.ts`, `category.store.ts`, `commitment.store.ts` and their three test files.

Both walks: do every transaction write during setup, before the first shot. `addTransaction`, `deleteTransaction` and `updateTransaction` are the only other callers of `bumpMutationVersion` (`src/modules/transactions/store/transaction.store.ts:192`, `:199`, `:207`); one of them mid-walk moves the version at base too and the walk goes green for the wrong reason.

### Walk A — the transaction detail, Acceptance 3
Force: comment out `popToTopOnBlur: true,` at `src/modules/navigation/screens/tabs/index.tsx:60`, the transactions tab's option. The tab's stack then survives the blur — `freezeOnBlur` on both Stacks freezes, it does not unmount (`src/app/(app)/_layout.tsx:26`, `src/app/(app)/(tabs)/transactions/_layout.tsx`) — so the detail stays mounted and the unmount release at `src/modules/transactions/screens/transactions/detail/detail.hook.ts:144-149` never fires. What is left to decide the screen is the MA-041 focus gate at `:130-142`, which reloads only when `entry.loadedAtVersion !== useTransactionStore.getState().mutationVersion`. That comparison is the thing under test and the force does not touch it.

Setup: Settings → Categories → add a custom expense category `X` (only `is_default === 0` renders a delete affordance, `components/category_row.tsx:28,46`), then add an expense on `X` **with a note** — the note fixes the title (`src/utils/format_transaction_title.ts:35`), so the category row is the only text that can move.

Walk: Transactions tab → open that transaction, `/transactions/detail/<id>` (`transactions.hook.ts:400`) → **shoot** → Dashboard tab → cog (`dashboard.hook.ts:180`) → Categories (`settings.hook.ts:7`) → delete `X`, which opens the reassign sheet because it has a linked row (`categories.hook.ts:130-152`), pick `Y`, confirm → back, back → Transactions tab → **shoot**.

- Base: the Category row reads `Uncategorized` and the hero carries no category chip. The version did not move, the focus gate skips the reload, the snapshot still holds `category_id = X`, and `categoriesById.get(X)` is now `undefined` — `detail.helpers.ts:153` falls through to `Strings.uncategorized` and `components/detail_hero.tsx:75` renders nothing.
- Head: the row reads `Y` and the hero shows `Y`'s chip and colour. The bump makes `loadedAtVersion` stale, `bumpReload` re-runs the load at `detail.hook.ts:58`, and `getById` returns the rewritten row.

Shoot the detail before the trip and after it, and let the second settle: at head the header shows `refreshing` for a beat first, over the old body (`detail.hook.ts:61-63`).

### Walk B — the account activity card, Acceptance 4
Force: comment out `useAccountActivityStore.getState().reset();` at `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:75`. It is the store's only `reset` caller in `src/`, and it clears both the snapshot and the closure `freshKey` (`account_activity.store.ts:110-115`); without it the cached snapshot outlives the screen, which is the state a consumer left open would be in. The keying under test — `${accountId}:${mutationVersion}` at `account_activity.store.ts:42-44`, and `ensure`'s short-circuit at `:57-59` — is untouched.

Setup: an account `A` carrying a few transactions, and an active commitment whose current-cycle payment is neither `Paid` nor `Skipped` — the Mark as paid CTA renders on nothing else (`detail/components/current_cycle_card.tsx:36-38,78`).

Walk: Dashboard → account card → `/accounts/<A>` (`dashboard.hook.ts:177`) → **shoot** the Recent activity card → back → Commitments tab → the due payment row, `/commitments/<paymentId>` (`commitments.hook.ts:257-259`) → Mark as paid → in the pay sheet's account picker choose `A` (`pay_sheet.hook.ts:348-361`) → save → Dashboard tab → account card → **shoot**.

- Base: the card paints the cached rows on the first frame, `ensure` finds `freshKey === ${A}:${v}` and returns without a request, and the commitment's transaction is absent. The month facts below read from the same stale `snapshot.stats` (`account_detail.hook.ts:141-150`) and are unchanged too.
- Head: the key moved, `ensure` clears to `initialLoading` and reloads, the payment is the newest row on the card, and the month facts move with it.

The trap: the **balance hero moves at base as well**, because the pay sheet reloads accounts on success (`pay_sheet.hook.ts:332`). Frame both shots to include the hero and assert on the card's rows and month facts — the base shot showing a moved balance above unmoved rows is what makes it evidence rather than a screenshot.

## Non-goals
- Refreshing the transaction list snapshot from the announcement.
- Any signal for the commitment rows and spending-plan rows `reassignAndDelete` also rewrites.
- `reassignCategory` at `src/modules/categories/database/categories.ts:80` — dead in production, one compat re-export and one test; leave it.
- The transaction detail's ownership keying (#438), the account store's account-lookup slot (#441), the commitment detail's screen-data slot (#442).
- Announcing from `categories.hook.ts` or `pay_sheet.hook.ts`; no screen, layout or copy changes anywhere.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Bump-only is a judgement call. If a review reads "the same write signal every other transaction write raises" as including `refreshAfterMutation`, step 1 grows by one line and the transactions list reloads on every reassign and payment, including when that screen has never mounted.
- `category.store.ts` and `commitment.store.ts` now pull `transaction.store.ts` into their module graph at import. The arrow default keeps the *call* late-bound, but a future import from `transactions/store/` back into either store module would make a real cycle.
- The announcement lives in the store actions. A future caller reaching `CategoryRepository.reassignAndDelete` or `CommitmentRepository.markAsPaid` directly bypasses it.
- Revised after review: steps 2 and 3 proved the announcement only through an injected `jest.fn()`, so the default arrow — the one thing production runs — was asserted nowhere and all six cases would pass with it left `() => {}`; each store test now also builds with the default and asserts `useTransactionStore.getState().mutationVersion` moves by one.
- Revised after round two: Screens named `/transactions/[id]`, which is not a route, and a walk that tabbed out of the account detail to pay, which unmounts it — so that shot would have matched at base; sweeping the rest of the navigation for a walk that does fail at base found none.
- Revised after round three: `Verify emulator` stays, and the user ruled that Screens force the states navigation will not produce. Both walks now disable one unmount — a tab option and a store reset — that no real path avoids; the forces sit outside Steps 1-3, are reverted before the commit, and are not part of the ~16-line diff. A run that reverts late, or writes a transaction mid-walk, passes at base.

## Self-assessment
Step 3's placement is the one I am least sure about. `markAsPaid` does four things after the repository resolves — announce, publish the optimistic paid payment, `invalidateData()`, `revalidateAfterMutation()` — and I put the announcement first on the reasoning that the database is already committed and every later line is local bookkeeping that cannot fail. If the implementer finds that ordering matters (a consumer waking on the bump and reading the commitment store's payments before the optimistic `set` lands), moving the call to just after the `set` is equally correct against every acceptance line and should be taken without re-planning. The rest of the plan is three small additions with an obvious shape; the risk is concentrated here.
