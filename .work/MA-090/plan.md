# MA-090 — Transaction row: account tile, category glyph, note and time, signed amount; activity card variant
base: 4ec4342386ab55d2a5070e24d6a46d46b4b7fd47 · verify: emulator · flags: none · expected diff: ~400 lines outside tests, plus the ~85-line tile file git reports as a rename

Frame A1 row, as measured in `R2A1.dc.html` (`.fl-row`, `.dual`, `.id-tile`): row 60, side padding 16, content centred; 28 tile r8 in the account colour with the account-type glyph 16; title row = 14 glyph in the category colour, name Inter 500 15/20, `Budget` label or `Commitment` badge; caption Inter 11/14 content-secondary `note · 6:40 PM` or `CIB Current → Payoneer · 10:30 AM`; amount column hugs: Sora 400 15/20 signed in the type colour over Inter 11/14 content-secondary `EGP` / `≈ 735 EGP @ 49.00` / `→ 102.04 USD`; a transfer or card payment draws two 24 tiles in a 40×28 box, the second 16 in with a 2 ring in the row's background.

## Steps
### 1. The account tile is a shared component
- File: `src/components/ui/account_color_tile.tsx` (new, `git mv` from `src/modules/accounts/components/account_color_tile.tsx:19`); `src/modules/accounts/components/account_row_content.tsx:9`, `src/modules/accounts/screens/accounts/detail/components/balance_hero.tsx:11`, `src/modules/accounts/screens/accounts/list/components/archived_account_row.tsx:7`
- Change: move the file; the import of `resolveAccountTileColors` becomes `@/modules/accounts/constants/account_tile_color`; props `{ color, type, size, glyphSize, hollow? }` unchanged; the three call sites change only their import path. `src/modules/accounts/screens/accounts/list/components/account_list_row.tsx:58` calls the resolver directly and stays.
- Test: `none` · no render suites; `__tests__/accounts/account_tile_color.test.ts` covers the resolver, which does not move.

### 2. The presentation carries tiles, a glyph, a caption and a two-line amount
- File: `src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts` (`buildTransactionRowPresentation` `:137`, `TransactionRowPresentation` `:50`); `src/constants/theme.ts` (`Size` `:143`)
- Change: `Size` gains `rowGlyph: ms(14)` and `dualTile: ms(24)`. The presentation becomes
  ```ts
  export interface RowTile { color: string | null; type: AccountType; hollow: boolean }
  export interface TransactionRowCaption { lead?: string; time?: string }
  export interface TransactionRowPresentation {
    title: string;              // unchanged: category name, Transfer, CC Payment, Card credit
    caption: string;            // [lead, time].join(' · '); lead = note, or `${from} → ${to}` for transfer and card payment; time = formatTime12h(tx.transaction_time)
    primaryAmount: string;      // signed magnitude, no code: '−1,240', '+22,300', '5,000' (transfer and card payment unsigned); MINUS_SIGN, PLUS_SIGN, signAmountText as today
    secondaryLine: string;      // CURRENCY_CONFIG[tx.currency].code; a non-EGP expense/income: `≈ ${formatCurrencyAmount(egp_amount, EGP)} @ ${formatRateDisplayMagnitude(rate).text}`; a transfer/card payment with to_amount: `→ ${formatCurrencyAmount(to_amount, toCurrency)}`
    ownershipLabel?: string; isCommitmentOwned: boolean;   // unchanged
    glyphName: IconName;        // toIconName(category?.icon, 'shape-outline'); 'swap-horizontal' transfer; 'credit-card-refund' card payment and card credit
    glyphColor: string;         // category.color, GoldTokens[500] when uncategorised; InfoTokens[500] transfer and card credit; AccentCCTokens[500] card payment
    amountClassName: string;    // unchanged vocabulary: text-danger, text-success, text-info, text-accent-cc, card credit text-info
    tiles: RowTile[];           // [resolveRowTile(account)]; transfer and card payment [from, to]
    accessibilityLabel: string; // [title, accountNames, caption, `${primaryAmount} ${secondaryLine}`, ownershipLabel] joined by ', '; accountNames = resolveAccountName(account), or `${resolveAccountName(account)} → ${resolveAccountName(toAccount)}` for transfer and card payment: the tile has no accessibility prop, so the label is the only place the account is spoken
  }
  export function resolveRowTile(account: Account | undefined): RowTile   // undefined or is_deleted: { color: AcctTokens.graphite.rich, type: account?.type ?? AccountType.Bank, hollow: true }; else { color: account.color, type: account.type, hollow: false }; archived accounts are filled like any other
  export function buildTransactionRowPresentation(input: TransactionRowPresentationInput, caption?: TransactionRowCaption): TransactionRowPresentation
  ```
  `caption.lead` replaces the note or the from → to text, `caption.time` replaces the clock; a blank note and no lead give the time alone. Geometry constants: keep `TRANSACTION_ROW_HEIGHT = ms(60)` and `TRANSACTION_ROW_TITLE_BADGE_HEIGHT`; add `TRANSACTION_ROW_TITLE_FONT_SIZE = Type.bodyStrong`, `TRANSACTION_ROW_CAPTION_FONT_SIZE = Type.micro`, `TRANSACTION_ROW_AMOUNT_FONT_SIZE = Type.bodyStrong`, `TRANSACTION_ROW_CODE_FONT_SIZE = Type.micro`, `TRANSACTION_ROW_LINE_GAP = ms(2)`, `TRANSACTION_ROW_DUAL_OFFSET = ms(16)`, `TRANSACTION_ROW_DUAL_RING = ms(2)`, `TRANSACTION_ROW_DUAL_RING_COLOR = CoreTokens.bg`; delete `TRANSACTION_ROW_ICON_SIZE`, `TRANSACTION_ROW_VALUE_WIDTH`, `TRANSACTION_ROW_VERTICAL_PADDING`, `TRANSACTION_ROW_CONTEXT_GAP`, the note and secondary-amount font and track constants. `isCardCredit` `:66` stays exported (`detail/detail.helpers.ts:30`). Invariant: every string through `format_amount.ts`; the row never sees a `Date`. Steps 2 to 6 are one commit: the deletions here break `transaction_row.tsx:20-30`, `transaction_rows_skeleton.tsx:7-15` and `account_activity.helpers.ts:88` until steps 3 to 6 land, so the per-commit chain runs once, after step 6.
- Test: `first` · `__tests__/screens/transactions/transaction_row.helpers.test.ts`, rewritten against the signature above: one case per type (expense, income, transfer, card payment, card credit) asserting title, caption, primaryAmount, secondaryLine, glyphName, glyphColor, amountClassName, tiles; the USD expense line `≈ 735 EGP @ 49.00`; the sub-unit USD case kept; a transfer with `to_amount` null falls back to the code; the accessibility label carries the account name on an expense and both names on a transfer; a deleted counterparty gives a hollow graphite tile on that side and `Deleted Account` in the caption of a transfer and in the label of an expense (MA-020 block); the blank-name block (MA-062) on the caption and the label; an archived account's tile is filled in its colour and its name is in the label; `caption` override replaces lead and time and nothing else; commitment over budget precedence; geometry: `max(lineHeightFor(TITLE), TITLE_BADGE_HEIGHT) + LINE_GAP + lineHeightFor(CAPTION) <= TRANSACTION_ROW_HEIGHT` and the same for amount + code.

### 3. The row draws the frame
- File: `src/modules/transactions/screens/transactions/components/transaction_row.tsx` (`TransactionRowBody` `:49`, `TransactionRowComponent` `:198`)
- Change: `TransactionRowBody({ presentation, onPress })`, the `category` prop gone. Layout: `Animated.View` `height: TRANSACTION_ROW_HEIGHT`, `justifyContent: 'center'`, `px-4`, `border-separator border-b`; a row `alignItems: 'center'` `gap-3` of three parts. Tiles: `presentation.tiles.length` 0 draws nothing, 1 draws `AccountColorTile` at `Size.accountTile` / `Size.iconXs`, 2 draws a `View` of width `TRANSACTION_ROW_DUAL_OFFSET + Size.dualTile + TRANSACTION_ROW_DUAL_RING` and height `Size.accountTile` with both tiles at `Size.dualTile` / `Size.rowGlyph` positioned absolute at `top: (Size.accountTile - Size.dualTile) / 2`, the first at `left: 0`, the second inside a ring `View` at `left: TRANSACTION_ROW_DUAL_OFFSET - TRANSACTION_ROW_DUAL_RING`, `top` minus the ring, `borderWidth: TRANSACTION_ROW_DUAL_RING`, `borderColor: TRANSACTION_ROW_DUAL_RING_COLOR`, `borderRadius: Radius.sm + TRANSACTION_ROW_DUAL_RING`, so the second fill spans 16..40 and the ring sits outside it as the frame's `box-shadow` does. Content column `flex: 1, minWidth: 0`: title row (`flexDirection: 'row'`, `alignItems: 'center'`, `gap-1.5`) of `MaterialCommunityIcons` `glyphName` at `Size.rowGlyph` in `glyphColor`, the title `Text` `font-inter-medium text-foreground` `fontSize: TRANSACTION_ROW_TITLE_FONT_SIZE` with its `lineHeightFor`, `numberOfLines={1}`, `min-w-0 shrink`, then `TypeBadge` or the ownership label as today; the caption `Text` `font-inter text-content-secondary` at `TRANSACTION_ROW_CAPTION_FONT_SIZE`, `numberOfLines={1}`, `marginTop: TRANSACTION_ROW_LINE_GAP`. Amount column `flexShrink: 0, alignItems: 'flex-end'`: `font-sora tabular-nums ${amountClassName}` at `TRANSACTION_ROW_AMOUNT_FONT_SIZE`, then `font-inter text-content-secondary tabular-nums` at `TRANSACTION_ROW_CODE_FONT_SIZE` with the gap, both `numberOfLines={1}`. `testID`s: `transaction-row`, `transaction-row-tiles`, `transaction-row-content-track`, `transaction-row-value-track`. Every `fontSize` pairs `lineHeightFor`; no `adjustsFontSizeToFit`. `TransactionRowComponent` and its swipe actions unchanged except the body call at `:246`, which drops `category`.
- Test: `after` · `__tests__/screens/transactions/transaction_row.test.tsx`, pruned by reading: keep the two swipe-action cases; the long-content case keeps `height: TRANSACTION_ROW_HEIGHT` and the content track `flex: 1, minWidth: 0`, asserts the caption `Text` carries `numberOfLines` 1 (the long note clips, never wraps into the amount) and drops the assertions on deleted tracks; the transfer case asserts `100.00` and `→ 4,850 EGP` as separate texts and the code line's `fontSize`/`lineHeight` bound to `TRANSACTION_ROW_CODE_FONT_SIZE`.

### 4. The skeleton mirrors the row
- File: `src/modules/transactions/screens/transactions/components/transaction_rows_skeleton.tsx`
- Change: per row `height: TRANSACTION_ROW_HEIGHT`, `justifyContent: 'center'`, `px-4`; a 28 `SkeletonGroup.Item` (`Size.accountTile`, `rounded-lg`, `testID` `transaction-row-skeleton-icon`); content bars at `lineHeightFor(TRANSACTION_ROW_TITLE_FONT_SIZE)` and `lineHeightFor(TRANSACTION_ROW_CAPTION_FONT_SIZE)` with `TRANSACTION_ROW_LINE_GAP`; value bars at the amount and code line heights, `alignItems: 'flex-end'`; the note and secondary-amount bars go.
- Test: `after` · `__tests__/screens/transactions/transaction_rows_skeleton.test.tsx`: the icon bar reads `Size.accountTile`, every row `height: TRANSACTION_ROW_HEIGHT`, the title bar `lineHeightFor(TRANSACTION_ROW_TITLE_FONT_SIZE)`; the note and secondary-track case is deleted.

### 5. The activity row is the same presentation with the day label and the tile off
- File: `src/modules/accounts/screens/accounts/detail/components/account_activity.helpers.ts` (`buildActivityRowPresentation` `:77`, `activityContext` `:56`)
- Change: `buildActivityRowPresentation(input, now, openAccountId)` returns `buildTransactionRowPresentation(input, { lead, time: formatActivityDayLabel(...) })` with `tiles` replaced: `lead` is `Strings.accountActivityFromAccount(resolveAccountName(account))` only for a card payment whose `to_account_id === openAccountId`, otherwise undefined so the builder's own note or from → to stands; `tiles` is `[]` for an expense, income or card credit, `[resolveRowTile(other)]` for a transfer or card payment where `other` is `toAccount` when `tx.account_id === openAccountId` and `account` otherwise. `timeText` and `context` are gone with the old shape.
- Test: `first` · `__tests__/screens/accounts/account_activity.helpers.test.ts`, written before this step's body and run green with step 2's suite inside the steps 2 to 6 commit; the `buildActivityRowPresentation` block rewritten: a categorised expense with a note reads `` `Carrefour · ${Strings.accountActivityToday('6:40 PM')}` `` (the string renders `Today, 6:40 PM`; build the expectation from the function) and no tiles; no note reads the day label alone; card credit keeps the title and the day label; a transfer from the open account shows `[toAccount tile]` and `CIB Current → Payoneer · Yesterday`; a card payment on the paying account shows the card's tile; on the paid card `From CIB Current · 18 Sep` and the payer's tile; deleted payer (MA-020) hollow graphite tile and `From Deleted Account`; blank-named payer (MA-059); "changes caption and tiles and nothing else" by comparing every other field with `buildTransactionRowPresentation(input)`. `formatActivityDayLabel` and `resolveActivityCardView` cases untouched.

### 6. The activity card renders the variant
- File: `src/modules/accounts/screens/accounts/detail/components/account_activity_card.tsx` (`AccountActivityRow` `:18`, `:69`); `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts:168-186`
- Change: `AccountActivityRow` drops `category`; `<TransactionRowBody presentation onPress />`; the hook's row object stops carrying `category` (it still resolves it for the builder input). `DetailRowsCard` and the skeleton call unchanged.
- Test: `none` · no suite renders the card (ticket Context); step 5's suite covers the rows it receives.

### 7. Emulator recipes carry the row states
- File: `.claude/skills/emulator-verify/features/transactions.md`, `.claude/skills/emulator-verify/features/account_detail.md`
- Change: append the states in Screens below to each file's States table, with the force and the proof written there.
- Test: `none` · documentation.

## Screens
- `emulator-verify/features/transactions.md`: `type badge, sm` (re-run: the badge now sits in the title row, row height still `TRANSACTION_ROW_HEIGHT`). States the file lacks, each added by step 7:
  - `row, expense` · A1 · a categorised EGP expense with a note · shot; title `TextView` bounds ÷ 2.625 read `lineHeightFor(msFont(15))` = 20 ± 1, caption 14 ± 1, the row 60; `mqa ui` reads `<note> · <h:mm AM|PM>` and `−1,240` with `EGP` as separate nodes
  - `row, USD expense` · A1 · seed a USD expense with a rate · `mqa ui` reads `≈ <egp> EGP @ <rate>` under `−15.00`
  - `row, transfer` · A1 · an EGP → USD transfer · shot of the two overlapped tiles; `mqa ui` reads `<from> → <to> · <time>` and an unsigned amount over `→ <to_amount> USD`
  - `row, card payment` · A1 · a card payment · same as transfer, amount in the plum
  - `row, card credit` · no frame, C13 caption · an income on a credit card · shot: card-colour tile, refund glyph in info, `+<amount>` in info
  - `row, deleted counterparty` · no frame, Finding 11 · soft-delete an account that has a transaction (archived_account.md E4) · shot of the hollow graphite tile; the row's content-desc in `mqa ui` reads `Deleted Account`
  - `row, archived account` · no frame, MA-090 · archive an account with a transaction · shot: filled tile in its colour; the row's content-desc in `mqa ui` reads the account name
- `emulator-verify/features/account_detail.md`: `bank with recent activity` (C1, re-run: rows at 60 in the same card). States the file lacks, added by step 7:
  - `activity row, tile off` · no frame, MA-090 · the seeded bank's expense · shot: no tile, caption `<note> · Today <time>`; the row 60
  - `activity row, transfer` · no frame, MA-090 · a transfer from the open account · shot: the other account's single 28 tile
  - `activity row, card payment, paid card` · no frame, MA-090 · open the card · `mqa ui` reads `From <payer> · <day label>`; shot of the payer's tile

## Non-goals
- Day cards, section headers and the day net (MA-092); the `DateHeader` stays.
- Swipe rules for commitment-owned rows and the delete dialog (MA-093); the hero, chips and tally (MA-091).
- The transaction detail's hero and rows (C13 draws the detail; only its caption binds this ticket).
- `account_tile_color.ts` and the palette stay under `src/modules/accounts/constants/`; `account_list_row.tsx`'s inline tile stays inline.
- The accounts canvas C1 row internals: superseded by this row; the card and the 60 row height are what "unchanged" means.
- No copy change in `strings.ts`; the `→` glyph in the caption stays the text arrow `contextFor` writes today.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-092 moves the list rows into surface cards; `TRANSACTION_ROW_DUAL_RING_COLOR` then reads `CoreTokens.surface`, one constant.
- `moneyapp/font-size-pairs-line-height` reads only literal pairs; a spread style on the amount `Text` escapes the rule and the review lens.
- The `Text` wrapper's default variant sets `text-[15px]` and `font-inter`; the `style` `fontSize` and the family class win, but a missing family class leaves Inter where the frame wants Sora on the amount.
- `git mv` rename detection breaks if step 1 edits the tile beyond its import line; keep the move and the edit in one commit with `-M`.
- `__tests__/screens/transactions.screen.test.tsx:78` mocks `TransactionRow`; the screen suite is blind to this change by design.
- `formatRateDisplayMagnitude` prints `49.00`, the frame draws `49.0`; the formatter wins (Rules).

## Self-assessment
Step 3's dual-tile overlap is the step I am least sure of: the frame positions the second tile 16 in with a 2 ring, and on Android Fabric an absolutely positioned child with a border inside a fixed 40×28 box is the one layout the row tests cannot see, so a clipped ring or a ring in the wrong colour reaches the render pass unasserted. The presentation contract in step 2 is the other risk: it changes every field the activity helpers and their eight cases touch, so step 5's test-first rewrite must land against step 2's signature exactly or the two suites disagree on `caption` and `tiles`.
