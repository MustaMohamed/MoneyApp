# MA-056 — Detail: the archived screen, its banner, facts and unarchive
base: 123f3c9b7237b6a787aaa14d7b8b2f5f35bb5d48 · verify: emulator · flags: user copy · expected diff: ~250 lines

## Steps
### 1. The copy exists, byte-exact
- File: `src/constants/strings.ts` (the `Account Detail (U3)` block, `:281-318`)
- Change: add `accountDetailArchivedTitle: 'Archived'`, `accountDetailArchivedBody: 'Hidden from your dashboard and totals. Its history stays.'`, `accountDetailBalanceArchived: 'Balance when archived'`, `accountDetailTransactionsLabel: 'Transactions'`, `accountDetailCommitmentsLabel: 'Commitments paid from it'`, `accountDetailUnarchive: 'Unarchive'`, `accountDetailNotFound: 'Account not found'`, `accountDetailLoadError: "Couldn't load this account."`, `accountDetailLoadRetry: 'Try again'`. Add a new block `// Accounts list: archived card (B4, B5, G3)` with the three keys MA-048 (`436a4ffc`, unmerged) already uses, same names and values, so whichever branch lands second rebases onto identical lines: `accountsArchivedRestored: (name: string) => \`${name} restored.\``, `accountsArchivedNameTaken: 'An active account already has this name. Rename it first.'`, `accountsArchivedRestoreError: "Couldn't restore this account. Nothing was changed."`.
- Test: `__tests__/screens/accounts/account_detail_archived.strings.test.ts`, new, shaped like `account_detail_archive.strings.test.ts`: the six canvas strings byte-exact, `accountsArchivedRestored('Old HSBC')` is `'Old HSBC restored.'`, and neither failure line matches `/sorry|apolog/i`.

### 2. The toast mock returns what the real hook returns
- File: `jest.setup.js:226`
- Change: `useToast: () => ({ toast, isToastVisible: false })`. `heroui-native`'s `useToast()` returns `{ toast, isToastVisible }` (`node_modules/heroui-native/lib/typescript/src/providers/toast/provider.d.ts:28-31`); the mock at this checkout returns the bare `{ show }`, which no consumer has caught because none exists yet. MA-048 makes the same one-line edit.
- Test: none new; `__tests__/components/ui/toast_provider.test.ts` only asserts `typeof useToast`, and step 6's hook tests are the first consumer.

### 3. The screen state carries the restore's busy flag and line
- File: `src/modules/accounts/screens/accounts/detail/account_detail.state.ts`
- Change: add `isUnarchiving: boolean` (initial `false`) and `unarchiveError: string | undefined` to the shape, with `setUnarchiving` and `setUnarchiveError`, the shape of `isArchiving` / `archiveError`; `reset()` keeps clearing through `INITIAL_STATE`.
- Test: `__tests__/screens/accounts/account_detail.state.test.ts`, new, on `createAccountDetailState()`: the two setters publish, and `reset()` returns both fields to initial.

### 4. Three fact rows for any account type
- File: `src/modules/accounts/screens/accounts/detail/components/account_facts.helpers.ts`
- Change: export `buildArchivedAccountFacts(account: Account, counts: { transactionCount: number; activeCommitmentCount: number }): AccountFact[]` returning, in order, `{ label: Strings.accountCurrencyLabel, value: CURRENCY_CONFIG[currency].code }`, `{ label: Strings.accountDetailTransactionsLabel, value: formatAmount(counts.transactionCount, COUNT_DISPLAY_DECIMALS) }`, `{ label: Strings.accountDetailCommitmentsLabel, value: formatAmount(counts.activeCommitmentCount, COUNT_DISPLAY_DECIMALS) }`, with `const COUNT_DISPLAY_DECIMALS = 0` next to `APR_DISPLAY_DECIMALS` (`:18`; a count is not an amount, so `CURRENCY_CONFIG` decimals do not apply). No branch on `account.type`. `buildAccountFacts` and `buildMonthFacts` are untouched.
- Test: `__tests__/screens/accounts/account_facts.helpers.test.ts`, new `describe('buildArchivedAccountFacts')`: a bank gives exactly `[Currency EGP, Transactions '42', Commitments paid from it '1']`; `mkCard()` gives the same three labels and no `Credit limit` row; `transactionCount: 1204` prints `'1,204'`; zero prints `'0'`.

### 5. The hero names the balance as frozen and hollows its tile from the row
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts`
- Change: export `buildHeroHeading(account: Account): { label: string; hollow: boolean }`: `is_archived === 1` gives `{ label: Strings.accountDetailBalanceArchived, hollow: true }`, else `{ label: Strings.accountDetailBalance, hollow: false }`. `buildHeroCaption` is unchanged; the canvas caption on G2 is the same `Opening … · adjusted` line.
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.geometry.ts`
- Change: add `export const ARCHIVED_HERO_OPACITY = 0.85` (canvas G2 `.hero` at `opacity:.85`).
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.tsx`
- Change: replace the inline tile `View` (`:40-54`) with `<AccountColorTile color={account.color} type={account.type} size={Size.typeIconBox} glyphSize={Size.iconSm} hollow={heading.hollow} />` from `@/modules/accounts/components/account_color_tile` (its first consumer); print `heading.label` at `:77`; when `heading.hollow`, pass `opacity: ARCHIVED_HERO_OPACITY` on the `HeroShell` `style` beside `marginTop`. No new prop: the slot's row carries `is_archived: 1`, the active list's rows carry `0`, so the active hero renders as today. `resolveAccountTileColors` and its `tile` local leave the file with the inline tile.
- Test: `__tests__/screens/accounts/balance_hero.helpers.test.ts`: `buildHeroHeading` on `is_archived: 0` is `{ label: 'Current balance', hollow: false }`, on `is_archived: 1` is `{ label: 'Balance when archived', hollow: true }`. The `.tsx` change has no test, by `tests.md`.

### 6. The hook resolves an id through the active list, then the slot, and restores in place
- File: `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts`
- Change, resolution: select `{ slotStatus: s.status, slotSnapshot: s.snapshot }` from `useArchivedAccountDetailStore` with `useShallow`. `account` stays `accounts.find(...)` (`:93`) and wins. `archived` is `!account && slotSnapshot?.accountId === id && slotSnapshot.account ? { account: slotSnapshot.account, transactionCount, activeCommitmentCount } : undefined`. `viewState: 'active' | 'archived' | 'loading' | 'notFound' | 'loadError'`: `account` → `active`; `archived` → `archived`; `slotStatus === 'ready' && slotSnapshot?.accountId === id` (row absent) → `notFound`; `slotStatus === 'initialError'` → `loadError`; otherwise `loading`. The read never touches `accountLookup` (L27, M14).
- Change, the read: in the focus effect (`:104-117`) the missing-id branch returns `useArchivedAccountDetailStore.getState().ensure({ accountId: id, mutationVersion: useTransactionStore.getState().mutationVersion })` instead of `undefined`; the active branch is unchanged. The unmount cleanup (`:74-81`) also calls `useArchivedAccountDetailStore.getState().reset()`. `retryArchivedRead()` calls the slot's `retry` with the same input, the shape of `retryActivity` (`:241-243`).
- Change, month figures: `monthFacts` (`:144-153`) keeps its `account ?` guard, so an archived bank gets `[]`; the hook exposes no month facts for the slot.
- Change, restore: `const { toast } = useToast()` from `@/components/ui/toast`. `handleUnarchive()` mirrors `handleArchive` (`:193-209`): return unless `archived`; capture `archived.account.name`; `setUnarchiveError(undefined)`; `setUnarchiving(true)`; `try { await unarchiveAccount(id) } catch (error) { console.error(...); setUnarchiveError(error instanceof AccountNameTakenError ? Strings.accountsArchivedNameTaken : Strings.accountsArchivedRestoreError); return } finally { setUnarchiving(false) }`. Outside the try, in this order: `useArchivedAccountDetailStore.getState().reset()` (the slot must not hold the pre-restore row at `ready`, or a later Archive of the same account paints it), `void useAccountActivityStore.getState().ensure(activityInput())` (the focus effect does not re-run on a store change; the store owns the error status, as at `:240`), `toast.show({ label: Strings.accountsArchivedRestored(name), variant: 'success' })`. No navigation: once `loadAccounts` lands inside `unarchiveAccount`, `find` resolves and the tree is the active detail.
- Change, return: `state` gains `viewState`, `archived`, `isUnarchiving`, `unarchiveError`; flat actions gain `handleUnarchive`, `retryArchivedRead`.
- Test: `__tests__/screens/accounts/account_detail.hook.test.ts`, mocking `@/modules/accounts/screens/accounts/detail/archived_account_detail.store` as `{ useArchivedAccountDetailStore: jest.fn() }` and attaching it with `attachMockSelectorStore` (`snapshot`, `status`, `ensure`, `retry`, `reset` mocks, the shape of `mockActivity`); `mockAccounts` gains `unarchiveAccount: mockUnarchiveAccount`; the detail-state mock gains the step 3 fields and setters; `AccountNameTakenError` imported real from `@/modules/accounts/repositories/account.errors`; `useToast` from `@/components/ui/toast` for `useToast().toast.show`. Cases, in a new `describe('useAccountDetail — an id outside the active list')`:
  - archived id: `mockAccounts([])`, slot `ready` with `{ accountId: 'acc-1', account: mkAccount({ is_archived: 1 }), transactionCount: 42, activeCommitmentCount: 1 }` → `viewState` `'archived'`, `state.account` undefined, `state.archived` carries the row and both counts, `activity.monthFacts` is `[]` for that bank; `runFocusEffect()` calls the slot `ensure` with `{ accountId: 'acc-1', mutationVersion: 3 }` and not `mockEnsure`.
  - deleted id: slot `ready` with `account: undefined` → `'notFound'`.
  - active wins: `mockAccounts([mkAccount()])` and the same `ready` slot for `'acc-1'` → `'active'`, `state.archived` undefined, slot `ensure` not called on focus.
  - `'initialLoading'` → `'loading'`; `'initialError'` → `'loadError'`, and `retryArchivedRead()` calls the slot `retry` with the stamped input.
  - restore lands: `mockUnarchiveAccount` resolves → `setUnarchiveError(undefined)` first, slot `reset` called once, `mockEnsure` called with `{ accountId: 'acc-1', mutationVersion: 3 }`, `toast.show` called once with `{ label: 'CIB restored.', variant: 'success' }`, `setUnarchiving` last `false`, `mockBack` not called.
  - refusal: rejects with `new AccountNameTakenError()` → `setUnarchiveError` last `Strings.accountsArchivedNameTaken`, no `toast.show`, no slot `reset`, no `mockEnsure`.
  - not restored: rejects with `new Error('db')` → last line `Strings.accountsArchivedRestoreError`, same three absences.
  - unmount calls the slot `reset` once (extend `'drops the activity snapshot on unmount'`).

### 7. The archived body and the header kept through every state
- File: `src/modules/accounts/screens/accounts/detail/components/archived_detail_body.tsx`, new
- Change: `ArchivedDetailBody({ account, transactionCount, activeCommitmentCount, onUnarchive, isUnarchiving, errorMessage })`, rendered inside the screen's `ScreenScroll`, top to bottom (canvas G2): a HeroUI `Alert status="warning" className="mx-4 mt-4"` with `<Alert.Indicator><MaterialCommunityIcons name="archive-outline" size={Size.iconSm} color={SemanticTokens.warning} /></Alert.Indicator>`, `Alert.Title` `Strings.accountDetailArchivedTitle`, `Alert.Description` `Strings.accountDetailArchivedBody` (the shape of `balance_review_alert.tsx:22-26`); `<BalanceHero account={account} />`; a `DetailRowsCard` of `buildArchivedAccountFacts(account, { transactionCount, activeCommitmentCount })` through `AccountFactRow` with the index divider rule from `index.tsx:155-163`; one `Button variant="secondary" flat tone="accent" icon="archive-arrow-up-outline" label={Strings.accountDetailUnarchive} onPress={onUnarchive} isLoading={isUnarchiving} isDisabled={isUnarchiving}` in a `Box` with `mx-4 mt-4` (MA-046's compact arm, `button.content.ts:28-33`); `<FormErrorText message={errorMessage} className="mx-4" />` under it. No Adjust, Archive, activity card, balance-review alert or Delete.
- File: `src/modules/accounts/screens/accounts/detail/index.tsx`
- Change: replace `if (!account) return null;` (`:66`) with a branch on `viewState !== 'active'` that returns `<Screen>` with the same `Animated.View`/`StackHeader` as today, `title={archived?.account.name ?? ''}`, `onBack={onBack}`, no `right` (`stack_header.tsx:43` draws the spacer), then one of: `loading` → the `ActivityIndicator` fill from `commitments/detail/index.tsx:42-46`; `notFound` → the centred `Text` from `:48-54` with `Strings.accountDetailNotFound`; `loadError` → `<LoadErrorAlert title={Strings.accountDetailLoadError} retryLabel={Strings.accountDetailLoadRetry} flatRetry onRetry={retryArchivedRead} />` (fill mode); `archived` → `<ScreenScroll contentContainerStyle={{ paddingBottom: 32 }} showsVerticalScrollIndicator={false}><ArchivedDetailBody … onUnarchive={() => { void handleUnarchive(); }} /></ScreenScroll>`. The active tree below the branch, from `const facts = …` to the two sheets, is byte-identical; `account` is narrowed by `viewState === 'active'` only if the hook types it so, else keep a `!account` guard on the same branch.
- Test: none; render-only, by `tests.md`. The composition is what the emulator walk shoots.

## Screens
- Archived detail, bank, by deep link `moneyapp://accounts/<archived id>` (`app.json` scheme): header with the name and a spacer, the banner, the hollow tile, "Balance when archived", the three rows, Unarchive alone.
- Same screen after tapping Unarchive: the active detail in place (Edit, Adjust balance, Archive, the activity card) with the toast "<name> restored." at the bottom.
- Deleted id by deep link: header with an empty title, "Account not found".
- Not walked (unit-asserted in step 6): loading, load error, the name-taken line, the not-restored line, a credit card's three rows.

## Non-goals
- Delete on this screen, its warning and toast (MA-038); the replacement sheet (MA-039).
- Any change to `unarchiveAccount`, `loadAccounts`, the archived list or the store's archived slot (MA-047), the archived row (MA-048), the tile, toast wrapper or button shape (MA-046), the by-id read and the counts (MA-055).
- Editing an archived account, any snapshot column or archived date, any freeze of the balance (MA-053 owns the transaction-edit guard).
- A new route, an `accounts/_layout.tsx`, or reading through `accountLookup` (MA-043).
- Month figures, card terms or the balance-review alert on the archived detail.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-048 (`436a4ffc`) edits `strings.ts` and `jest.setup.js:226` with the same values; the second branch to land takes a trivial conflict on those lines, none if the key names above are kept.
- `unarchiveAccount` (`account.store.ts:125-133`) awaits `loadAccounts` inside its try, so a reload that fails after the row is restored shows "not restored" while the DB row is active, and a second tap hits `AccountNotArchivedError` (`account.repository.ts:111`) and shows the same line; the archive path catches that reload (`:119-122`). Out of scope (MA-047); worth a follow-up ticket.
- The slot's `ensure` gate keys on `accountId:mutationVersion`; a restore then a same-session re-archive with no transaction write would serve the reset slot's fresh read, not a stale one, because step 6 resets on restore. If a reviewer removes that reset, the trap in Context returns.
- `AccountColorTile` has no consumer at this checkout; if its hollow ring renders wrong at `Size.typeIconBox`, the fix belongs to the tile (MA-046), not this hero.

## Self-assessment
Step 7's `index.tsx` branch is the least certain: the hook's `account` is `Account | undefined` and the discriminant is a separate `viewState` string, so TypeScript will not narrow `account` on `viewState === 'active'`, and the implementer has to keep a `!account` guard on the same early return or type the hook's return as a discriminated union. Either compiles; the union is cleaner but touches every consumer of `state.account` in the active tree, which the ticket says must stay as it is, so the guard is the safer of the two. The rest is the shape the file already has, with the slot read placed in the branch of the focus effect that today returns `undefined`.
