# MA-122 — Edit sheet: locked account strip, deleted-account tile, strip skeleton row
base: 488d74dd · verify: emulator · flags: none · expected diff: ~267 lines

Paths below are relative to `src/modules/transactions/screens/transactions/transaction_form/` unless they start with `src/`, `__tests__/` or `.claude/`. Tests sit in `__tests__/screens/transactions/transaction_form/`.

## Steps

### 1. Every strip chip is the 118 by 40 row, with a 44 hit area
- File: `components/transaction_form_geometry.ts` (`:17-29`), `components/account_strip.tsx` (`:72-127`), `transaction_form_body.tsx` (`:179`, the strip wrapper's padding)
- Change: In geometry, `ACCOUNT_STRIP_CHIP_WIDTH = ms(118)`, new `ACCOUNT_STRIP_CHIP_HEIGHT = ms(40)`, `ACCOUNT_STRIP_CHIP_PADDING_X = ms(10)`, `ACCOUNT_STRIP_TILE_NAME_GAP = Spacing.xs`, new `ACCOUNT_STRIP_CHIP_SLOP_Y = Math.max(0, (TouchSize.min - ACCOUNT_STRIP_CHIP_HEIGHT) / 2)` and `ACCOUNT_STRIP_HIT_SLOP = { top, bottom: ACCOUNT_STRIP_CHIP_SLOP_Y, left, right: ACCOUNT_STRIP_GAP / 2 }`; `ACCOUNT_STRIP_CHIP_PADDING` and `ACCOUNT_STRIP_CHIP_MIN_HEIGHT` go, and the `:17` comment names the 2026-09-27 ruling instead. In the strip, the chip is `flexDirection: 'row'`, `alignItems: 'center'`, `justifyContent: 'flex-start'`, fixed width and height, `overflow: 'visible'`, `hitSlop={ACCOUNT_STRIP_HIT_SLOP}`; the name is `Type.micro` with `lineHeightFor(Type.micro)`, `textAlign: 'left'`, `flexShrink: 1`, one line. The scroll's `contentContainerStyle` takes `paddingVertical: ACCOUNT_STRIP_CHIP_SLOP_Y`, since Android drops a touch outside the ScrollView (`src/modules/transactions/screens/transactions/components/account_chips.tsx:23-25`), and the body wrapper's `paddingVertical` loses the same amount so the strip's outer spacing holds.
- Test: `first` · `account_strip.geometry.test.ts`, the three cases rewritten. Width `ms(118)`, height `ms(40)`, gap `Spacing.xs`; `2 * W + 2 * GAP < ms(390) - 2 * Spacing.md < 3 * W + 2 * GAP` (the third chip cut); `ACCOUNT_STRIP_CHIP_HEIGHT + 2 * ACCOUNT_STRIP_CHIP_SLOP_Y >= TouchSize.min`; side padding `ms(10)`, tile `Size.dualTile`, tile to name `Spacing.xs`.

### 2. The strip's chip state and the To row's face come from pure builders
- File: `transaction_form.helpers.ts` (after `resolveStripSelectedId`, `:95`)
- Change: Add
  `export interface AccountStripChip { id: string; name: string; tile: RowTile; selected: boolean; locked: boolean; dimmed: boolean }`,
  `export function resolveAccountStripChips(eligible: Account[], selectedId: string | undefined): AccountStripChip[]` (list order, `selected` on the id match, `locked` and `dimmed` false),
  `export function resolveLockedStripChips(input: { type: TransactionType; currentId: string; current: Account | undefined; accounts: Account[] }): AccountStripChip[]` (first chip `{ id: currentId, selected: true, locked: true, dimmed: false }` whatever `current` is; then `resolveEligibleFromAccounts(type, accounts)` without `currentId`, each `dimmed: true`, `selected` and `locked` false),
  `export function resolveToRowFace(input: { locked: boolean; account: Account | null }): { value: string; tile: RowTile | undefined }` (unlocked and null: `Strings.addTxPickToTitle`, no tile; a live account: its name, no tile; a deleted account, or locked and null: `resolveAccountName`, the hollow tile).
  `name` is `resolveAccountName`, `tile` is `resolveRowTile` with `RowTile` imported from `src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts`; no second graphite rule.
- Test: `first` · `transaction_form.helpers.test.ts`, a `MA-122` describe. Locked expense: current first and ringed, the other active accounts dimmed in list order, current not repeated. Locked transfer: no credit card among the dimmed. Archived current (`is_archived: 1`, absent from `accounts`): first, filled tile, no other archived chip. Deleted current (`is_deleted: 1, name: ''`): `Strings.deletedAccount`, `{ color: AcctTokens.graphite.rich, hollow: true }`. `current: undefined`: `Strings.unknownAccount`, hollow tile. `resolveAccountStripChips`: the MA-111 ring cases through the new shape. `resolveToRowFace`: the four branches above, deleted never returning `addTxPickToTitle`.

### 3. The strip draws chips, not accounts
- File: `components/account_strip.tsx` (`AccountStripProps`), `transaction_form_body.tsx` (`:180-193`), `components/transaction_form_geometry.ts`, `docs/adr/2026-09-27-account-strip-one-write.md` (§1, `:12`)
- Change: `AccountStripProps` becomes `{ chips: AccountStripChip[]; onSelect?: (id: string) => void; caption?; error?; emptyText? }`. Per chip: `AccountColorTile` takes `chip.tile` with `hollow`; `selected` keeps the accent classes; `locked` adds a `lock-outline` glyph at the right, `Size.iconMicro`, `CoreTokens.text2`; `dimmed` sets `opacity: ACCOUNT_STRIP_DIMMED_OPACITY` (new geometry constant, 0.6) and `borderStyle: 'dashed'`; `locked` or `dimmed` sets `disabled` and `accessibilityState.disabled`, and no `onPress`. On add the body passes `resolveAccountStripChips(props.fromAccounts, resolveStripSelectedId(...))` and maps the pressed id back to its `Account` before `props.onSelectAccount`; the body's unlocked props keep their names and types. The ADR's §1 gains one dated line under its paragraph: amended 2026-09-27 by MA-122 (#595), the strip renders `chips` built by `resolveAccountStripChips` from the eligible list and `resolveStripSelectedId`, and reports a press by id; it still reads no store and keeps no state.
- Test: `none` · render layer, `.claude/rules/tests.md` forbids new render cases; step 2 asserts the state. The shipped cases at `transaction_form_body.test.tsx:140-167,215-251` stay green unedited.

### 4. The edit hook returns the locked list
- File: `edit_transaction.hook.ts` (`:196-203`, return at `:443`)
- Change: `state.lockedStripChips: AccountStripChip[]`, a `useMemo` over `resolveLockedStripChips({ type, currentId: initialTx.account_id, current: contextualAccounts.get(initialTx.account_id), accounts })`, deps `type`, `initialTx.account_id`, `contextualAccounts`, `accounts`. No action is added; the hook reads no amount.
- Test: `first` · `edit_transaction.hook.test.ts`, three cases beside the lock-policy case at `:408`. `mockTxExpense`: chip ids `['a1', 'a-card']`, the first locked and selected, the second dimmed. An expense on `a-usd` (archived, in `accountLookupById`): first chip `a-usd`, then the two active accounts dimmed. An expense whose account sits in `accountLookupById` with `is_deleted: 1, name: ''`: first chip named `Strings.deletedAccount` with the hollow tile. The `:416` assertion, no `selectAccount`, stays.

### 5. Edit draws the locked strip and has no From row
- File: `transaction_form_body.tsx` (`Props` `:76-85`, `:168`, `:178-195`, `:213-241`, `:253-269`), `edit_transaction_session.tsx` (`:57`)
- Change: The locked arm of `Props` becomes `{ locked: true; lockedChips: AccountStripChip[] }`. The strip block draws on both arms; locked passes `chips={props.lockedChips}`, no `onSelect`, no `error`, no `emptyText`, and the same `Strings.addTxFromLabel` caption rule on a transfer or card payment. The `from-account-row` block and its now unused imports go; the supporting line's `locked &&` border goes, the strip wrapper carries the hairline on both arms. The To row reads `resolveToRowFace({ locked, account: selectedToAccount })`: `value` is its `value`, and the prefix is an `AccountColorTile` (`Size.dualTile`, `Size.rowGlyph`, `hollow`) when `tile` is defined, else the shipped glyph. The session passes `lockedChips={hook.state.lockedStripChips}`.
- Test: `after` · `transaction_form_body.test.tsx:274-305`, the existing case edited and none added. `lockedChips` supplied on the locked render, `from-account-row` reads null, `account-strip` is present, the locked chip reads `accessibilityState` disabled; the To row assertions stay.

### 6. The skeleton's account bar becomes the strip's row of three bars
- File: `components/transaction_form_geometry.ts` (`TRANSACTION_FORM_SKELETON_GEOMETRY`, `:37-45`), `components/transaction_form_loading.tsx` (`:35-60`)
- Change: `accountRow` goes; `stripBar: { width: ACCOUNT_STRIP_CHIP_WIDTH, height: ACCOUNT_STRIP_CHIP_HEIGHT }` and `stripBarCount: 3` replace it. The loading view draws a row, testID `transaction-form-skeleton-strip`, between the supporting line and the amount, outside the scroll: `marginHorizontal: Spacing.md`, `flexDirection: 'row'`, `gap: ACCOUNT_STRIP_GAP`, `overflow: 'hidden'`, the vertical padding of the body's strip wrapper plus the slop so the loaded strip lands at the same height; three `SkeletonGroup.Item` bars, testID `transaction-form-skeleton-strip-bar`, `flexShrink: 0`, `borderRadius: ACCOUNT_STRIP_CHIP_RADIUS`. The hairline moves from the supporting line to this row. The `transaction-form-skeleton-account-row` bar inside the scroll goes, so the fact group is the scroll's first child.
- Test: `first` · `transaction_form_loading.test.ts:12-19` rewritten: `stripBar` equals `{ width: ACCOUNT_STRIP_CHIP_WIDTH, height: ACCOUNT_STRIP_CHIP_HEIGHT }`, `stripBarCount` 3, `factRow` stays `FACT_ROW_MIN_HEIGHT`. `after` · `transaction_form_body.test.tsx:359-378`, the two existing cases edited and none added: three `transaction-form-skeleton-strip-bar` nodes with the `stripBar` style, none inside `transaction-form-skeleton-scroll`.

### 7. The feature file proves the row, the lock, the deleted tile and the strip skeleton
- File: `.claude/skills/emulator-verify/features/transaction_form.md`
- Change: `add expense` (`:15`): chips read `ms(118)` wide and `ms(40)` high, two whole chips and the third cut at the strip's right edge on `Pixel_2_API_34` (411 wide), a tap 1 dp above a chip's top edge selects it; the 64, 62.86 and five-chip figures go. `add, strip scrolls` (`:21`): seeded count and chip ordinals restated for three chips per screen. `validation, type switch excludes the account` (`:29`): the ring's height figure remeasured, the 63.24 goes. `edit` (`:24`): `from-account-row` reads `no match`; the first `account-strip-chip-*` reads `selected=true`, `enabled=false` with the lock glyph at its right; the others read `enabled=false`, dimmed with a dashed border in the shot; a tap on a dimmed chip changes nothing; the Midnight clause moves from the From row to the locked chip's tile: on a Midnight rich account (#1B2B4B, the seed default) the tile's bank glyph reads light on its fill. New rows per Screens below. `loading` (`:25`): three 118 by 40 bars between the supporting line and the amount, no full-width account bar in the scroll. Gotchas `:53` rewritten to the row: a chip that reads 64 wide is the defect. Seeding line (`:58`) gains the deleted-account and deleted-counterparty seeds.
- Test: `none` · a skill document.

## Screens
- `emulator-verify/features/transaction_form.md`: add expense, add transfer, To row, add, USD account, add, strip scrolls, validation, type switch excludes the account, edit, loading
- A state the file lacks: `edit, transfer`, frame D8. Force: a seeded transfer's detail, the header edit icon. Proof: the `From` caption above the locked strip, no card chip, `to-account-row` locked. Step 7 appends it.
- A state the file lacks: `edit, deleted account`, no frame. Force: a seeded expense whose account row is soft-deleted (`is_deleted = 1, name = ''`), per `features/README.md` § Seeding and forcing states. Proof: the first chip reads `Deleted Account`, locked, the hollow graphite tile in the shot; the other chips are active accounts only. Step 7 appends it.
- A state the file lacks: `edit, deleted counterparty`, no frame. Force: a seeded transfer whose To account is soft-deleted. Proof: `to-account-row` reads `Deleted Account`, never `Select`, with the hollow graphite tile and the lock. Step 7 appends it.

## Non-goals
- The add hook, `add_transaction_session.tsx`, the preselect, the USD switch and the danger ring's rule: untouched.
- The keyboard lift and the fact rows' reach on add or edit, MA-123 (#598).
- `Strings.addTxAccountLabel` and `addTxPickFromTitle` stay in `strings.ts`; MA-097 (#553) removes them. No new string.
- The To row of a live account keeps its shipped glyph prefix; the To picker's redesign is not built.
- `AccountColorTile` keeps `Radius.sm`; the canvas tile radius 7 is not chased here.
- No RHF account field on edit, no `selectAccount` on the edit hook, no change to `edit_transaction.store.ts` or `.state.ts`.
- No new case in any `.tsx` render suite.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The canvas frames were not readable from the repository; every figure comes from the ticket's Context. A frame that disagrees amends steps 1, 3 or 6.
- HeroUI `Chip` may ignore `overflow: 'visible'` on its root or clip inside `BottomSheetScrollView`; then the 44 hit area fails on the emulator and step 1 needs a wrapper `Pressable` or a 44-high chip box with a 40-high drawn face.
- The To row's deleted tile size, `Size.dualTile`, is this plan's pick; the ticket names the tile and no size.
- `ms(118)` scales with the screen; on `Pixel_2_API_34` the third chip's cut point differs from the 390 frame, so step 7's figures are measured, not derived.
- Amended after review: step 3 adds a dated line to ADR `2026-09-27-account-strip-one-write.md` §1, whose `accounts` and `selectedId` props step 3 replaces with `chips`; step 7's `edit` row restates the Midnight glyph clause for the locked chip's tile, since `from-account-row` is gone.
- A transaction whose From account is a credit card on a transfer (legacy data) draws the card first, locked; the dimmed list still excludes cards.

## Self-assessment
Step 1's hit area is the least certain. The chip is 40 high inside a horizontal `BottomSheetScrollView`, and the plan reaches 44 with a `hitSlop`, `overflow: 'visible'` on the chip and 2 of content padding in the scroll, the pattern `account_chips.tsx` uses on a plain `ScrollView` with `SelectablePill`. The strip uses HeroUI `Chip` directly inside a gorhom scrollable, and no unit test can assert a touch, so only the emulator tap 1 dp above the chip proves it. If that tap misses, the fix changes the chip's structure and the line count of step 1, and the danger ring's measured height in the feature file moves with it.
