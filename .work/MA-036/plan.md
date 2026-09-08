# MA-036 — Activity card: match the canvas on the empty block, See all and row context

base: 73da991b6ba530a495324cb6f10ec0ce15d1495a · verify: emulator · flags: user copy · expected diff: ~95 lines outside tests

## Steps

### 1. The row builder can take its context line from the surface

- File: `src/modules/transactions/screens/transactions/components/transaction_row.helpers.ts` (`isCardCredit` `:54`, `buildTransactionRowPresentation` `:125`)
- Change: export `isCardCredit` unchanged — one predicate decides "the title already carries the category", and the accounts helper needs the same one. Give `buildTransactionRowPresentation` a second parameter `contextOverride?: string` and set `const context = contextOverride ?? contextFor(tx, account, toAccount, category)`. `contextFor` stays module-private and every branch of it stays as it is; `accessibilityLabel` (`:161-163`) already reads `context`, so the spoken label follows the override for free. No other field reads `context`. `transaction_row.tsx:182` passes no second argument and is untouched.
- Test: `__tests__/screens/transactions/transaction_row.helpers.test.ts` — one case: the same expense built with `contextOverride: '6 Sep'` has `context: '6 Sep'` and an `accessibilityLabel` whose second segment is `6 Sep`, while `title`, `primaryAmount`, `iconName` and `timeText` equal the no-override build. The seven existing cases pin the omitted-argument path.

### 2. The activity row's second line carries the transaction's own context

- File: `src/modules/accounts/screens/accounts/detail/components/account_activity.helpers.ts` (`buildActivityRowPresentation` `:30`), `src/constants/strings.ts` (after `accountActivityYesterday` `:313`), `src/modules/accounts/screens/accounts/detail/account_detail.hook.ts` (`:127`)
- Change: add `accountActivityFromAccount: (name: string) => \`From ${name}\`` to `Strings` — the one new string. `buildActivityRowPresentation` takes a third parameter `openAccountId: string`; the hook passes `id` (in scope at `account_detail.hook.ts:127`). Compute `dayLabel = formatActivityDayLabel(tx.transaction_date, tx.transaction_time, now)` once, then a module-private `activityContext(input, dayLabel, openAccountId): { context?: string; timeText: string }`, checked in this order:
  1. `tx.type === TransactionType.CCPayment && tx.to_account_id === openAccountId` → `{ context: Strings.accountActivityFromAccount(account?.name ?? Strings.unknownAccount), timeText: dayLabel }`
  2. `tx.type === TransactionType.Transfer || tx.type === TransactionType.CCPayment` → `{ timeText: dayLabel }`
  3. `!category` → `{ timeText: dayLabel }`
  4. `isCardCredit(tx, account)` → `` { context: `${category.name} · ${dayLabel}`, timeText: '' } ``
  5. otherwise → `{ context: dayLabel, timeText: '' }`

  Branches 2 and 3 return no override on purpose: the builder's own `contextFor` then produces `source → destination` and the bare account name, so "as it does today" cannot drift from the transactions list. Return `{ ...buildTransactionRowPresentation(input, context), timeText }`; the spread no longer needs to patch the label, because `context` reached the builder.
- Test: `__tests__/screens/accounts/account_activity.helpers.test.ts` — the `buildActivityRowPresentation` describe is rewritten (the `:61-67` invariance case inverts, since `context` and `accessibilityLabel` now differ from the shipped build). New cases, `now` at local noon as the file already does: categorised expense on a bank → `context: '6 Sep'`, `timeText: ''`; expense with no category → `context: 'CIB'`, `timeText: '6 Sep'`; income on a `CreditCard` account with a category → `` context: 'Food · 6 Sep' ``, `timeText: ''`; transfer → `context: 'CIB → Payoneer'`, `timeText: '6 Sep'`; card payment with `openAccountId` = `tx.account_id` → `context: 'CIB → Visa'`, `timeText: '6 Sep'`; card payment with `openAccountId` = `tx.to_account_id` → `context: 'From CIB'`, `timeText: '6 Sep'`; and one case that the spoken label of the categorised expense reads `6 Sep` where the shipped label reads `CIB`. Keep the invariance guard in the shape `expect({ ...activity, context: shipped.context, timeText: shipped.timeText, accessibilityLabel: shipped.accessibilityLabel }).toEqual(shipped)` so nothing else drifts. `__tests__/screens/accounts/account_detail.hook.test.ts:446` stays as it is — the suite mocks `categories: []` (`:189`), so its row has no category and branch 3 keeps `'CIB'`; add a case beside it that seeds one category through the `useCategoryStore` mock, matching `makeTestTransaction`'s default `category_id: 'category-1'`, and asserts `rows[0].presentation.context` is the day label and `timeText` is `''`.

### 3. See all follows the same predicate as the card body

- File: `src/modules/accounts/screens/accounts/detail/components/account_activity.helpers.ts`, `src/modules/accounts/screens/accounts/detail/components/account_activity_card.tsx` (`:42-69`)
- Change: export `activityCardView(status: AccountActivityStatus, rowCount: number): { body: 'loading' | 'error' | 'empty' | 'rows'; showSeeAll: boolean }` from the helpers — `loading` for `idle`/`initialLoading`, `error` for `initialError`, `empty` when `rowCount === 0`, else `rows`; `showSeeAll` is `body === 'rows' || body === 'error'`. Import the status as `import type { AccountActivityStatus } from '../account_activity.store'` — `import type` erases, so the helpers test does not pull the store's module side effects. The card calls it once and drives both the header and the body from the result, so the two cannot disagree. The header becomes two explicit elements, `<SectionHeader title={…} action={{ label: Strings.accountActivitySeeAll, onPress: onSeeAll }} />` when `showSeeAll` and `<SectionHeader title={…} />` otherwise: `SectionHeaderProps` (`section_header.tsx:12-17`) refuses `action={undefined}` under its second union branch, and widening it would reach the accounts list (`screens/accounts/list/index.tsx:78`) and the dashboard, which re-exports the same component (`dashboard/screens/dashboard/components/section_header.tsx:1`).
- Test: `__tests__/screens/accounts/account_activity.helpers.test.ts` — a table over the four statuses × row counts 0 and 2: `idle`/`initialLoading` give `body: 'loading'` and `showSeeAll: false` at both counts; `initialError` gives `body: 'error'` and `showSeeAll: true`; `ready` with 0 gives `body: 'empty'` and `showSeeAll: false`; `ready` with 2 gives `body: 'rows'` and `showSeeAll: true`.

### 4. The empty block centres under a circled glyph

- File: `src/modules/accounts/screens/accounts/detail/components/activity_empty_block.tsx`, `src/constants/theme.ts` (`Size`, beside `emptyStateIcon` `:185`)
- Change: add `activityEmptyGlyph: ms(28)` to `Size` — no icon token is 28 (`iconLg` ms(26) `:182`, `iconXl` ms(30) `:184`), and `Radius.xl` `:136` / `Size.accountTile` `:196` are ms(28) under meanings that are not an icon size. In the block: the root `View` keeps `px-4 py-5` (the canvas's 20-by-16) and gains `items-center`; a first child `View` sized `Size.emptyStateIcon` square, `className="bg-surface-secondary items-center justify-center rounded-full"` (`--surface-secondary` `global.css:12` is the canvas's secondary surface, the value `EmptyState` reaches through `Colors.dark.surfaceEl`), holding `<MaterialCommunityIcons name="swap-horizontal" size={Size.activityEmptyGlyph} color={Colors.dark.text2} />` as `empty_state.tsx:63` does, with its `Colors.dark.text2` glyph colour (`empty_state.tsx:145`) — the ticket's Rules put colour in `theme.ts`, and `CoreTokens.text2` (`theme_tokens.ts:9`) is an independent `#6B7F99` literal that a `Colors.dark` edit would leave behind. `no_accounts_empty.tsx:18` is the same block on `CoreTokens`; it is not the model here. Title gains `text-center` and `marginTop: Spacing.sm`; the body copy's `mt-1` becomes `marginTop: Spacing.xs` and gains `text-center`; the `LinkButton`'s style becomes `{ marginTop: Spacing.sm }` — `alignSelf: 'flex-start'` is dropped, and `Size.inlineLinkOffset` is left at ms(6) because `total_balance_strip.tsx:108` shares it. Every existing `fontSize`/`lineHeightFor` pair stays untouched; the copy is unchanged.
- Test: none — layout only, and `tests.md:17` closes the render suites to new files. The emulator pass below is the check.

## Screens

- Account detail, bank with rows: a categorised expense (second line the date, time slot empty), an uncategorised expense (second line the account name, date in the time slot), a transfer (second line `source → destination`, date in the time slot), and See all beside the header.
- Account detail, bank with no transactions: the centred empty block, circled glyph above the title, and no See all.
- Account detail, credit card paid by a card payment: the payment row reads `From <paying account>` with its date in the time slot; the same payment on the paying account's detail still reads `source → destination`.
- Account detail, activity load failed: the error alert with See all still beside the header. Force it with a one-line throw in `account_activity.repository.ts`, shoot, revert before committing.
- Account detail, activity loading: the skeleton with no See all. If the load lands too fast to catch, force it with a one-line delay in the same file and revert.

## Non-goals

- Widening `SectionHeaderProps`, or touching the accounts list's count header or the dashboard's per-type headers.
- Retuning `Size.inlineLinkOffset`, or reusing `Radius.xl` / `Size.accountTile` for the glyph.
- Turning the empty block into an `EmptyState` variant, or changing its copy, the add link's copy or the error alert.
- Changing `contextFor`'s branches, or the transactions list's own second line — the account is the useful context there.
- The row's first line, amount, tile, note track or `TRANSACTION_ROW_HEIGHT`; the clipped note and overlapping transfer amount are MA-034 (#423).
- Any amount computation or reformatting.
- The detail's chrome outside the card, MA-035 (#424); where the back button lands, MA-037; the card's load, retry and return-path behaviour, settled by MA-028 (#402).

## Verification

- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks

- The glyph circle takes `--surface-secondary` (`#243044`) inside `DetailRowsCard`, a HeroUI `ListGroup variant="default"` → `surface__root--variant-default` → `--color-surface` `#1A2535` (`node_modules/heroui-native/lib/module/styles/components/surface.css:10-12`), so the circle contrasts and no `surface-tertiary` fallback is needed. The emulator's empty-block shot confirms it.
- `timeText: ''` still renders its `<Text>`, so the row height holds only while the value track keeps its fixed geometry; a later change that lets that track hug its content would shorten the date-moved rows.
- Branches 2 and 3 of `activityContext` fall through to `contextFor`, so a change to `contextFor`'s transfer or card-credit branch moves the activity card too.
- A card payment where `openAccountId` equals both sides cannot exist (`transactions.ts:259` selects `account_id = ? OR to_account_id = ?`, and a payment to itself is not creatable), so branch 1 stays unambiguous — if that ever changes, branch 1 wins.

## Self-assessment

Step 3's `activityCardView` is the piece I am least sure about, not for correctness but for whether it earns its keep. The acceptance only asks that See all disappear on the empty and loading states, and the smallest change is a boolean computed inline in the card. I made it an exported function because the card has no test of its own and never will under `tests.md:17`, so an inline boolean would leave acceptance line 2 with the emulator as its only witness, against `CLAUDE.md`'s rule that a unit test must assert what it can. The cost is a fourth thing in a helpers file whose name says "row presentation", and a reviewer may reasonably want it in its own `account_activity_card.helpers.ts` or want the whole export dropped. Either substitution is local to step 3 and changes nothing in steps 1, 2 or 4.
