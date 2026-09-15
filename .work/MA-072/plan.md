# MA-072 — View commitment from the Transactions tab opens the payment's detail above the tabs
base: a9f2fb4f8b427420852f996a6da25db3251dccfd · verify: emulator · flags: none · expected diff: ~30 lines

## Steps
### 1. The edit href carries the origin's copy from the commitment detail
- File: `src/modules/navigation/domain/stacked_route.ts` (`commitmentEditRoute`, `:17-28`); `src/modules/commitments/screens/commitments/detail/detail.hook.ts` (`useLocalSearchParams` `:64-67`, `goToEdit` `:201-204`)
- Change: add `export const TABBED_ORIGIN = 'tabbed' as const`. `commitmentEditRoute` takes a fourth required parameter `originTxCopy: string | undefined` (the raw search-param value, never optional, on the same grounds as the `originTransactionId` comment at `:20`); with the stacked prefix, an origin id and `originTxCopy === TABBED_ORIGIN` it returns `` `${P}/commitments/${string}/edit?originTxId=${string}&originTxCopy=${typeof TABBED_ORIGIN}` ``, the value interpolated from `TABBED_ORIGIN`, never the literal; every other input returns what it returns today, byte for byte. The detail hook reads `originTxCopy?: string` from the params and passes it as the fourth argument; `goToEdit` adds it to its deps.
- Test: `__tests__/navigation/stacked_route.test.ts` `commitmentEditRoute`: the four existing cases gain `undefined` as the fourth argument and keep their expectations; new case `('com-1', STACKED_PREFIX, 'tx-1', 'tabbed')` is `/stacked/commitments/com-1/edit?originTxId=tx-1&originTxCopy=tabbed`; new case `('com-1', '', 'tx-1', 'tabbed')` stays `/commitments/com-1/edit`. `__tests__/screens/commitments_detail.hook.test.ts`: `DetailParams` gains `originTxCopy?: string`; new case next to `:207-221`, pathname `/stacked/commitments/pay-1`, params `{ id: 'pay-1', originTxId: 'tx-1', originTxCopy: 'tabbed' }`, `goToEdit` pushes `/stacked/commitments/commitment-1/edit?originTxId=tx-1&originTxCopy=tabbed`.

### 2. Save and Deactivate from the mirror return to the origin's copy
- File: `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts` (`useLocalSearchParams` `:29`, `leaveStackedSubtree` `:68-72`)
- Change: read `originTxCopy?: string` from the params; `leaveStackedSubtree` becomes `if (originTxCopy === TABBED_ORIGIN) router.dismissAll(); else if (originTxId) router.dismissTo(stackedTransactionDetailRoute(originTxId)); else router.back();`. `dismissAll` is `POP_TO_TOP` on the focused navigator, the `(app)` Stack (`node_modules/expo-router/build/global-state/router.js:83-88`, `.../react-navigation/routers/StackRouter.js:331-335`): every screen above `(tabs)` goes, duplicates included, and the tab navigator's params are never touched. The stacked-origin branch is byte-identical to today. Both `onValid` (`:96`) and `confirmDeactivate` (`:115`) already route through this function; they do not change.
- Test: `__tests__/screens/commitments_edit.hook.test.ts`: the `useRouter` mock at `:22-26` gains `dismissAll: mockRouterDismissAll`; `mockParams` type gains `originTxCopy?: string`; two new cases with pathname `/stacked/commitments/com-1/edit` and params `{ id: 'com-1', originTxId: 'tx-1', originTxCopy: TABBED_ORIGIN }`: `onSubmit` calls `dismissAll` and never `dismissTo`; `confirmDeactivate` calls `dismissAll` and never `replace`. The existing stacked-origin cases at `:129` and `:167` stay as they are.

### 3. View commitment lands above the tabs from both copies
- File: `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` (`getCommitmentPaymentRoute`, `:192-203`)
- Change: the builder always returns a stacked href. Signature `getCommitmentPaymentRoute(paymentId: string, originPrefix: StackedPrefix, originTransactionId: string)`, return type `` `/stacked/commitments/${string}?originTxId=${string}` | `/stacked/commitments/${string}?originTxId=${string}&originTxCopy=${typeof TABBED_ORIGIN}` ``; the second form when `originPrefix === ''`, its value interpolated from `TABBED_ORIGIN` (imported from `stacked_route.ts`), never the literal. The caller at `detail.hook.ts:238` passes the same three arguments and does not change; `id` there is already a `string`, so the origin parameter drops `undefined`. The `setSelectedMonth` write at `:236` stays before the push. Replace the two comments at `:195` and `:198` with one line saying the href is always the stacked twin and the copy rides on `originTxCopy`.
- Test: `__tests__/screens/transactions/detail/detail_helpers.test.ts` `getCommitmentPaymentRoute` (`:97-117`): replace the four cases with two: `('payment-1', '', 'tx-1')` is `/stacked/commitments/payment-1?originTxId=tx-1&originTxCopy=tabbed`; `('payment-1', STACKED_PREFIX, 'tx-1')` is `/stacked/commitments/payment-1?originTxId=tx-1`. `__tests__/screens/transactions/detail/detail_hook.test.ts` `:355-368`: the tabbed case expects `router.push` with `/stacked/commitments/payment-1?originTxId=transaction-1&originTxCopy=tabbed` and keeps the `setSelectedMonth('2026-04')` assertion; the stacked case at `:370-380` and the missing-payment case at `:382-392` stay as they are.

### 4. The app/ rule names the exception
- File: `CLAUDE.md` (`:156`, the bare `(tabs)` href line)
- Change: append one sentence: "The one exception is View commitment on the transaction detail: both copies push the stacked twin with `originTxId` and, from the tabbed copy, `originTxCopy=tabbed`, so the commitment detail always sits above the tabs and Save or Deactivate return to the origin's own copy (MA-072)."
- Test: none, prose.

## Screens
Seed: a commitment with a paid payment whose transaction is visible on the Transactions tab. Pixel_2_API_34 (`mqa claim` first).
- Reproduction: Commitments tab, open a commitment detail, switch to Transactions, open the commitment-owned transaction, tap View commitment. Shoot the commitment detail: the payment's commitment, no tab bar, the month the payment belongs to.
- Back from it: the transaction detail as it was before the tap, tab bar on Transactions.
- From the commitment detail, Edit, Save: the transaction detail again. Deactivate shares `leaveStackedSubtree` and is not walked.
- From the commitment detail, Edit, Cancel: the commitment detail.
- Control: Accounts, an account, a commitment-owned transaction row, View commitment: the commitment detail as today; Back: the stacked transaction detail.

## Non-goals
- Back from a tab root going to the previous tab; `popToTopOnBlur` on the transactions and commitments tabs stays.
- The commitment detail loading its payment on its own; it keeps reading the month snapshot, so the month write before the push stays.
- The FAB's Add commitment and the dashboard shortcuts, which still push tab hrefs.
- The stacked href from an account's transaction: byte-identical, no `originTxCopy` on it.
- Deriving the origin copy from navigation state (`useNavigation`, `getState`); the copy rides on the href.
- `dismiss(n)` on either branch; the stacked return stays a `dismissTo` by route name so a double-tapped duplicate is stepped over, and `dismissAll` takes every duplicate with it.
- The not-found alert and the `catch` in `openCommitment`: unchanged.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check for step 3: `npx jest __tests__/screens/transactions/detail/detail_helpers.test.ts` fails at base on the tabbed-origin case and passes at head.

## Risks
- Typed routes (`app.json` `typedRoutes: true`): the two-parameter query template must type as an `Href`; today's `?originTxId=${string}` shape does, and the new shape is the same pattern.
- `useLocalSearchParams` can hand back `string[]` for a repeated key; the helpers compare with `=== TABBED_ORIGIN`, so anything else reads as the stacked origin.
- The tabbed detail hook computes `stackedPrefix` only for this builder; with step 3 it is the origin marker, not a prefix. Do not remove it.
- `dismissAll` lands on index 0 of the `(app)` Stack. `(tabs)` is there because the root redirect seeds it and nothing in `src/` replaces it at the `(app)` level; a future `router.replace` to `/accounts/*` or `/settings/*` from a tab would put something under `(tabs)` and overshoot.
- Amended 2026-09-15 on review: the tabbed return was `dismissTo('/transactions/detail/<id>')`, a POP_TO through the tab navigator's nested-params consumption the ticket marks unconfirmed; it is now `dismissAll`, which never touches the tab navigator, and the `originTransactionDetailRoute` helper step went with it. A Cancel line was added to Screens.

## Self-assessment
Step 2 is the one I am least sure of, on one point only: `dismissAll` assumes `(tabs)` is the first route of the `(app)` Stack. Every path I read seeds it that way, the root redirect lands on `/dashboard` and the account and settings screens push above it, and the `dismissTo(TRANSACTIONS_TAB)` at `account_detail.hook.ts:343-346` already relies on `(tabs)` sitting below the `(app)` screens. Nothing enforces it, so the assumption is written into Risks rather than into a test. The Save shot on the walk is the check; if it ever lands on something other than the transaction, the index-0 assumption is the first thing to look at.
