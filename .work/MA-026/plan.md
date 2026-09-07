# MA-026 — List: error state with Try again
base: 9b6912f4e3b024d6eb295c60745989a2f308c476 · verify: emulator · flags: none · expected diff: ~95 lines

## Steps
### 1. `loadError` means "the last settled read failed", so a reload in flight keeps it up
- File: `src/modules/accounts/store/account.store.ts` (`loadAccounts`, `account.store.ts:49`)
- Change: delete the up-front `set({ loadError: false })`; the flag flips only inside the request-id guard, false on success (`:54`, already there), true on failure (`:57`). No new action, no loading flag; the signature stays `() => Promise<void>` and it still rethrows. `grep -rn "loadError" src/modules/accounts` has no reader outside this file today, so nothing observes the removed intermediate state.
- Test: `__tests__/account.store.test.ts`, in `describe('accountStore.loadAccounts')`: (a) "keeps loadError up while the reload after a failure is in flight": reject once, then `deferred` the second `getAll`; before resolving, `loadError` is `true`; after, `false` with the rows. (b) "a failed reload keeps the rows already loaded": resolve `[mockAccount]`, then reject; `accounts` still `[mockAccount]`, `hasLoaded` `true`, `loadError` `true`, and only `getAll` on the repo was called. Only (a) discriminates base from head, it reads `false` before the resolve; (b) passes at base (`account.store.ts:56-57` never touches `accounts` on failure) and stays as the A5 regression guard.

### 2. `ErrorState` can sit under a header and render the flat button
- File: `src/components/ui/error_state.tsx` (`ErrorStateProps`, `:18-28`; `Screen`, `:43`; `Button`, `:55-61`)
- Change: add `edges?: ScreenProps['edges']` (type from `@/components/ui/screen`, exported at `screen.tsx:13`) forwarded to `<Screen edges={edges}>`, and `flat?: boolean` forwarded to `<Button flat={flat}>`. Both optional, both absent by default, so `startup_error.tsx:15` and `route_error_fallback.tsx:9` render byte-identically. The `resolveStateScreenLayout('error')` import and call stay, no `ms(` anywhere: `node scripts/validate-state-screen-geometry.js` runs inside `npm run lint`.
- Test: none. Render suites are closed to additions (`.claude/rules/tests.md`); the props are pass-throughs that `tsc` checks at the two callers and step 6.

### 3. The three F1 strings
- File: `src/constants/strings.ts` (`// Accounts list (B1)` group, `:301-303`)
- Change: add `accountsLoadErrorTitle: "Couldn't load your accounts"`, `accountsLoadErrorDescription: 'Something went wrong reading your data. Your accounts are still there.'`, `accountsLoadErrorRetry: 'Try again'`. No reuse of `renderErrorRetry` (`:16`): every domain names its own retry key (`load_error_alert.tsx:12`). Not `accountsLoadRetry`: `__tests__/screens/load_error_copy.test.ts:28-32` derives the `LoadErrorAlert` family by the `${stem}LoadRetry` sibling of every `*LoadErrorTitle` key, and that sibling would pull `accountsLoadErrorTitle` into its 13-title and 7-label counts (`:46`, `:77`). `accountsLoadErrorRetry` matches no suffix in `TITLE_SUFFIXES` (`:6-13`), so neither key joins the derivation.
- Test: `__tests__/screens/accounts/accounts_list.strings.test.ts`, new: the three keys byte-exact to the Acceptance copy, `accountsLoadErrorDescription` matches neither `/sorry/i` nor `/apolog/i` (Rules: never apologises), and `Strings` has no `accountsLoadRetry` key, so `load_error_copy.test.ts` keeps its 13 and 7.

### 4. Which body the list shows is one pure function
- File: `src/modules/accounts/screens/accounts/list/accounts_list.helpers.ts`, new
- Change: `export function resolveAccountsListContent({ loadError, accountCount }: { loadError: boolean; accountCount: number }): 'error' | 'empty' | 'rows'`; `'error'` whenever `loadError`, else `'empty'` at count 0, else `'rows'`. Same shape as `categories.helpers.ts:9`. MA-025 extends the `'empty'` arm; this file gives it the seam.
- Test: `__tests__/screens/accounts/accounts_list.helpers.test.ts`, new, `it.each` over `(loadError, accountCount)`: `(true, 0)` and `(true, 3)` are `'error'`, `(false, 0)` is `'empty'`, `(false, 1)` is `'rows'`.

### 5. The retry's in-flight flag is UI state
- File: `src/modules/accounts/screens/accounts/list/accounts_list.state.ts`, new
- Change: `createAccountsListState()` and `useAccountsListState`, the `account_detail.state.ts` shape: `{ isRetrying: boolean; setRetrying(v: boolean); reset() }`, `INITIAL_STATE = { isRetrying: false }`, wrapped in `createMoneyAppSelectors`.
- Test: `__tests__/screens/accounts/accounts_list.state.test.ts`, new: starts `false`; `setRetrying(true)` then `false` round-trips; `reset()` after `setRetrying(true)` reads `false`.

### 6. The hook exposes `loadError`, `isRetrying`, and one `retry`
- File: `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts` (`useAccountsList`, `:7-21`)
- Change: read `{ accounts, loadError }` through `useShallow` (precedent `account_detail.hook.ts:33`); read `isRetrying` from `useAccountsListState`; bind `loadAccounts` via `useAccountStore.getState().loadAccounts` outside render. `retry` is `useCallback`: return if `useAccountsListState.getState().isRetrying`; `setRetrying(true)`; `await loadAccounts()` in `try`, catch swallowed with the one-line note that the store owns `loadError` (`categories.hook.ts:181-187`), `finally setRetrying(false)`. Return `state: { accounts, loadError, isRetrying, content: resolveAccountsListContent({ loadError, accountCount: accounts.length }) }` plus `retry` next to the three existing actions. Update the file's doc line: no focus loader, and the retry is the only reload the screen starts.
- Test: `__tests__/screens/accounts/accounts_list.hook.test.ts` (existing). Extend the mock store to `{ accounts, loadError, loadAccounts: mockLoadAccounts }` and call `useAccountsListState.getState().reset()` in `beforeEach`. Add: (a) `retry` calls `loadAccounts` once, `isRetrying` is `true` while its `deferred` is pending and `false` after it resolves; (b) a rejected `loadAccounts` settles `isRetrying` to `false` and `retry` does not throw; (c) a second `retry` while the first is pending calls `loadAccounts` once in total; (d) `state.content` is `'error'` when the mock store has `loadError: true` and two rows. The four existing cases stay.

### 7. The screen paints F1 in place of the rows
- File: `src/modules/accounts/screens/accounts/list/index.tsx` (`AccountsListScreen`, `:44-63`)
- Change: switch on `state.content`: `'error'` renders `<ErrorState edges={[]} flat iconName="alert-circle-outline" title={Strings.accountsLoadErrorTitle} description={Strings.accountsLoadErrorDescription} actionLabel={Strings.accountsLoadErrorRetry} actionAccessibilityLabel={Strings.accountsLoadErrorRetry} onAction={() => void retry()} isActionLoading={isRetrying} isActionDisabled={isRetrying} testID="accounts-load-error" />`; `'empty'` keeps the `EmptyState` branch and its MA-025 note; `'rows'` keeps the `ScreenScroll` branch unchanged. `StackHeader` and its `+` stay above the switch. `edges={[]}` because the outer `Screen` (`:26`) already pads top and bottom.
- Test: none, render suites are closed; steps 4 and 6 cover the branch choice, the emulator pass covers the pixels.

## Screens
- Forcing the failure: a temporary, uncommitted throw in `AccountRepository.getAll` (`src/modules/accounts/repositories/account.repository.ts:40`) keyed on a module-level call counter. Call 1 is startup and must succeed or `use_layout_init.hook.ts:52` goes fatal; the reload that fails is the one a mutation starts (`addAccount`, `account.store.ts:85`). Revert before the commit; restart Metro with `--clear` after the revert.
- Accounts list, error, rows present: from the dashboard add an account while call 2 throws, then See all. Shoot: header with back square and `+`, alert glyph, the two F1 lines, flat "Try again" at `Radius.cta`, no rows.
- Accounts list, retrying: tap Try again while call 3 also throws. Shoot: the button in its loading state, disabled; after it settles, the error state still up and the button live.
- Accounts list, recovered: tap Try again with the throw off. Shoot: the rows and the section count replacing the error state.

## Non-goals
- The empty states and the B2/B3 split (MA-025); the caption (MA-024); the list screen itself (MA-023).
- Any loading skeleton or `isLoading` flag on the account store: the list paints from the store on open.
- A retry on the startup fatal screen or on any other screen that reads accounts.
- Changing the gradient on `startup_error.tsx` or `route_error_fallback.tsx`; `flat` is opt-in.
- Merging `EmptyState` and `ErrorState`, or moving either's geometry (ADR 2026-09-01, `#338` guard).
- Touching `pay_sheet.hook.ts:332`, `edit_transaction.hook.ts:380`, `add_transaction.hook.ts:469`, which already catch `loadAccounts`.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-028 (#402) edits `error_state.tsx`; a rebase conflict on step 2 is a two-prop merge.
- MA-020 (#386) adds to `account.store.ts`; step 1 is a one-line deletion at `:49`, the conflict is trivial.
- Removing the up-front clear in step 1 changes `loadError` during every reload, not only the list's; no reader outside the store exists at base, but one added by a concurrent branch would see `true` during an in-flight reload after a failure.
- Amended after review round 1: step 1 states which test discriminates, step 3 renames the retry key to `accountsLoadErrorRetry` (step 7 follows) so `load_error_copy.test.ts` stays green, and Screens drops the zero-row scene (unreachable: N2 gates on `useAccountStore.getState().accounts.length`, `add_account.hook.ts:39,68`, which stays 0 after a failed reload) and the dashboard scene (the dashboard reads the DB, `dashboard.repository.ts:3`, not the store; step 1 test (b) proves A5).
- `edges={[]}` relies on `hasEdge` treating an empty array as no edge (`screen.tsx:21-25`); a change to `DEFAULT_EDGES` fallback semantics would re-pad the top under the header.

## Self-assessment
Step 1 is the one I am least sure of. The ticket offers two roads, a store action that clears `loadError` only on success or a hook flag that holds the error state up, and I took a third that is smaller than either: make `loadAccounts` itself stop clearing the flag before the read. It satisfies the Acceptance with one deleted line and two tests, and no reader of `loadError` outside the store exists at base, but it changes the meaning of the flag for every caller of `loadAccounts`, not only the list. If the reviewer wants the change scoped to the list, the substitute is a `retryLoadAccounts` action beside `loadAccounts` that skips the clear, with step 6 calling it instead; the tests in step 1 move to that action unchanged.
