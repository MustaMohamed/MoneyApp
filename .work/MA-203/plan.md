# MA-203 — The detail rows card draws through the shared list card
base: 10f0caac7bc8272bfd79a1a9aa7cf29be78d3796 · verify: emulator · flags: none · expected diff: ~32 lines

## Steps
### 1. Theme holds an unscaled 16 corner for the detail screens' cards
- File: `src/constants/theme.ts` (`Radius`, `src/constants/theme.ts:135-143`); `docs/design-system.md` (Radius table, `docs/design-system.md:89-98`)
- Change: add `detailCard: 16` to `Radius` after `lg`, raw, never `ms()`, with one comment line in the form of the `Size` raw entries (`src/constants/theme.ts:148-173`): `rounded-2xl`, the corner the hero frame and the cards on the detail screens draw at every width. The value is `number`, never `null`, always present. Add the matching row to the design-system Radius table: `Radius.detailCard`, 16 unscaled, the detail screens' rows cards. Source for the unscaled value: the Decisions line of #772 and `src/components/ui/hero_shell.tsx:50-58`.
- Test: `first` · `__tests__/components/ui/detail_rows_card_radius.test.ts` (new, logic-only). Load `@/constants/theme` inside `jest.isolateModules` with `Dimensions.get` mocked to each width, using the same pattern as `__tests__/screens/transactions/detail/detail.geometry.test.ts:137-152`. `it.each([320, 390, 411, 430, 480])` asserts `Radius.detailCard` is 16 and `Size.hairline` is 1. One control case asserts `Radius.lg` is 17 at 411. Without it, a mock that fails to reach `ms()` would pass the case unnoticed.

### 2. The list card takes placement classes from its caller
- File: `src/components/ui/list_card.tsx` (`ListCardProps`, `ListCard`)
- Change: add `className?: string` to `ListCardProps`: optional, never `null`, holding per-caller placement classes only. The root's class becomes `cn('border-separator p-0', className)`, with `cn` imported from `heroui-native` (`.claude/rules/ui.md` Styling). Without `className` the six readers render the same class string as today. Change the `style` doc line to say it holds per-caller placement, or a corner other than `Radius.lg`. The order inside the style array stays: the base object first, the caller's `style` last, so the caller's `borderRadius` wins. No reader changes.
- Test: `none` · rendering `ListCard` alone would need a new `.tsx` suite, which `.claude/rules/tests.md` forbids. Step 4's case renders it through `DetailRowsCard`.

### 3. The detail rows card is the list card plus its placement
- File: `src/components/ui/detail_rows_card.tsx` (`DetailRowsCard`)
- Change: render `<ListCard testID={testID} className="mx-4 mt-4" style={DETAIL_ROWS_CARD_CORNER}>`. `DETAIL_ROWS_CARD_CORNER` is a module-level `Object.freeze({ borderRadius: Radius.detailCard })` typed `Readonly<ViewStyle>`, following `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts:36-44`. Props: `children: React.ReactNode` (required); `testID?: string` (new, optional, never `null`). The return type stays `React.ReactElement`. Remove the `ListGroup` import, `variant`, `overflow-hidden`, `rounded-2xl`, `border` and the inline `boxShadow`: `ListCard` draws the border, the hairline and the shadow-off. `Surface`'s `surface__root` clips the rows (`node_modules/heroui-native/src/styles/components/surface.css:1-6`). The five readers stay as they are.
- Test: `none` · no render suite mounts the five readers. Step 4's case covers the component through the skeleton.

### 4. The transaction detail's loading rows card draws through the detail rows card
- File: `src/modules/transactions/screens/transactions/detail/components/detail_skeleton.tsx` (`TransactionDetailSkeleton`, `detail_skeleton.tsx:128-132` and its close at `:151`)
- Change: replace the rows `Card` with `<DetailRowsCard testID="transaction-detail-skeleton-rows">`, imported from `@/components/ui/detail_rows_card`. The row children stay unchanged. The `Card` import stays because the transfer skeleton card (`:35`) and the note card (`:153`) still use it.
- Test: `first` · `__tests__/screens/transactions/detail/detail_skeleton.test.tsx`. The suite's local `heroui-native` mock (`:29-40`) gains `ListGroup`, a pass-through `View` like its `Card`, and `cn`, which joins the truthy arguments. Without them the suite breaks once the skeleton mounts `ListCard`. New case, under the Render-suite policy (Acceptance line 4 names render-only wiring): render with `transferHint` and assert that `getByTestId('transaction-detail-skeleton-rows')` has the style `{ borderRadius: Radius.detailCard, borderWidth: Size.hairline }`. The case fails at base, where the `Card` carries only `boxShadow`. Jest's 750 dp window clamps the scale to 1.15, so `Radius.lg` is 18 there, and the case also proves the caller's corner wins over the list card's default.

### 5. The six screen check states carry the card's proof
- File: `.claude/skills/emulator-verify/features/account_detail.md` (`bank with recent activity` `:17`, `activity load error retry, large font` `:41`), `.claude/skills/emulator-verify/features/archived_account.md` (`archived bank, read-only` `:15`), `.claude/skills/emulator-verify/features/transaction_detail.md` (`detail rows and transfer card, large font` `:32`, `skeleton, large font` `:33`), `.claude/skills/emulator-verify/features/commitment_detail.md` (`details card rows, large font` `:21`)
- Change: append one clause, tagged MA-203, to each row's Proof cell. For the four loaded states, a crop of each rows card on the screen at this head matches `main`: 16 dp corners, a 1 dp border, its insets, and its first and last rows clipped inside its corners. At 1.0 and 2.0 where the row names both scales: the account facts card and the activity card, the archived rows card, the transaction rows card, the commitment details card. For `activity load error retry, large font`, the alert sits inside the card's corners. For `skeleton, large font`, in the 1.0 and 2.0 shot pairs the skeleton rows card's corners, border, insets and clip match the loaded rows card's. No row is added, and every other cell stays byte-identical.
- Test: `none` · docs, no executable surface.

## Screens
- `emulator-verify/features/account_detail.md`: bank with recent activity
- `emulator-verify/features/account_detail.md`: activity load error retry, large font
- `emulator-verify/features/archived_account.md`: archived bank, read-only
- `emulator-verify/features/transaction_detail.md`: detail rows and transfer card, large font
- `emulator-verify/features/transaction_detail.md`: skeleton, large font
- `emulator-verify/features/commitment_detail.md`: details card rows, large font

## Non-goals
- The fact rows inside the card: MA-197 (#759).
- `HeroShell`'s raw 16s stay as they are (`src/components/ui/hero_shell.tsx:50-58`), and nothing moves them to `Radius.detailCard`.
- The other cards on these screens keep their classes: the transfer flow card, the note card, the current cycle card, the payment history, and the skeleton's transfer and note cards.
- None of the six `ListCard` readers passes `className`, and none changes its `style`.
- `TransactionRowsSkeleton`'s `Radius.lg` row corners inside the activity card stay as they are on `main`.
- `DetailRowsCard` is not deleted, and its readers do not switch to `ListCard` directly.

## Untested inputs
- The `mx-4 mt-4` insets go through `className`, so a Jest assertion can't read them under the M35 prune rule. The emulator crop is the proof (step 3).
- The `cn` merge of `border-separator p-0` with `mx-4 mt-4` under the real tailwind-merge: the test mock only joins strings (step 2).
- The rows clip comes from `Surface`'s `overflow: hidden`, so only the emulator crop proves it (step 3).
- The six `ListCard` readers pass no `className`, so they now go through `cn('border-separator p-0', undefined)`. Only code reading proves their class string is unchanged: M35 rules out a Jest assertion on it, and no Screen check covers a reader (step 2).

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- A suite that mocks `heroui-native` locally without `ListGroup` or `cn`, and mounts a `DetailRowsCard` reader, would throw. Grep at base finds only `detail_skeleton.test.tsx`, which step 4 fixes.
- If Uniwind let `surface__root`'s `border-radius` win over the inline style, the corner would read HeroUI's `--radius-3xl`. The six `ListCard` readers rely on the inline style winning today, so this is unlikely.
- `transaction_detail.md · skeleton, large font`: the rows card moves from `Card` to `ListGroup`. `ListGroup` adds `borderCurve: 'continuous'`, which only iOS honours, so the Android crop matches `main`, and any difference is a defect.
- `transaction_detail.md · detail rows and transfer card, large font`: the card's height is a sum of non-whole fact row heights (54.86 at 2.0) plus two borders. The bottom row's clip at the rounded corner must match `main`.
- `account_detail.md · activity load error retry, large font`: the inline alert sits against the card's corners. A lost clip would show the alert's square corners.
- `commitment_detail.md · details card rows, large font`: the commitments module waits for its redesign. Any difference from `main` here is this change's, not the redesign's.
- `not probed: transaction_detail.md · detail rows and transfer card, large font`
- `not probed: transaction_detail.md · skeleton, large font`
- `not probed: commitment_detail.md · details card rows, large font`

## Self-assessment
I am least sure about step 2. The plan gives `ListCard` a `className` channel beside `style`, so the unscaled `mx-4 mt-4` insets keep their class form. No unscaled spacing token exists: `Spacing.md` is `ms(16)`, 17 on the 411 dp emulator, and would move the insets. A reviewer may prefer style-only placement with raw 16s, as `HeroShell` uses, or a `radius` prop over overriding the corner through `style`. Both alternatives are a few lines and change no other step. The raw entry in `Radius` (step 1) follows the `Size` raw-entry convention, but it is the first unscaled entry in `Radius`.
