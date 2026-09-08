# MA-040 — Stacked subtree: every outbound action stays inside the mirror

base: 56e1f5ca6d88c897926f2e35ba47633953e44372 · verify: emulator · flags: none · expected diff: ~30 lines

The sweep, confirmed by grep over the three screens and their `components/` folders at this checkout. Only the last three rows change; the rest are already correct and are named so the implementer does not touch them.

| Call site | Target | Verdict |
|---|---|---|
| `transactions/detail/detail.hook.ts:194`, `:222` | `router.back()` | prefix-agnostic, correct |
| `transactions/detail/detail.hook.ts:214` | `getCommitmentPaymentRoute(id, stackedPrefix)` | prefixed by MA-037 |
| `transactions/detail/detail.hook.ts:224` | `/accounts/<id>` | `(app)` Stack route, correct bare |
| `transactions/detail/detail.hook.ts:228` | `openEdit` → `TransactionFormHost` sheet | not a navigation; host moved to `(app)` by MA-037 |
| `commitments/detail/detail.hook.ts:186` | `router.back()` | correct |
| `commitments/components/commitment_form_body.tsx:189` | `router.back()` | correct |
| `commitments/edit_commitment/edit_commitment.hook.ts:45` | `router.back()` | correct |
| `commitments/detail/detail.hook.ts:182` | `/commitments/<id>/edit` | **bare — step 3** |
| `edit_commitment.hook.ts:87` (save) | `dismissTo('/commitments')` | **unbranched — step 4** |
| `edit_commitment.hook.ts:106` (deactivate) | `replace('/commitments')` | **unbranched — step 4** |

## Steps

### 1. The stacked edit route exists, so `/stacked/commitments/<id>/edit` is a real screen on the `(app)` Stack

- File: `src/app/(app)/stacked/commitments/[id]/edit/index.tsx` (new)
- Change: one line, `export { default } from '@/modules/commitments/screens/commitments/edit_commitment';`. No `_layout.tsx` under `stacked/`, so the route joins the `(app)` Stack as a sibling of `(tabs)` and of the two twins MA-037 added — that is what gives it no tab bar and makes `router.back()` land on the stacked payment with no code change. Must land before step 3: `npm run typecheck` runs `scripts/generate-typed-routes.js`, and `` `/stacked/commitments/${string}/edit` `` is not an assignable `Href` until this file is on disk. Step 2 is not the dependency. `stacked_route.ts` typechecks either way, because nothing in it assigns a builder's return to `Href`; step 3's `router.push` is the first assignment.
- Test: none. A one-line re-export has no logic layer to assert and the repo has no route-tree suite (`__tests__/app_layout_imports.test.ts` covers only the root layout's CSS and safe-area imports). Its guard is the emulator pass.

### 2. `commitmentEditRoute` builds the edit href on either side of the mirror

- File: `src/modules/navigation/domain/stacked_route.ts`
- Change: add, alongside `stackedTransactionDetailRoute`, a generic-prefix builder shaped exactly like MA-037's `getCommitmentPaymentRoute`:
  `export function commitmentEditRoute<P extends StackedPrefix>(commitmentId: string, prefix: P): ` `` `${P}/commitments/${string}/edit` ``.
  The generic parameter is load-bearing: at a call site holding `StackedPrefix` it returns the union of both literals, and each half matches one member of the generated `Href` union. Also add the constant step 4 needs, next to the twin helpers so the subtree's shape lives in one file:
  `export const STACKED_EDIT_POP_COUNT = 2;` with a one-line comment naming the invariant — the mirror is transaction detail → commitment payment → commitment edit, so a leave from the edit pops both to reach the entry.
- Test: `__tests__/navigation/stacked_route.test.ts`, a `commitmentEditRoute` describe: `('com-1', '')` → `/commitments/com-1/edit`; `('com-1', STACKED_PREFIX)` → `/stacked/commitments/com-1/edit`. Fails at base — the symbol does not exist.

### 3. Edit from the stacked commitment payment stays in the mirror

- File: `src/modules/commitments/screens/commitments/detail/detail.hook.ts` (`useCommitmentDetail`, `goToEdit` at `:179-183`)
- Change: import `usePathname` from `expo-router`, take `const stackedPrefix = stackedPrefixOf(usePathname())` at the top of the hook as `useTransactionDetail` does (`detail.hook.ts:25`), push `commitmentEditRoute(commitment.id, stackedPrefix)`, add `stackedPrefix` to the `useCallback` deps. Delete the MA-040 trap comment at `:181` — this step is what it pointed at.
- Test: `__tests__/screens/commitments_detail.hook.test.ts`. The `expo-router` mock has no `usePathname` today and the hook will crash without it: add a mutable `const mockPathname = { current: '/commitments/pay-1' }` reset in `beforeEach`, exposed as `usePathname: () => mockPathname.current`, the shape MA-037 used in `detail_hook.test.ts`. Two cases, both arranged with `commitmentsState = [commitment]; paymentsState = [payment];` and awaited to `ready`: from `/commitments/pay-1`, `goToEdit()` pushes `/commitments/commitment-1/edit`; from `/stacked/commitments/pay-1` it pushes `/stacked/commitments/commitment-1/edit`. The second fails at base.

### 4. Save and deactivate from the stacked edit return to the stacked transaction, leaving nothing behind

- File: `src/modules/commitments/screens/commitments/edit_commitment/edit_commitment.hook.ts` (`onValid` at `:87`, `confirmDeactivate` at `:106`)
- Change: take `const stackedPrefix = stackedPrefixOf(usePathname())` in the hook. Both leave paths branch on it and nothing else changes: with no prefix, `onValid` keeps `router.dismissTo('/commitments')` and `confirmDeactivate` keeps `router.replace('/commitments')`, byte-for-byte today's behaviour; with the prefix, both call `router.dismiss(STACKED_EDIT_POP_COUNT)`. `dismiss`, not `replace` or a fresh push: the acceptance forbids a stale copy behind the transaction, and only a pop removes the payment screen underneath as well. `useRouter()` returns `ImperativeRouter`, which carries `dismiss(count?: number)`. Delete the comment at `:86` in the same edit: it names `regeneratePayments`, a function that exists nowhere under `src/` (`grep -rn regeneratePayments src/` returns that line and nothing else). Leave the `if (!commitment) router.back()` effect at `:44-46` alone — it is prefix-agnostic and correct on both sides.
- Test: `__tests__/screens/commitments_edit.hook.test.ts`. Extend the `expo-router` mock with `usePathname` (same mutable-ref shape as step 3, reset in `beforeEach`) and `dismiss: mockRouterDismiss` on the `useRouter` object; lift `deactivateCommitment` out of `setup()` into a module-level `jest.fn()` so the deactivate cases can await it. Four cases: tabbed save → `dismissTo('/commitments')` and `dismiss` not called; stacked save → `dismiss(2)` and `dismissTo` not called; tabbed deactivate → `replace('/commitments')`; stacked deactivate → `dismiss(2)` and `replace` not called. The two stacked cases fail at base — `dismiss` is never called there.

## Screens

Emulator walk, in this order; scenario 5 destroys the commitment, so it runs last. Entry to the mirror is the only one there is: Dashboard → account detail → an activity row whose transaction is commitment-owned → View commitment. Reach the stacked edit by that walk, never by a deep link to `/stacked/commitments/<id>/edit`: `dismiss` is a bare `POP` (`expo-router/build/global-state/router.js:71-76`) and `StackRouter.js:318,329` returns `null` at `currentIndex` 0, so a deep-linked edit has no stack under it and Save does nothing visible. The pop count needs the real stack beneath it.

- Stacked commitment edit (`/stacked/commitments/<id>/edit`): the screen with no tab bar, shot next to the stacked payment it was opened from for the comparison.
- Stacked commitment payment: after Back from that edit — the payment, not the Dashboard.
- Stacked transaction detail: after Save from the stacked edit.
- Account detail: one Back from that transaction detail — proves neither the payment nor the edit is still on the stack.
- Tabbed commitment edit (`/commitments/<id>/edit`), reached from the Commitments tab: tab bar present as today, and Save lands on the commitments list. The unchanged half of the branch.
- Stacked commitment edit, Deactivate: lands on the stacked transaction detail.

## Non-goals

- Moving `getCommitmentPaymentRoute` out of `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` into `stacked_route.ts`. MA-037 put it there; churning it widens the diff and the render surface for nothing.
- Keying the transaction detail store slot by owner — MA-041 (#438).
- Twins for any other tabbed route. Only `/commitments/[id]/edit` is reachable from inside the subtree today; a twin nothing pushes is dead routing.
- Refreshing the stacked transaction detail on the way back. Its focus effect (`detail.hook.ts:136-140`) reloads only when another copy took the store slot, and a commitment edit does not rewrite an already-paid transaction.
- Redesigning any screen, or adding a sixth tab.

## Verification

- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `mqa claim` first, before any emulator call; `mqa needs-build` decides whether an APK is needed — this diff is JS-only, so it should not.

## Risks

- The `Href` union is generated from the route tree, so step 3 fails typecheck if step 1 has not landed. Same trap in reverse if a rebase drops the route file.
- `STACKED_EDIT_POP_COUNT` encodes the mirror's depth. Insert a screen between the stacked transaction detail and the edit and the user lands one screen short, silently. The constant and its comment are where a later ticket has to look; the emulator walk is what catches it.
- The ticket's stated reason for not returning to the stacked payment, "`regeneratePayments` invalidates the paymentId", is false on both leave paths. On save, `commitment.store.ts:223` calls `repo.deleteUnpaidPayments(id)`, and a payment reached through a transaction is paid. On deactivate, `deactivateCommitment` only sets `is_active = 0` (`commitments.ts:123-128`), while `getCommitmentsForMonthSnapshot` selects `WHERE is_active = 1 OR EXISTS (a payment in the loaded month)` (`commitments.ts:23-36`) and the month's payments are not filtered by it at all (`commitment.repository.ts:145-146`). `openCommitment` set `selectedMonth` to that payment's own month before pushing (`transactions/detail/detail.hook.ts:213`), so both rows survive the reload and the stacked payment renders `ready`, not `notFound`. Both targets are valid; the single target is a product choice, not a constraint. The ticket's Context line, `Decided 2026-09-09`, still carries the false rationale and needs the same correction. Nothing in the plan depends on it: Acceptance names the target and step 4 implements it.
- `confirmDeactivate` awaits a store call that ends in an async month-snapshot reload, so `commitment` is still defined when `router.dismiss` runs and the `!commitment → router.back()` effect does not fire. If that reload ever becomes synchronous, the stacked path over-pops to the account detail. The Deactivate emulator shot is the check.
- Two of the four suites this touches mock `expo-router` without `usePathname`. Adding the hook to a screen crashes them before any assertion runs; both mocks are updated in the same step as the hook change.

## Self-assessment

Step 4's pop count is the part I am least sure of, and it beat a real alternative rather than a missing one. `dismiss` satisfies both halves of the third acceptance bullet, land on the stacked transaction and leave no stale copy behind it, but it says "two screens back", not "back to the subtree's root". The alternative is a query param: the generated `Href` union admits one (every route in `.expo/types/router.d.ts` carries the `` `${`?${string}` | `#${string}` | ''}` `` suffix), so threading the origin transaction id through `getCommitmentPaymentRoute` and `commitmentEditRoute` would let step 4 call `router.dismissTo(stackedTransactionDetailRoute(txId))`, which replaces the current screen when the href is not on the stack (`expo-router/build/global-state/router.d.ts:66`). That failure is visible; the count's is not. I chose the count on price. The param rides both hrefs, widens MA-037's helper in `detail.helpers.ts`, and has to be read and re-emitted in the commitment detail hook and read again in the edit hook, four hops that can drop it. `useLocalSearchParams` types it `string | undefined` regardless, so the stacked branch still needs an answer when it is missing, and the acceptance rules out `router.back()` there, which makes that fallback a pop count. The param buys the better failure mode and keeps the count anyway. The count's own bound is narrow: `POP` is relative, `Math.max(currentIndex - count + 1, 1)` (`StackRouter.js:319`), returning `null` at index 0 (`:329`), so entry depth cannot break it and an over-count cannot crash or empty the stack. It lands wrong only if a screen is inserted between the stacked transaction detail and the edit. `STACKED_EDIT_POP_COUNT` and its invariant comment are where that ticket has to look, and the Save and Deactivate shots in the walk are the check.
