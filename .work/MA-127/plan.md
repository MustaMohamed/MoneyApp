# MA-127 — Rows, cards and skeletons on the tab screens hold at a 2.0 font scale
base: f7cff88a · verify: emulator · flags: none · expected diff: ~300 lines

## Steps

### 1. One shared function scales a skeleton bar with the OS font scale
- File: `src/components/ui/skeleton_bar.geometry.ts` (new)
- Change: export `resolveSkeletonBarHeight(height: number, fontScale: number): number`, returning `height * fontScale`, so a bar follows its text at every scale and equals today's at 1.0. Steps 2 to 5 read it; MA-128 (#607) reads the same file.
- Test: `first` · `__tests__/components/ui/skeleton_bar.geometry.test.ts` (new): 1.0 returns the height unchanged, 2.0 twice it, 0.85 0.85 times it, 3.0 three times.

### 2. The transaction row scales its own text and takes its height from the font scale, and its skeleton row follows
- File: `src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts` (`TRANSACTION_ROW_HEIGHT` :36, `TRANSACTION_ROW_TITLE_BADGE_HEIGHT` :47); `transaction_row.tsx` (`TransactionRowBody`: :134, title :146-155, caption lead :170-180, caption time :182-194, amount :201-210, code :211-221); `transaction_rows_skeleton.tsx` (`SkeletonRow`, :43, :59, :64, :72, :77)
- Change: the title, caption lead, caption time, amount and code render with `allowFontScaling={false}` and the style `scaledTextStyle(<their TRANSACTION_ROW_*_FONT_SIZE>, fontScale)` (`src/components/ui/text_scale.geometry.ts:24`), uncapped. This is ADR `2026-09-27-transactions-search-tally.md` §7's pattern: paint and spans agree, so a truncated line keeps a whole `…`. Export `resolveTransactionRowHeight(fontScale: number): number` = `Math.max(TRANSACTION_ROW_HEIGHT, PixelRatio.roundToNearestPixel(TRANSACTION_ROW_HEIGHT + columns(fontScale) - columns(1)))`. `columns(s)` is the taller of two columns, each line box `lineHeightFor(scaledFontSize(size, s))`: the content column (the larger of the title's and the `sm` badge's label box plus its unscaled chrome `2 * (2 + 1)`, then `TRANSACTION_ROW_LINE_GAP`, then the caption) and the value column (amount, the gap, code). The chrome becomes a named constant that `TRANSACTION_ROW_TITLE_BADGE_HEIGHT` reads too. The `TypeBadge` and the ownership label stay OS-scaled: neither truncates, and neither grows past linear. The row keeps its 1.0 space around its taller column, in whole device pixels; `TRANSACTION_ROW_HEIGHT` stays the 1.0 value. `TransactionRowBody` and `SkeletonRow` read `useWindowDimensions().fontScale` and set `height: resolveTransactionRowHeight(fontScale)`. The skeleton's four text bars pass their `lineHeightFor(...)` through `resolveSkeletonBarHeight`: twice their 1.0 box at 2.0, per Acceptance, within 1 dp of the loaded line. Its tile keeps `Size.accountTile`. `account_activity_card.tsx` mounts both and is not edited.
- Test: `first` · `__tests__/screens/transactions/transaction_row.helpers.test.ts`, in `transaction row line geometry`: `resolveTransactionRowHeight(1)` and `(0.85)` equal `TRANSACTION_ROW_HEIGHT`; at 2.0 both columns, each line at `lineHeightFor(scaledFontSize(size, 2))`, fit inside the height less the 1 dp separator; at 2.0 the space around the taller column equals the 1.0 space ± half a device pixel; with `PixelRatio.get` spied to 2.625 the heights at 1.3 and 2.0 are whole pixels. Jest's window `fontScale` is 2 (`node_modules/@react-native/jest-preset/jest/mocks/NativeModules.js:41`). The implementer moves these existing assertions to it:
  - `transaction_row.test.tsx:167` (row height) to `resolveTransactionRowHeight(Dimensions.get('window').fontScale)`;
  - `:174-177` (lead) and `:227-234` (amount, code) to `scaledTextStyle(<size>, Dimensions.get('window').fontScale)`, each with `allowFontScaling` false on the text's props;
  - in the long-note case (`:155-181`), two added assertions: the title (`Strings.uncategorized`) and the time text (`:178`, `/· \d{1,2}:\d{2} [AP]M$/`) each carry `allowFontScaling` false and `scaledTextStyle(TRANSACTION_ROW_TITLE_FONT_SIZE` or `TRANSACTION_ROW_CAPTION_FONT_SIZE, Dimensions.get('window').fontScale)`;
  - `transaction_rows_skeleton.test.tsx:42, 44-57, 88` to `resolveTransactionRowHeight(...)` and `resolveSkeletonBarHeight(lineHeightFor(...), ...)`.

  The tile assertion at `:36-39` stays.

### 3. The add and edit sheet's skeleton text bars grow with the font scale
- File: `src/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry.ts` (`TRANSACTION_FORM_SKELETON_GEOMETRY` :57-66); `transaction_form_loading.tsx` (:46, :80, :104, :108)
- Change: add `supportingBar: 12` to the geometry (the `h-3` bar at `transaction_form_loading.tsx:46`, a raw CSS value as `Size.typeTabsTrack` is) and export `resolveTransactionFormSkeletonBars(fontScale: number): { supportingBar: number; amount: number; keyBar: { width: number; height: number }; valueBar: { width: number; height: number } }`, each height through `resolveSkeletonBarHeight`, widths unchanged. `TransactionFormLoading` reads it for the supporting bar, the amount bar and each fact row's key and value bars. `tabBar` (MA-126) and `stripBar` (MA-129, #608) are not touched.
- Test: `first` · `__tests__/screens/transactions/transaction_form/transaction_form.geometry.test.ts`: at 1.0 the resolver returns the geometry's `amount`, `keyBar`, `valueBar` and 12; at 2.0 each height doubles and both widths stay.

### 4. Home's and Commitments' skeleton text bars, pills and listed row minimums grow with the font scale
- File: `src/modules/dashboard/screens/dashboard/components/stat_cards.tsx` (`NetWorthSkeleton`, `MonthSpendFooterSkeleton`, `StatCards` :263, :265), `transactions_card.tsx` (`TransactionsCardSkeleton`), `budget_card.tsx` (`BudgetCardSkeleton`), `commitments_card.tsx` (`CommitmentsCardSkeleton`), `hero_card.tsx` (`HeroCardSkeleton`); `src/modules/commitments/screens/commitments/components/summary_header.tsx` (`SummarySkeleton`), `commitment_rows_skeleton.tsx`
- Change: each skeleton component reads `useWindowDimensions().fontScale` and passes these heights through `resolveSkeletonBarHeight`. stat_cards: `:38`, `:40`, `:41`, `:42` (the footer row's minimum and its pill), `:142`, `:149`, and the two `h-5` bars at `:263, :265` as a raw 20 style height. transactions_card: `:37` (row minimum and bars), `:39` (row minimum), `:40`, the height at `:203`. budget_card: `:43`, `:48`, and `:29` at the skeleton's `:63` only (the loaded row's minimum at `:156` stays). commitments_card: `:34`, `:36` (row minimums), `:54`, `:59`, `:65`, `:102`. hero_card: `:23`, `:24` (the three pills and their row minimum). summary_header: `:46`, `:47`, `:49`, `:72`. commitment_rows_skeleton: `:22`, `:24`, `:28`, `:30` (`h-4`, `h-3`, `h-4`, `h-5` move to style heights 16, 12, 16, 20). Rails (`stat_cards.tsx:39`, `transactions_card.tsx:38`, `budget_card.tsx:28`, `commitments_card.tsx:35`, `summary_header.tsx:29`) and icon placeholders keep their size. The icon placeholders are `commitments_card.tsx:97`, `summary_header.tsx:71`, `commitment_rows_skeleton.tsx:19`, and the `ms(14)` by `ms(10)` bar at `transactions_card.tsx:195-199`, which sits where `DeltaValue` draws its unscaled `ms(12)` direction arrow (`:130-134`), the label bar at `:200-204` standing for the `text-[11px]` label (`:135-137`).
- Test: `after`.
  - Existing cases move to the jest window's scale through `resolveSkeletonBarHeight(ms(n), Dimensions.get('window').fontScale)`: `transactions_card.test.tsx:152-164` (values row, deltas row, previous label), `stat_cards.test.tsx:134-136` (footer row), `commitments_card.test.tsx:138-146` (summary and stats rows), `hero_card.test.tsx:132-135` (amount, pills row). Their rail assertions (`ms(3)`, `ms(5)`) stay and now hold at 2.0.
  - Two cases are added under the Render-suite policy: Acceptance 3 names the wiring, and each assertion binds to `ms()`.
    - `budget_card.test.tsx`: `dashboard-budget-skeleton-meta` reads `resolveSkeletonBarHeight(ms(13), fontScale)` and `dashboard-budget-skeleton-progress` reads `ms(3)`.
    - `summary_header.test.tsx`: in `SummarySkeleton`, the first three `skeleton-item` heights read `ms(6)`, `ms(14)`, `ms(14)` through the function, each stat value bar reads `ms(9)` through it, and each stat icon reads `ms(11)`.

### 5. The Budget skeleton's text bars and button, chip and pill shapes grow with the font scale
- File: `src/modules/budget/screens/budget/components/budget_screen_skeleton.tsx`
- Change: a file-local `ScaledBar({ height, className })` renders `SkeletonGroup.Item` with `style={{ height: resolveSkeletonBarHeight(height, useWindowDimensions().fontScale) }}`, `height` being the raw px its `h-*` class carried. Every `h-[Npx]` text bar, `h-4 w-14` (:299), `h-5 w-16` (:402), the three `ColdContentSkeleton` bars (:459-468, `Type.body` and `Type.caption`), and the shapes `h-9` (:102, :103, :232), `h-8` (:233), `h-10` (:256), `h-7` (:171, :340), `h-[38px]` (:370), `h-6 w-14` (:397), `h-[30px]` (:415) become a `ScaledBar`: the `h-*` class is dropped, the rest of the class kept, a ternary picks the height. These keep their class: rails `h-1` (:71, :183, :346, :411); icons `h-4 w-4` (:92, :195, :227, :302, :361), `h-16 w-16` (:111, :377), `h-8 w-8` (:134, :265), `h-11 w-11` (:321), `h-6 w-6` (:423); rings (:217, :243, :290, :314, :456); every `min-h-*` row.
- Test: `none` · the bars' 1.0 heights are raw literals no token binds, so the Render-suite policy admits no case. `budget_screen.test.tsx` mocks the module. `fifty_thirty_twenty_ledger.test.tsx:243-256` renders the real skeleton (`fiftythirty`, `preserveLayout`, Needs expanded) and asserts testIDs only, so it stays green; the implementer runs it. The arithmetic is step 1's; pixels are `budget.md` `skeleton, large font`.

### 6. The budget rows' status and share chips grow with their label
- File: `src/modules/budget/screens/budget/components/category_budget_row.tsx:65`, `named_budget_row.tsx:54`, `fifty_thirty_twenty/rule_bucket_row.tsx:72`
- Change: the chip's `h-5` becomes `min-h-5`. At 1.0 the label's line box (`lineHeightFor(Type.chipMeta)`, 10) sits under the 20 minimum, so the chip renders as today; at 2.0 the label's line box equals the 20 dp box with no room for pixel rounding inside HeroUI's `chip__root` `overflow: hidden`, and past 2.0 (iOS) it is taller. The chip stops being a fixed box, so Rule 2's geometry function has nothing to size.
- Test: `none` · a class-string assertion is audit M35; pixels are `budget.md` `lens walk, large font`.

### 7. The feature files carry the large-font states the walk runs
- File: `.claude/skills/emulator-verify/features/transactions.md`, `account_detail.md`, `transaction_form.md`, `dashboard.md`, `commitments.md`, `budget.md` (§ States)
- Change: append the twelve rows marked new under Screens, each `no frame, MA-127`, with the force and proof written there.
- Test: `none` · docs.

## Screens
Every new row below is `no frame, MA-127`; "Font scale" is the README's `Font scale` force. A walk crop's proof is Acceptance 2's: no text in a row, a card or a chip cut at the top or bottom, and no text box from `mqa bounds` crossing another node's box. Only the transaction-row states also require each line whole or ending in a whole `…` (Acceptance 1). A skeleton log is a temporary `onLayout` on the named items that logs `e.nativeEvent.layout.height`, read with `mqa logs --info` at 1.0 and 2.0 and reverted with `git status` clean after, as `transaction_form.md` `loading, large font` does. Its proof: each text bar and shape at 2.0 reads twice its 1.0 height ± 1 dp, each rail, icon or ring its 1.0 height ± 1 dp.

- `emulator-verify/features/transactions.md`: `row, expense`, `row, long note`, `day cards, skeleton`, and new:
  - `row, large font`: the `row, expense` and `row, long note` seeds plus a commitment-owned row (the `type badge, sm` force); Font scale at 1.0 and 2.0 · the row's clickable node reads 63 ± 1 dp at 1.0 and `resolveTransactionRowHeight(2)` ± 1 at 2.0, the title, caption, amount and code `TextView` boxes inside it; a crop of each row at 2.0: each line whole or ending in a whole `…`, none cut at the top or bottom
  - `day cards, skeleton, large font`: the `day cards, skeleton` force; Font scale at 1.0 and 2.0 · a shot pair at 2.0, skeleton and (force reverted) loaded day cards: each skeleton row as tall as a loaded row, its bars as tall as the lines they stand for, the tile unchanged; the 1.0 shot matches `day cards, skeleton` on `main`
  - `list walk, large font`: Font scale at 2.0, once on an empty database and once on the `day headers, all accounts` seed with a commitment-owned row · crops of every row, card and chip, scrolled to the end
- `emulator-verify/features/account_detail.md`: `activity row, tile off`, `activity loading`, and new:
  - `activity row, large font`: the `activity row, tile off` seed; Font scale at 1.0 and 2.0 · the row reads 63 ± 1 dp at 1.0 and `resolveTransactionRowHeight(2)` ± 1 at 2.0, its text boxes inside it; a crop at 2.0: each line whole or ending in a whole `…`, none cut at the top or bottom
  - `activity loading, large font`: the `activity loading` force; Font scale at 2.0 · a shot pair, skeleton and loaded card: skeleton rows as tall as loaded rows, bars as tall as the lines they stand for
- `emulator-verify/features/transaction_form.md`: `loading`, `loading, large font`, and new:
  - `loading bars, large font`: the `loading` force; Font scale at 1.0 and 2.0 · a skeleton log on the supporting bar (`transaction_form_loading.tsx:46`), the amount bar (`:78-81`) and the first key bar (`:102-105`); shots (Gotchas): each fact row still one bordered row, the strip bars and tab shape as `loading, large font` states; the 1.0 shot matches `loading` on `main`
- `emulator-verify/features/dashboard.md`, new:
  - `cards walk, large font`: Font scale at 2.0, once on an empty database with onboarding complete and once on the `add button clearance, populated` seed, on `Overview` and on `Accounts` · crops of the hero, both stat cards and the Transactions, Budget and Commitments cards on `Overview`; on `Accounts`, the balance strip, each section header with its count pill and each account card, scrolled to the end
  - `skeletons, large font`: source force in `dashboard.store.ts:79`, `repositoryRequest = new Promise<DashboardSnapshot>(() => undefined);` in place of the `getSnapshot` call, reverted with `git status` clean after; Font scale at 1.0 and 2.0 · a skeleton log on `dashboard-hero-skeleton-amount`, the first `dashboard-hero-skeleton-pill` and `dashboard-net-worth-skeleton-progress`; a shot of `Overview` at each scale and one loaded at 2.0; the 1.0 shot matches the same force on `main`
- `emulator-verify/features/commitments.md`, new:
  - `list walk, large font`: Font scale at 2.0, once on an empty database and once on the `row status pill` seed · crops of the summary card and every row, scrolled to the end
  - `skeletons, large font`: source force `await new Promise<never>(() => undefined);` as the first line of the `try` in `loadMonthSnapshot` (`commitment.store.ts:172`), reverted after; Font scale at 1.0 and 2.0 · a skeleton log on the first row's title bar (`commitment_rows_skeleton.tsx:21-23`), its status pill (`:30`) and its icon square (`:19`); a shot at each scale and one loaded at 2.0; the 1.0 shot matches `main`
- `emulator-verify/features/budget.md`, new:
  - `lens walk, large font`: Font scale at 2.0, once on an empty database and once on a seed that draws all three lenses: a category budget holding a named budget, an income for the `50/30/20` buckets, and the spending plans of the `plan card status chip`, `plan card 'more' chip` and `plan card allocation chip` rows · crops of the summary card, each category row with its chip, an expanded category's named-budget row, each `50/30/20` bucket row, and on `Plans` each plan card with its status, 'more' and allocation chips, each chip label inside its chip
  - `skeleton, large font`: source force `await new Promise<never>(() => undefined);` as the first line of the `try` in `load` (`budget.store.ts:195`), reverted after; Font scale at 1.0 and 2.0; each of the three lenses (the lens tabs stay live) · a skeleton log on the categories summary's title bar (`budget_screen_skeleton.tsx:58`), a tool shape (`:102`) and a `ColdContentSkeleton` ring (`:454-457`); a shot per lens per scale; the 1.0 shots match `main`

## Non-goals
- Everything the ticket's Out of scope names: tab bar and bottom space (MA-125), search field, filter badge, rails, month pill, lens tabs and buttons (MA-126), the day cards' header and its skeleton row (MA-092, MA-132), the sheet's `tabBar` and `stripBar`, off-tab skeletons (MA-128, MA-129).
- No base font size changes (the row's texts keep their tokens, scaled in JS above 1.0), and no class-sized text moves to a `Type` token: `commitment_row.tsx:108, 111, 116`, `stat_cards.tsx:273, 365`, `transactions_card.tsx:90`, `budget_card.tsx:188`, `summary_header.tsx:99` each sit in an auto-height box. `commitment_row.tsx` leaves the ticket's `Size:` list.
- The ellipsis drawn past a truncated line's right edge above 1.0 on OS-scaled texts other than the transaction row (`stat_cards.tsx:271-285, 365, 393, 411`, `budget_card.tsx:188`, `commitment_row.tsx:108`, others like them). Acceptance 2 asks only that no text is cut at the top or bottom or drawn over another node.
- Skeleton row minimums the ticket does not list keep today's value: `summary_header.tsx:28, 30`, `budget_card.tsx:27`, the budget skeleton's `min-h-*` rows, the sheet skeleton's `min-h-8` and `ms(80)` wrappers.
- No token swap for the raw px values moved out of classes, no shared skeleton component in `src/components/ui/`, no new `.tsx` test file.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-128 (#607) may merge first with the shared function under another name or signature; the rebase takes its name.
- MA-123 (#598) and MA-129 (#608) touch `transaction_form.geometry.ts` and `transaction_form_loading.tsx`, MA-108 (#573) the dashboard cards and summary header, MA-130 (#609) `rule_bucket_row.tsx`: rebases.
- On Android 14 OS-scaled text grows less than 2× at 2.0 (MA-121 measured 46.1 dp of hero text against 77.7 dp reserved), so on Home, Commitments and Budget the doubled bars stand taller than the loaded lines. Acceptance 3 rules the doubling; the transaction row escapes this because it scales its own text.
- A cut the 2.0 walk finds at a site this plan leaves unedited is a discrepancy: amend with one step for that site.
- A reviewer may read the raw heights moved out of `h-*` classes (steps 3 to 5) as hardcoded values; each is the class's value moved verbatim, which the 1.0 Acceptance line requires.
- Amended after review round 1, for findings 1 to 8 and the conductor's call on finding 6:
  - step 1 scales linearly;
  - step 2 scales the row's own text (ADR §7);
  - step 4 keeps the direction-icon bar and adds the `budget_card` and `summary_header` cases;
  - step 5 names the ledger suite;
  - Screens word the walk proof as Acceptance 2, walk Home's `Accounts` and Budget's `Plans`, and measure the skeletons by log;
  - Non-goals follow step 2.
- Amended after review round 2: step 2 asserts the title and time text's scaled style, step 5 names `:370` and `:415` among the shapes, and step 7 counts twelve rows.

## Self-assessment
Step 5 is the one I am least sure of:
- It edits about 70 sites in one 473-line file.
- The split between bars that grow and icons that stay is partly my reading. The ticket lists the rings and the shapes, not the `h-4 w-4`, `h-8 w-8`, `h-11 w-11` and `h-6 w-6` icons.
- No test binds its heights. The ledger suite renders the expanded 50/30/20 branch for structure only.
- The render lens reaches only the cold variant of each lens, because `index.tsx:153` passes `preserveLayout={false}`. So the named-row and plan-card skeleton branches change without a device look.
- Its ~90 lines are the least firm figure in the count.

Step 2's switch of five row texts to `allowFontScaling={false}` is the next least sure: it follows MA-121's measured pattern, but it is the first row-level use of it.
