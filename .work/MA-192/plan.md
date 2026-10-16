# MA-192 — Detail hero amount in its own currency, with the Amount in EGP and Amount in USD rows
base: a23d3b9ef70e037bc7b2e1b082a77b4746b58de8 · verify: emulator · flags: money path, user copy · expected diff: ~100 lines

## Steps

### 1. One function picks the amount row from the transaction alone, and the skeleton keys its slot on it
- File: `src/modules/transactions/screens/transactions/detail/components/detail.geometry.ts` (`buildDetailSkeletonGeometry`, `:135-157`; the Original amount slot at `:147`)
- Change: export `interface DetailAmountRowFigure { amount: number; currency: Currency }`, both fields required and never null, and `resolveDetailAmountRowFigure(transaction: Transaction): DetailAmountRowFigure | undefined`, one required argument, returning `undefined`, never `null`, when there is no row. It returns `{ amount: transaction.egp_amount, currency: Currency.EGP }` when `transaction.currency === Currency.USD`, whether or not a rate is stored. It returns `{ amount: transaction.to_amount, currency: Currency.USD }` when the currency is EGP, `requiresDestination(transaction.type)` holds (`src/modules/transactions/domain/transaction_amounts.ts:25`), `exchange_rate !== null` and `to_amount !== null`. Otherwise it returns `undefined`. The slot at `:147` is present when it returns a figure; the rate slot at `:148` does not change. It lives here, not in `detail.helpers.ts`, because helpers import geometry and not the reverse (`src/modules/onboarding/screens/onboarding/ready/ready.helpers.ts:18`). Facts: a rate is stored only when USD is involved (`transaction_amounts.ts:141`), and for an EGP source `to_amount` is the USD leg (`:147-153`).
- Test: `first` · `__tests__/screens/transactions/detail/detail.geometry.test.ts`, at rate 49, via `makeTestTransaction`:
  - `resolveDetailAmountRowFigure` returns `{ 735, EGP }` for a USD 15 expense with the rate, and the same with `exchange_rate: null`.
  - It returns `{ 4_900, EGP }` for a USD 100 transfer to EGP (`to_amount` 4,900) and to USD (`to_amount` 100), and for a USD card payment.
  - It returns `{ 102.04, USD }` for an EGP 5,000 transfer and an EGP 5,000 card payment, each with `to_amount` 102.04.
  - It returns `undefined` for an EGP to EGP transfer (`exchange_rate` null), an EGP expense, an EGP transfer at rate 49 with `to_amount: null`, and a commitment's EGP payment (Expense, `exchange_rate` 49, `to_amount` null, `commitment_payment_id` set).
  - `buildDetailSkeletonGeometry(…, 2).rowHeights` reads six heights for the EGP to USD transfer, five at base, so the case fails at base. It reads five for the commitment's payment, Rate slot included, Amount slot not.

### 2. The hero prints the transaction's own amount in its own currency
- File: `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` (`heroAmount`, `:164-179`; `DETAIL_HERO_CURRENCY`, `:88`)
- Change: `heroAmount(tx)` formats `tx.amount` in `tx.currency` through `formatDisplayAmountParts`, with the code `CURRENCY_CONFIG[tx.currency].code`; the sign rule does not change. `DETAIL_HERO_CURRENCY` is removed. `TransactionDetailHero` keeps its fields: `amountValue`, `amountCode` and `amountAccessibilityLabel` are required, non-null strings.
- Test: `first` · `__tests__/screens/transactions/detail/detail_helpers.test.ts`:
  - A USD 15 expense (`egp_amount` 735) heroes `amountValue` `−15.00`, `amountCode` `USD` and `amountAccessibilityLabel` `−15.00 USD`.
  - A USD 100 transfer to EGP and a USD 100 card payment hero `100.00` `USD`, unsigned.
  - For expense, income, card credit, and transfer and card payment on all four currency pairs, `hero.amountValue` equals `buildTransactionRowPresentation(input).primaryAmount` (`../components/transaction_row.helpers.ts:245`).
  - Rewrite the three cases at `:237-264`, which feed a USD transaction an `egp_amount` and read it in the hero. Use the same magnitudes on an EGP transaction: 0.4 reads `−0.40`, 0.6 reads `−1`, and an EGP 4,850 transfer reads `4,850`.

### 3. The Amount in EGP or Amount in USD row takes the Original amount row's place
- Files: `src/constants/strings.ts` (`detailOriginalAmount`, `:952`); `src/modules/transactions/screens/transactions/detail/detail.helpers.ts` (`originalAmountText`, `:129` and `:228-229`); `src/modules/transactions/screens/transactions/detail/index.tsx` (`:100-106`)
- Change:
  - Strings: remove `detailOriginalAmount`, whose only reader is `index.tsx:103`. In its place add `detailAmountInEgp: 'Amount in EGP'` and `detailAmountInUsd: 'Amount in USD'`.
  - Helpers: `TransactionDetailPresentation.originalAmountText?: string` becomes `amountRow?: DetailAmountRowText`. The field is optional and absent, never `null`, when there is no row. `interface DetailAmountRowText { label: string; value: string }`, both required and non-null.
  - The row is built from `resolveDetailAmountRowFigure(tx)` (step 1). The label is `detailAmountInEgp` for EGP and `detailAmountInUsd` for USD. The value is `formatDisplayAmount(figure.amount, figure.currency)`, unsigned with its code. The `formatCurrencyAmount` import goes.
  - Index: the row at `:100-106` reads `detail.amountRow.label` and `.value`. It keeps `icon="currency-usd"` and its slot above the Rate row; `DetailRow` does not change.
  - Facts: a converted leg prints through `formatDisplayAmount`, so USD 0.01 at 49 reads `0.49 EGP` (`docs/adr/2026-10-13-converted-amount.md` §3). `currency-usd` is the icon the commitments' Currency row draws for either currency (`src/modules/commitments/screens/commitments/detail/components/details_card.tsx:47`).
- Test: `first` · `__tests__/screens/transactions/detail/detail_helpers.test.ts`. These cases replace the `originalAmountText` case at `:229-235`:
  - A USD 15 expense at rate 49 gives `amountRow` `{ label: 'Amount in EGP', value: '735 EGP' }`, with `exchangeRateText` kept. The same holds with `exchange_rate: null`.
  - USD 100 transfers and card payments, to EGP and to USD, read `4,900 EGP`.
  - An EGP 5,000 transfer and card payment, each with `to_amount` 102.04, give `{ label: 'Amount in USD', value: '102.04 USD' }`, both with `toAccount` given and with `toAccount` undefined.
  - `amountRow` is undefined for an EGP to EGP transfer and card payment, an EGP expense and an EGP income.
  - A commitment's EGP 735 payment at rate 49 has `amountRow` undefined, `exchangeRateText` `1 USD = 49.00 EGP`, and `hero.amountValue` `−735` with `amountCode` `EGP`.
  - USD 0.01 at 49 (`egp_amount` 0.49) reads `0.49 EGP`.

### 4. TypeBadge has one size, the row's
- Files: `src/components/ui/type_badge.tsx` (`:13`, `:17`, `:30-35`, `:49-57`, `:81-87`, `:89`, `:95`); `src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts` (comments at `:47` and `:49`)
- Change:
  - `TypeBadgeSize` and the `size` prop are removed. The `sm` arm becomes the only one: `px-2 py-[2px] gap-1` moves into `wrap`'s base, the label style is `Type.compactBadge` over `lineHeightFor(Type.compactBadge)`, the icon is 10 and the chrome width is `2 * (1 + 8) + 4`.
  - `resolveTypeBadgeMinWidth(fontScale: number): number` takes one required argument.
  - The callers at `transaction_row.tsx:190` and `:192` pass no size and do not change.
  - The two row-helper comments drop "`sm`".
- Test: `first` · new `__tests__/components/ui/type_badge.test.ts`, a logic `.ts` suite importing from the `.tsx`, as `__tests__/components/ui/chip.geometry.test.ts:1` does. At scales 1 and 2, `resolveTypeBadgeMinWidth(s)` equals `22 + 10 + scaledFontSize(Type.compactBadge, s)`, today's `sm` width, so a fold onto `md` fails the test.

### 5. The features files carry the new states and the folded badge
- Files: `.claude/skills/emulator-verify/features/transaction_detail.md` (`:3`, `:16`, after `:20`, `:29`, `:30`); `.claude/skills/emulator-verify/features/transactions.md` (`:127`); `.claude/skills/emulator-verify/features/README.md` (`:36`)
- Change, in `transaction_detail.md`:
  - `:3`: add C5 to the frame list. The hero amount follows the transaction's own currency, and the Amount in EGP and Amount in USD rows replace the Original amount row, since MA-192.
  - `:16` `transfer`, on the EGP to USD seed of `transactions.md:23`: add `AMOUNT IN USD` reading `<to_amount> USD`, unsigned, in the row above `EXCHANGE RATE`; `AMOUNT IN EGP` reads `no match`.
  - New row after `:20`, `USD expense` (frame `C5, MA-192`). Force: the `row, USD expense` seed of `transactions.md`, opened by `mqa open /transactions/detail/<id>`. Proof: the amount node reads `−<n.nn> USD`; `AMOUNT IN EGP` reads `<egp> EGP`, unsigned, the figure of the row's `≈` line; `EXCHANGE RATE` reads with `Captured`; `ORIGINAL AMOUNT` reads `no match`; one shot.
  - New row after `:20`, `transfer from a USD account` (`no frame, MA-192`). Force: seed push a USD to EGP transfer with `exchange_rate` set. Proof: the amount node reads `<n.nn> USD`, unsigned; `AMOUNT IN EGP` reads `<egp_amount> EGP`; `AMOUNT IN USD` reads `no match`; one shot.
  - Both new rows stay above `hero, large font`, which runs every seed above it.
  - `:29` `detail rows and transfer card, large font`: the Force names the EGP to USD `row, transfer` seed of `transactions.md:23` as its transfer. The 1.0 comparison with `main` now excepts the amount row, which reads `AMOUNT IN EGP` with `<egp> EGP` where `main` reads `ORIGINAL AMOUNT` with `<usd> USD`, and the transfer's added `AMOUNT IN USD` row, which `main` does not draw. That replaces the stale `DATE & TIME` exception. The added `AMOUNT IN USD` row reads `resolveDetailRowHeight(scale)` like the others, and the 2.0 crop of the rows card includes it.
  - `:30` `skeleton, large font`: the transfer's row slots, the `AMOUNT IN USD` slot among them, read the loaded rows' heights.
- Change, in the other two files:
  - `transactions.md:127`: `TypeBadge` has one size, the one the row renders, since MA-192 folded `md` into it.
  - `README.md:36`: the frames read `C1 to C6, C10, C13 (transactions canvas), the hero and C5's amount rows`.
- Test: `none` · documentation the render lens reads. `npm run lint` (`scripts/validate-agent-assets.js`) checks every path the files cite and the banned phrases.

### 6. The decision record
- File: `docs/adr/<yyyy-mm-dd>-transaction-detail-amount-rows.md` (new, dated the day it is written)
- Change: Ticket MA-192 (#744), under #550, epic #543. It records:
  - The hero prints `tx.amount` in `tx.currency`, the list row's primary amount, a departure from frame C5's EGP hero by the 2026-10-08 Decision F.
  - `resolveDetailAmountRowFigure`'s table: four currency pairs by type, the commitment's EGP payment, and the unresolved destination.
  - The row prints through `formatDisplayAmount`, unsigned.
  - The skeleton slot keys on the same function.
  - The labels stay in capitals through `detail_row.tsx:89` until MA-181 (#722).
  - Under "What this does not decide": the flow card's arrived amount (`detail.helpers.ts:193-194`) and the rows' anatomy.
- Test: `none` · a record.

## Screens
- `emulator-verify/features/transaction_detail.md`: USD expense (new, C5; step 5 adds it)
- `emulator-verify/features/transaction_detail.md`: transfer from a USD account (new, no frame; step 5 adds it)
- `emulator-verify/features/transaction_detail.md`: transfer
- `emulator-verify/features/transaction_detail.md`: hero, large font
- `emulator-verify/features/transaction_detail.md`: detail rows and transfer card, large font
- `emulator-verify/features/transaction_detail.md`: skeleton, large font
- `emulator-verify/features/transactions.md`: type badge, sm

## Decision record
- `docs/adr/<yyyy-mm-dd>-transaction-detail-amount-rows.md`: the detail heroes the transaction's own amount and shows the other currency in one amount row picked from the transaction alone, loaded and skeleton alike. Step 6 adds the file.

## Non-goals
- The flow card's arrived amount and its EGP fallback for an unresolved destination (`detail.helpers.ts:193-194`): no change.
- The label-left rows, mixed-case labels, the note card and the actions, MA-181 (#722). `DetailRow`, `DetailRowsCard` and the Rate row's label and value do not change.
- Hero leads on the caption (frames C5, C3, C13), any change to `resolveDetailHeroGeometry` or `detail_hero.tsx`, and `StatusBadge`.
- `transaction_amounts.ts`, the list row and its `≈` line.
- Renaming the `type badge, sm` state, which two features-file rows cite.
- A render of `index.tsx` in a `.tsx` suite.

## Untested inputs
- The amount row's place above the Rate row in `index.tsx` (step 3). No suite renders the screen; the row keeps the Original amount row's JSX slot, and the `transfer` and `USD expense` states read the order.
- The labels drawn in capitals through `detail_row.tsx:89` (step 3), read on the emulator.
- A legacy EGP transfer that stores a rate to an EGP account would show an `AMOUNT IN USD` row holding an EGP figure (step 1). The resolver never writes one (`transaction_amounts.ts:130-141`).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- MA-181 (#722) reads `amountRow`. A rename here moves its plan.
- `transaction_detail.md · hero, large font`: a font scale above 1.0, a clipped or rounded container. A USD amount carries two more characters than EGP, so `adjustsFontSizeToFit` shrinks it sooner at 2.0, and `USD` must stay whole beside it.
- `transaction_detail.md · detail rows and transfer card, large font`: a font scale above 1.0, a height that is not a whole number of dp, a clipped or rounded container. The EGP to USD transfer gains the `AMOUNT IN USD` row, which the card's 2.0 crop must hold whole or ending in `…`.
- `transaction_detail.md · skeleton, large font`: a font scale above 1.0, a height that is not a whole number of dp, a clipped or rounded container. The EGP to USD transfer gains a slot; its height must match the loaded row's.
- REBUILD: package.json package-lock.json patches/@gorhom+bottom-sheet+5.2.14.patch patches/expo-router+57.0.28.patch

## Self-assessment
The step I am least sure of is step 3's formatter. The 2026-10-15 Decision cites `detail.helpers.ts:228-229`, which uses `formatCurrencyAmount`, for the row's unsigned-with-code shape, and the list row's `≈` line uses the same formatter. I chose `formatDisplayAmount` from ADR 2026-10-13 §3, the convention for a converted leg, which matches the hero's own escalating formatter. The two differ only below half a pound, where `formatCurrencyAmount` prints `0 EGP`. A reviewer could read either as drift from the other.
