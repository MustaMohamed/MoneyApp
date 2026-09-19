# MA-084 — List: grip with Move up and Move down, the filter note, the failure toast
base: e847352db600676dc4b498a021ba3ca762bf77fa · verify: emulator · flags: user copy · expected diff: ~190 lines

## Steps
### 1. The five reorder strings exist, verbatim
- File: `src/constants/strings.ts` (the `// Accounts list (B1)` block, after `accountCaptionCard`, `strings.ts:390`)
- Change: add `accountsReorderGrip: (name: string) => \`Reorder ${name}\``, `accountsReorderMoveUp: 'Move up'`, `accountsReorderMoveDown: 'Move down'`, `accountsReorderFilterNote: 'Reorder is off while a filter is on.'`, `accountsReorderError: "Couldn't save the new order. Nothing was changed."`. Nothing else in the block moves.
- Test: `first` · `__tests__/screens/accounts/accounts_list.strings.test.ts`: a `describe` for the reorder copy asserting the four literals byte-exact and `accountsReorderGrip(Strings.unnamedAccount)` equal to `'Reorder Unnamed account'`.

### 2. The order arithmetic is a pure module
- File: `src/modules/accounts/screens/accounts/list/accounts_list.reorder.ts` (new)
- Change: export `type ReorderDirection = 'up' | 'down'`; `resolveMoveTarget(index: number, direction: ReorderDirection, count: number): number | undefined`, `undefined` when `index` is outside `[0, count)` or the move leaves the list (up on 0, down on `count - 1`), else `index ∓ 1`; `resolveReorderedIds(ids: readonly string[], fromIndex: number, toIndex: number): string[] | undefined`, `undefined` when either index is outside the list or the two are equal, else a new array with `ids[fromIndex]` removed and inserted at `toIndex` (adjacent indices swap; a far move shifts the rows between, which is what MA-085's drop needs); `applyPendingOrder<T>(items: readonly T[], pendingOrder: readonly string[] | undefined, idOf: (item: T) => string): readonly T[]`, returns `items` itself when `pendingOrder` is `undefined` or is not a permutation of `items`' ids, else the same objects in `pendingOrder`. No React, no store, no import from the hook.
- Test: `first` · `__tests__/screens/accounts/accounts_list.reorder.test.ts` (new): target up/down in the middle; up on 0 and down on last are `undefined`; index outside the list is `undefined`; `resolveReorderedIds` on `['a','b','c']`: `(0,1)` gives `['b','a','c']`, `(0,2)` gives `['b','c','a']`, `(2,0)` gives `['c','a','b']`, `(1,1)` and `(3,0)` are `undefined`, the input array is not mutated; `applyPendingOrder` returns the input by reference on `undefined`, on a stale order (an id missing or extra) and returns the same objects reordered on a permutation.

### 3. The list state holds the display order and the write lock
- File: `src/modules/accounts/screens/accounts/list/accounts_list.state.ts`
- Change: `AccountsListStateShape` gains `pendingOrder: string[] | undefined` and `isReordering: boolean`; `INITIAL_STATE` sets `undefined` and `false`; actions `setPendingOrder(order: string[] | undefined)` and `setReordering(v: boolean)`, each a top-level `set`; `reset` clears both through `INITIAL_STATE`; `resetArchivedCard` leaves both (a write in flight across a remount keeps its lock, as `unarchivingId` does).
- Test: `first` · `__tests__/screens/accounts/accounts_list.state.test.ts`: starts with no pending order and no write in flight; round-trips both; `reset` clears both; `resetArchivedCard` leaves both set.

### 4. The note and the grip hit slop are geometry constants
- File: `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts`
- Change: `ACCOUNTS_LIST_REORDER_NOTE_STYLE: Readonly<TextStyle>`, frozen, keys exactly `fontSize: Type.caption`, `lineHeight: lineHeightFor(Type.caption)`, `marginTop: Spacing.sm`, `marginHorizontal: Spacing.md`, `textAlign: 'center'` (B7, 12/16 centred, margin 12 16 0). `ACCOUNTS_LIST_GRIP_HIT_SLOP: Readonly<Insets>` (`Insets` from `react-native`), frozen, `top` and `bottom` each `(TouchSize.min - Size.reorderGripSlot) / 2`, `right: TouchSize.min - Size.reorderGripSlot`, `left: 0`. `TouchSize` joins the import from `@/constants/theme`. `Size.reorderGripSlot` and its lock in `__tests__/geometry_tokens.test.ts:20` do not change.
- Test: `first` · `__tests__/screens/accounts/accounts_list.geometry.test.ts`: note style is `Type.caption` over `lineHeightFor(Type.caption)`, sits `Spacing.sm` under the card in the `Spacing.md` gutter, centred, carries exactly those five keys, frozen; hit slop has `left` 0, `Size.reorderGripSlot + top + bottom >= TouchSize.min`, `Size.reorderGripSlot + right >= TouchSize.min`, frozen.

### 5. The hook moves a row through one write and shows the failure
- File: `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts` (`useAccountsList`)
- Change: read `reorderAccounts` from `useAccountStore.getState()` and `pendingOrder` reactively from `useAccountsListState`; `allRows` stays keyed on `accounts` (captions never re-derive on a move), and `rows` on All becomes `applyPendingOrder(allRows, pendingOrder, (row) => row.account.id)`; the filter narrow is unchanged. `state.isReorderable: boolean` is `selectedType === 'all'`. `dropRow(fromIndex: number, toIndex: number): Promise<void>`: return when `useAccountsListState.getState().isReordering` or `selectedType !== 'all'`; `ids` are `useAccountStore.getState().accounts` ids; `next = resolveReorderedIds(ids, fromIndex, toIndex)`, return on `undefined`; `setReordering(true)`, `setPendingOrder(next)`; `await reorderAccounts(next)`; on rejection `toast.show({ label: Strings.accountsReorderError, variant: 'danger' })` and no rethrow; `finally` `setPendingOrder(undefined)`, `setReordering(false)`. `moveRow(index: number, direction: ReorderDirection): Promise<void>` resolves the target with `resolveMoveTarget(index, direction, accounts.length)` from the store and returns on `undefined`, else `dropRow(index, target)`. Both are returned flat next to `unarchive`. One toast per failure, no haptic, no animation.
- Test: `first` · `__tests__/screens/accounts/accounts_list.hook.test.ts`: `storeState` gains `reorderAccounts: mockReorder` (a `jest.fn<Promise<void>, [string[]]>()`). Cases: `moveRow(0, 'down')` writes `['acc-2', 'acc-1']` once and, with `mockReorder` deferred, `rows` read the pending order while in flight and the store order after it settles; `moveRow(0, 'up')` and `moveRow(1, 'down')` write nothing; with three accounts `dropRow(0, 2)` writes `['acc-2', 'acc-3', 'acc-1']`; under a type filter `isReorderable` is false and `moveRow` writes nothing; a second `moveRow` while the first is deferred writes nothing; a rejected write does not throw at the screen, shows `{ label: Strings.accountsReorderError, variant: 'danger' }` once, and leaves `rows` in store order; a landed write shows no toast.

### 6. Every active row carries the grip and the two actions
- File: `src/modules/accounts/screens/accounts/list/components/account_list_row.tsx` (`AccountListRow`, `AccountListRowProps`); `src/modules/accounts/screens/accounts/list/index.tsx` (the `rows.map` at `index.tsx:115`)
- Change: `AccountListRowProps` gains `onMove: ((direction: ReorderDirection) => void) | undefined`; `undefined` renders the empty `Size.reorderGripSlot` `View` as today with no actions on the item. With `onMove`: the item takes `accessibilityActions` `[{ name: 'moveUp', label: Strings.accountsReorderMoveUp }, { name: 'moveDown', label: Strings.accountsReorderMoveDown }]` and one `onAccessibilityAction` handler mapping the name to `onMove('up' | 'down')`; the slot holds a `PressableFeedback` (`heroui-native`, as `index.tsx:47`) of width `Size.reorderGripSlot`, `animation={false}`, `onPress` a no-op that absorbs the tap, `hitSlop={ACCOUNTS_LIST_GRIP_HIT_SLOP}`, `accessibilityRole="button"`, `accessibilityLabel={Strings.accountsReorderGrip(resolveAccountName(account))}`, the same `accessibilityActions` and the same handler, containing `MaterialCommunityIcons` `name="drag"` `size={Size.reorderGripSlot}` `color={Colors.dark.text3}` (`--muted`). The row's own `onPress` and label are unchanged. `index.tsx` passes `onMove={isReorderable ? (direction) => void moveRow(index, direction) : undefined}` from `state.isReorderable` and `moveRow`.
- Test: `none` · render suites are closed (`.claude/rules/tests.md`); the handler is one line into `moveRow`, covered by step 5; the emulator walk counts the grips.

### 7. The note shows under the active card while a filter is on
- File: `src/modules/accounts/screens/accounts/list/index.tsx`
- Change: directly after the `ListCard` in the `emptyState === 'none'` branch, and only there (the filtered empty block and the archived-only block carry no note), render `isReorderable ? null : <Typography className="text-content-secondary font-inter" style={ACCOUNTS_LIST_REORDER_NOTE_STYLE}>{Strings.accountsReorderFilterNote}</Typography>`. `Typography` joins the `heroui-native` import; the archived card keeps its own `marginTop`.
- Test: `none` · render suites are closed; the note condition is `isReorderable`, covered by step 5; the emulator walk reads the string.

### 8. The feature map names the two new states
- File: `.claude/skills/emulator-verify/features/accounts_list.md` (the States table)
- Change: append two rows: `grip on every active row` · B6 · seed with n active accounts, All selected · `mqa ui | grep -c '^Reorder '` equals the active count; one shot of a row for the glyph; `filtered, reorder off` · B7 · `$MQA tap '<type>'` on the rail with at least one row of that type · `Reorder is off while a filter is on.` present, `mqa ui | grep -c '^Reorder '` is 1 (the note shares the word); shot. The `row lifted mid-drag` row stays as it is.
- Test: `none` · a skill file.

## Screens
- `emulator-verify/features/accounts_list.md`: `populated, all five types`, `filtered to one type`, `filtered to zero`
- `grip on every active row` (B6) and `filtered, reorder off` (B7): the file lacks both; step 8 appends them. A move's order and the failure toast are the step 5 tests; `mqa` has no accessibility-action verb, so the walk asserts neither. Persisted order over relaunch is MA-081's repository test and MA-085's `mqa db` walk. `filtered to zero` proves the empty block carries no note.

## Non-goals
- The lift, the lifted row, the drag, the drop, the scroll lock, the haptic (MA-085, MA-083); no gesture handler on the grip.
- Any change to `src/components/ui/toast.tsx`: the danger toast renders with HeroUI's default `danger` styling and no app icon. The success-only decoration stays.
- Any change to `useAccountStore`, the repository, or `Size.reorderGripSlot`.
- A grip or actions on archived rows; a note under the filtered empty block or the archived-only block.
- Reordering the dashboard carousel or any picker; they read `sort_order` through `getAll` already.
- A spinner, a disabled state or a caption change during the write; `isReordering` is a lock, not a display state.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Emulator, after parity: `mqa claim`, then the two step 8 states and `filtered to zero`.

## Risks
- `PressableFeedback` may not expose `accessibilityActions` on Android through its `AnimatedProps<PressableProps>` typing or its Slot; if a tap or the a11y dump shows no grip actions, the grip falls back to `Pressable` from `react-native` with the same props (the ticket calls it a plain pressable).
- RN clips `hitSlop` to the parent's bounds, so the right slop reaches the row's `Spacing.sm` padding, not the full 28; the vertical slop is what makes the 44 floor.
- A screen reader that surfaces the row's actions and the grip's actions both is by design (review 2026-09-19); both run `moveRow` and the lock makes a double fire one write.
- The hook test's `attachMockSelectorStore` must serve `reorderAccounts` through `getState()`; `unarchiveAccount` is read the same way today, so the shape holds.

## Self-assessment
Step 6 is the least sure. The grip's element is a choice between HeroUI's `PressableFeedback` (Team Law 7, already on this screen for the header button) and a bare `react-native` `Pressable`; the ticket says "plain pressable", and whether `PressableFeedback`'s animated Slot forwards `accessibilityActions` to the native node on Android is unverified here, since the only accessibility-action precedents in the tree (`archived_account_row.tsx`, `swipeable_row.tsx`) sit on `ListGroup.Item` and a `View`. The row-level actions are the safe path the ticket already mandates, so a grip that loses its actions on one platform still leaves both moves reachable; the emulator walk's `grep -c '^Reorder '` proves the grip's label, not its actions, and the a11y-action route on the grip is the one thing neither a unit test nor the walk can assert.
