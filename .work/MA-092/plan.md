# MA-092 — Day cards: one card per day with the day net and count
base: 10b1540f06d8d699fa269d5a6154e145bb158a94 · verify: emulator · flags: money path, user copy · expected diff: ~330 lines

Lines per file outside tests: `transactions.helpers.ts` 82, `group_transactions_by_date.ts` 17, `transactions.hook.ts` 22, `index.tsx` 16, `day_header.tsx` 98 (new), `transactions_text.geometry.ts` 20, `date_header.tsx` 14, `strings.ts` 11, `features/transactions.md` 13, `features/commitments.md` 1, the ADR 36. 11 files, the ticket's `Size:` list. The sum is 330, under the ~400 gate; 6 steps.

## Steps

### 1. A section carries its date as the key and the approved label beside it
- File: `src/utils/group_transactions_by_date.ts` (`TransactionSection`, `groupTransactionsByDate`, `labelFor`), `src/constants/strings.ts` (`todayLabel`, `yesterdayLabel`, `:943-944`), `src/modules/transactions/screens/transactions/index.tsx` (`renderSectionHeader`, `:85-90`), `src/modules/transactions/screens/transactions/transactions.hook.ts` (`TransactionSection`, `:52`)
- Change: `TransactionSection` becomes `{ key: string; label: string; data: Transaction[] }`, `key` the row's `transaction_date` (`YYYY-MM-DD`), signature `groupTransactionsByDate(txs: Transaction[], now?: Date): TransactionSection[]` unchanged. `label` is `Strings.todayLabel`, `Strings.yesterdayLabel`, else `<Ddd> <d> <Mmm>`, and `<Ddd> <d> <Mmm> <yyyy>` when the date's year is not `now.getFullYear()` (ruling 3, 2026-09-28): weekday from `new Date(`${date}T12:00:00`).toLocaleDateString('en-US', { weekday: 'short' })`, month from `MONTHS_SHORT` in `@/utils/year_month`, the file's own `MONTHS` removed. The two strings become `'Today'` and `'Yesterday'` (canvas Copy note); the header's `uppercase` class draws the capitals. `index.tsx` passes `section.label` where it passed `section.key`. The hook's own `TransactionSection` at `:52` becomes the util's type, imported and re-exported under the same name, so `index.tsx:28` and `listRef` at `:68` read `label`.
- Test: `first` · `__tests__/group_transactions_by_date.test.ts`: with `now` 2026-05-01, `2026-05-01` gives key `2026-05-01` label `Today`; `2026-04-30` gives `Yesterday`; `2026-04-15` gives `Wed 15 Apr`; `2025-12-14` gives `Sun 14 Dec 2025`; `2025-12-31` with `now` 2026-01-01 gives `Yesterday`, the word alone across the year boundary; `2025-12-30` with `now` 2026-01-01 gives `Tue 30 Dec 2025`; a second page appended to the input adds its rows to the existing section of the same date and opens a new section for a new date; the old `TODAY · MAY 1` cases are replaced. The section fixtures at `__tests__/screens/transactions.screen.test.tsx:261` and `:342` gain `label`.

### 2. The day header's sizes come from one geometry function
- File: `src/modules/transactions/screens/transactions/components/transactions_text.geometry.ts`
- Change: add `export interface DayHeaderGeometry { fontSize: number; lineHeight: number; pillHeight: number; height: number }` and `export function resolveDayHeaderGeometry(fontScale: number): DayHeaderGeometry`. `fontSize = scaledFontSize(Type.caption, fontScale)` with no cap, `lineHeight = lineHeightFor(fontSize)`, `pillHeight = lineHeight + 2 * Spacing.xxxs`, `height = Spacing.md + pillHeight + Spacing.xs`.
- Test: `first` · `__tests__/screens/transactions/transactions_text_geometry.test.ts`: at 1.0, 1.3 and 2.0 the four fields equal the expressions above built from `Type.caption`, `Spacing` and `lineHeightFor`.

### 3. Day sections are built from the aggregate, never from the rows
- File: `src/modules/transactions/screens/transactions/transactions.helpers.ts` (beside `buildSearchTally`, reusing the private `formatSignedNet` and `HERO_CURRENCY`), `src/constants/strings.ts` (beside `transactionsTallyResults`, `:1267-1270`)
- Change: add
  ```ts
  export type DayHeaderFigures =
    | { mode: 'skeleton' }
    | { mode: 'failed'; net: string }
    | { mode: 'figures'; net: string; currencyCode: string; count: string };
  export interface TransactionDaySection {
    key: string;
    label: string;
    figures: DayHeaderFigures;
    accessibilityLabel: string;
    data: Transaction[];
  }
  export type DayHeaderSpoken =
    | { mode: 'skeleton' }
    | { mode: 'failed' }
    | { mode: 'figures'; netEgp: number; count: number };
  export function composeDayHeaderAccessibilityLabel(label: string, spoken: DayHeaderSpoken): string;
  export interface DaySectionsInput {
    groups: readonly TransactionSection[];
    days: readonly TransactionDayAggregate[] | undefined;
    figuresMode: TransactionsHeroMode;
    totalsStatus: TransactionTotalsStatus;
  }
  export function buildDaySections(input: DaySectionsInput): TransactionDaySection[];
  ```
  One section per group, in the groups' order, `key`, `label` and `data` passed through. `figuresMode` `skeleton` gives `{ mode: 'skeleton' }` on every day; `dashes` gives `{ mode: 'failed', net: Strings.transactionsHeroUnavailable }`; `figures` looks the day up in `days` by `date === key` and gives `net` from `formatSignedNet(day.netEgp).text`, `currencyCode` `CURRENCY_CONFIG[HERO_CURRENCY].code`, `count` `formatAmount(day.count)`. A day `days` lacks (or `days` undefined) under `figures` reads `failed` when `totalsStatus` is `firstLoadError` or `refreshErrorWithData`, else `skeleton` (rulings 1 and 2, 2026-09-28); it never reads `0 EGP`. No sum over `data` anywhere. Each section's `accessibilityLabel` is `composeDayHeaderAccessibilityLabel(label, spoken)` with `spoken` in the mode `figures` resolved to (ruling 4, 2026-09-28). The strings, all new: `transactionsDayLoadingA11y: (day) => `${day}, loading``, `transactionsDayFailedA11y: (day) => `${day}, total unavailable``, `transactionsDayFiguresA11y: (day, net, count) => `${day}, ${net}, ${count} transactions``, `transactionsDayOneTransactionA11y: (day, net) => `${day}, ${net}, 1 transaction``, `spokenMinus: 'minus'`, `spokenPlus: 'plus'`. `net` is the sign word, the magnitude from `formatDisplayMagnitude(netEgp, HERO_CURRENCY).text` and `CURRENCY_CONFIG[HERO_CURRENCY].code`, space separated; `printsAsZero` drops the sign word; `count` is `formatAmount(count)` and `count === 1` picks the singular. No sign glyph reaches the label.
- Test: `first` · `__tests__/screens/transactions/transactions_helpers.test.ts`, `describe('buildDaySections')`: a group holding 1 row against an aggregate day `{ netEgp: -984, count: 3 }` reads `−984` (U+2212), `EGP`, `3`; `netEgp: 0, count: 1` reads `0` with no sign; `netEgp: 14300` reads `+14,300`; `netEgp: -1234.56` reads `−1,235`; `skeleton` and `dashes` modes on every day, the failed one with no `count` field; a missing day under `figures` reads `skeleton` at `ready` and `refreshing`, `failed` at `refreshErrorWithData`; order and `data` identity kept. `describe('composeDayHeaderAccessibilityLabel')`: `Yesterday` with `-984` and `3` reads `Yesterday, minus 984 EGP, 3 transactions`; `Today` with `-85` and `1` reads `Today, minus 85 EGP, 1 transaction`; `14300` and `2` reads `plus 14,300 EGP`; `0` and `1` reads `Today, 0 EGP, 1 transaction` with no sign word; `Today` with `-0.4` and `1` reads `Today, minus 0.40 EGP, 1 transaction`, the magnitude escalated to 2 dp as the drawn `−0.40` is; `-0.004` reads `0.00 EGP` with no sign word; `skeleton` reads `Yesterday, loading`; `failed` reads `Yesterday, total unavailable`; `Sun 14 Dec 2025` leads its label unchanged; no label holds U+2212, `+` or `—`. In `buildDaySections` each section's `accessibilityLabel` equals the helper's output for its mode.

### 4. The hook publishes day sections gated on the held query key
- File: `src/modules/transactions/screens/transactions/transactions.hook.ts` (`TransactionSection` `:52`, `sections` `:410-413`, `appliedFilterSummary` `:415-418` and `:629`, `tallyFiguresMode` `:493-497`), `src/modules/transactions/screens/transactions/index.tsx` (`renderSectionHeader`, `:87` and `:89`)
- Change: `sections` becomes `buildDaySections({ groups: groupTransactionsByDate(currentTransactions), days: displayTotals?.days, figuresMode: tallyFiguresMode, totalsStatus: displayTotalsStatus })`, memoised on those four inputs and declared after `tallyFiguresMode`. `export type TransactionSection = TransactionDaySection` replaces step 1's re-export and keeps the name `index.tsx` and `listRef` import. `appliedFilterSummary` leaves the memo list and the returned state; `tallyFilterSummary` stays. `index.tsx` drops `contextLabel={state.appliedFilterSummary}` and the callback's dependency on it in this step; `DateHeader`'s prop is optional until step 5 removes it. The scroll refs and effects at `:272-320` are untouched.
- Test: `first` · `__tests__/screens/transactions/transactions_hook.test.ts`: with `getMonthAggregate` serving `days: [{ date: TRANSACTION.transaction_date, netEgp: -450, count: 3 }]`, `state.sections[0].figures` reads `figures`, `−450`, `3`; after a search change whose aggregate is pending it reads `skeleton`, and `failed` once that load rejects; on a first-load rejection it reads `failed`. The two `state.appliedFilterSummary` assertions go: `:293` (MA-062) asserts `state.hero.title` equals `Strings.transactionsHeroTitleScoped(Strings.unnamedAccount)`, `:1697` is deleted. `__tests__/screens/transactions.screen.test.tsx:130` drops the field from its base state and its section fixtures at `:261` and `:342` gain `figures` and `accessibilityLabel`. The existing guard `__tests__/screens/transactions/transactions_hook.test.ts:902-972` stays green and unedited: it asserts `scrollTo({ y: 0, animated: false })` on a query change at `:972` and the restore at `:944`, the Acceptance line on the list's position.

### 5. The list renders the day header; the context label is gone
- File: `components/day_header.tsx` (new), `src/modules/transactions/screens/transactions/index.tsx` (`renderSectionHeader`, import `:18`), `components/date_header.tsx` (`Props`, `:27-36`)
- Change: `DayHeader({ section }: { section: Pick<TransactionDaySection, 'label' | 'figures' | 'accessibilityLabel'> })`, memoised, reads `resolveDayHeaderGeometry(useWindowDimensions().fontScale)`. Root `View`: `accessible`, `accessibilityLabel={section.accessibilityLabel}`, so the header reads as one item (ruling 4), `bg-background`, fixed `height`, `paddingHorizontal: Spacing.md`, `paddingTop: Spacing.md`, `paddingBottom: Spacing.xs`, row, centred, the same height in all three modes. Label: `font-inter-semibold text-muted tracking-wide uppercase`, `flex: 1`, `minWidth: 0`, one line. Right group `flexShrink: 0`, gap `Spacing.xs`: `skeleton` draws one `Skeleton` bar `ms(70)` wide at `lineHeight`; `failed` draws the net alone; `figures` draws `<net> <currencyCode>` in `font-sora text-content-secondary tabular-nums` and the pill (`rounded-full`, `Colors.dark.goldTint`, padding `Spacing.xxxs` by `Spacing.xs`, label `font-sora-bold` in `Colors.shared.cairoGold`). Every `Text` takes `allowFontScaling={false}`, `fontSize` and `lineHeight` from the geometry. `SectionHeader` is not reused: it has no net slot, no app-side scaling and no opaque background for pinning. `index.tsx` renders `<DayHeader section={section} />`; `renderItem` and `stickySectionHeadersEnabled` stay as they are. `DateHeader` loses the `contextLabel` prop step 4 stopped passing and keeps its name, its `label` branch untouched for `commitments/index.tsx:125`.
- Test: `after` · `__tests__/screens/transactions.screen.test.tsx:94` mocks `components/day_header` (`DayHeader`) where it mocked `date_header`; `__tests__/screens/transactions/date_header.test.tsx` drops its `contextLabel` case. New component tests: `none`, render tests are not added; the header's text is asserted through step 3's model.

### 6. The decision record and the emulator states exist
- File: `docs/adr/2026-09-28-transactions-day-cards.md` (new), `.claude/skills/emulator-verify/features/transactions.md`, `.claude/skills/emulator-verify/features/commitments.md`
- Change: the ADR records the decisions under Decision record and cites the four rulings of 2026-09-28 by subject. The features file gains the States rows listed under Screens, replaces `date header` with `day header` in `search tally, empty slot`, drops the context-label clause from `search tally, large font`, and rewrites the Gotchas line at `:67` to name `DayHeader`. The commitments features file gains the one States row listed under Screens.
- Test: `none` · docs; `npm run lint` checks the banned phrases in the three files.

## Screens
- `emulator-verify/features/transactions.md`: row, expense; row, USD expense; row, transfer; row, card payment; row, card credit; row, deleted counterparty; row, archived account; hero, empty month; hero, credits exceed expenses; account chip on; page two after a detail round-trip; search tally, empty slot; search tally, large font
- `emulator-verify/features/account_detail.md`: bank with recent activity; activity loading
- States the file lacks, appended by step 6:
  - `day headers, all accounts`, A1: headers read `TODAY`, `YESTERDAY`, `<DDD D MMM>` in the shot; `mqa ui` reads each header as one node whose content-desc is `<label>, minus <n> EGP, <k> transactions`, `1 transaction` on a one-row day; each net and count equals the `mqa db` day sum under the ledger rule and the day's row count; header bounds 16 above and 8 below a pill of `lineHeightFor(msFont(12))` + 4; one shot.
  - `day headers, one account`, A2: a chip on; a day whose only row is a transfer or a card payment reads `0 EGP` and its count; each day holds that account's rows only.
  - `day header, straddles a page`, no frame: seed 45 expenses so rows 28 to 33 share one date; before any scroll that day's net and count equal the `mqa db` figures for all six rows; after load more the header reads the same over the day's six rows; two shots.
  - `day header, figures loading`, no frame: the `hero, skeleton` source force with rows loaded; one bar in each header's right group, the header's height measured on the shot equal to its height on the `day headers, all accounts` shot; one full shot, since `mqa ui` returns nothing while it shimmers; the `<label>, loading` content-desc is proven by step 3's test, not on the device.
  - `day header, figures failed`, no frame: the `hero, figures failed` first-load throw; each header reads the dash alone, no `EGP` and no pill node; its content-desc reads `<label>, total unavailable`.
  - `day header, another year`, no frame: a seeded expense dated `2025-12-14`, the month pill to December 2025; the header reads `SUN 14 DEC 2025` on one line beside its net and pill, content-desc `Sun 14 Dec 2025, minus <n> EGP, 1 transaction`; one shot.
  - `day header, pinned`, no frame: scroll until a day's third row is at the top; the header's top bound equals the list's top bound and no row pixel shows through it; one shot.
  - `day headers, zero-income month`, no frame: a month with expenses and no income; every day net is negative with U+2212.
  - `day headers, large font`, no frame: `font_scale` 2.0 and a cold launch; label, net and pill text boxes sit inside the header, the header reads `resolveDayHeaderGeometry(2).height` ± 1, a truncated label ends in a whole `…`; a header crop.
- `emulator-verify/features/commitments.md`: one state the file lacks, appended by step 6:
  - `date header`, no frame: any seeded commitment; each group header holds the label alone, its `TextView` bounds ÷ 2.625 read 14 ± 1 high; one shot.

## Decision record
- `docs/adr/2026-09-28-transactions-day-cards.md`: the day net and count are the month aggregate's `days` entry for the section's date, printed only when `totals.queryKey` is the query on screen (`resolveSearchTallyFiguresMode`), a day the held aggregate lacks reads skeleton or, after a failed load, the dash, never `0 EGP` (ruling 1); the net is `formatSignedNet` at EGP 0 dp in `text-content-secondary`, polarity by sign alone; the failed dash prints no currency code and no pill (ruling 2); a day outside the current year carries the year (ruling 3); the header is one accessibility item whose label a pure helper composes, the sign spoken (ruling 4); the header scales its own text uncapped. Step 6 adds the file.

## Non-goals
- The row's content, tiles, caption and amounts (MA-090).
- The hero, tabs, chips and tally (MA-091); `formatAppliedFilterSummary` and `tallyFilterSummary` stay as they are.
- Empty, error and delete states, toasts, the `Nothing recorded in <Month>` empty state (MA-093).
- Keeping loaded pages across a round-trip (MA-089); the scroll restore code is not edited.
- The skeleton day cards while the month loads, frame A6 (MA-131, #612): `TransactionRowsSkeleton` keeps its props, `showDateHeader` included, and `account_activity_card.tsx` and `index.tsx:148` are not edited.
- One card per day around the rows, its separators and the transfer ring in the card surface, frame A1 (MA-132, #613): `renderItem`, `transaction_row.tsx` and `transaction_row.helpers.ts` are not edited, `TRANSACTION_ROW_DUAL_RING_COLOR` stays `CoreTokens.bg`, and no `day_card_row.tsx` is added.
- Any query, repository or store change; `totals.days` is read as loaded.
- A count noun drawn in the pill, an `accessibilityRole` or a hint on the header: the ruling approves the label alone.
- FlashList, `getItemLayout`, one-cell-per-day sections, a change to `ListCard` or `SectionHeader`.
- A day net in USD, colour by polarity on the day net.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- With `accessible` on the header root, the child text nodes may leave the `mqa ui` dump; the new states read the content-desc and take the capitals from the shot.
- Amended 2026-09-28 for the four rulings and review round 2: the year on the label (step 1), the composed accessibility label (steps 3, 5), the scroll guard named (step 4).
- Amended 2026-09-28 for the trim at ~410 lines: the card slices left for MA-132 (#613), the old step 5 and the `renderItem` wrap; the steps after it are renumbered and the count is ~330.
- After a write, the rows update before the aggregate reloads, so a day's count lags its rows until the reload lands, as the tally's does.
- `toLocaleDateString` with `weekday: 'short'` relies on Hermes Intl, the same dependency `fullMonthName` has (`transactions.helpers.ts:293`).
- `__tests__/screens/transactions.screen.test.tsx:207` reads `index.tsx` as text; the three names it bans stay out of the template.

## Self-assessment
Step 5's `accessible` root is the one I am least sure about: how the header's child text nodes appear in `mqa ui` once the root carries the label is unproven until the emulator pass, and the Screens proofs lean on the content-desc for that reason. The header's fixed `height` at font scale 2.0 is the second weak point, a label, a net and a pill on one 411 dp line, and only the `day headers, large font` state shows whether the label truncates cleanly. Step 3's rule for a day the held aggregate lacks is settled by rulings 1 and 2.
