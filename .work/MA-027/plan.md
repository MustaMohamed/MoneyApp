# MA-027 — Detail: redesigned hero, facts, actions, review alert and Adjust balance sheet
base: 7661d86fe10bcfeb25feea5384d16f1af77f7c4e · verify: emulator · flags: none · expected diff: ~280 lines

## Steps
### 1. The approved copy exists in `Strings`
- File: `src/constants/strings.ts` (`accountDetailBalance` `:287`, `accountDetailAdjustBalance` `:288`, `adjustBalanceTitle` `:317`, `adjustBalanceLabel` `:318`, `adjustBalanceSave` `:319`)
- Change: sentence-case the five to 'Current balance', 'Adjust balance', 'Adjust balance', 'New balance', 'Save'. Add `adjustBalanceHelper: 'Enter the balance on your statement.'`, `accountHeroOverLimit: 'Over limit'`, `accountDetailFactUnset: '—'`, `accountDetailDueDayValue: (ordinal: string) => \`${ordinal} of the month\``, `accountDetailAprValue: (rate: string) => \`${rate}%\``, `accountDetailInterestTracked: 'interest tracked'`, and `ordinalSuffixes: { one: 'st', two: 'nd', few: 'rd', other: 'th' }`. `cardOverLimit` (`:228`, the dashboard's) stays as it is.
- Test: none, copy only; the existing suites read every key symbolically.

### 2. A day number prints as its ordinal
- File: `src/utils/format_ordinal.ts` (new), `formatOrdinal(day: number): string`
- Change: suffix from `Strings.ordinalSuffixes` by `day % 10`, except `day % 100` in 11..13 takes `other`. Pure, no date arithmetic.
- Test: `__tests__/utils/format_ordinal.test.ts`, an `it.each` over 1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31 with the ticket's spellings.

### 3. The type badge's fill and foreground clear 4.5:1 on every palette colour
- File: `src/modules/accounts/constants/account_badge_color.ts` (new), `resolveAccountBadgeColors(color: string): { fill: string; foreground: string }`; `contrastRatio` from `src/modules/accounts/constants/account_palette.ts:62`
- Change: `fill` is the colour at the badge's shipped alpha (`0x22 / 255`, `status_badge.tsx:24`) composited over `Colors.shared.heroGrad2`, returned as an opaque `#RRGGBB` so the painted fill is the tested fill. `foreground` starts at the frames' mix, 55% colour into 45% `CoreTokens.text1`, and steps the colour share down by 0.05 until `contrastRatio(fill, foreground) >= 4.5`, floor at pure `text1`. A private `mixHex(a, b, shareOfA)` does the channel mix; keep it in this file, not in `theme.ts`. The escalation is load-bearing: at a fixed 55/45, 7 of the 32 palette hexes sit below 4.5 against that fill (midnight, plum, lapis, amethyst, indigo, graphite rich; midnight soft), `node scratchpad/contrast.js` over `AcctTokens`.
- Test: `__tests__/accounts/account_badge_color.test.ts`: every `ACCOUNT_PALETTE` hex plus `DEFAULT_ACCOUNT_COLOR` gives `contrastRatio(fill, foreground) >= 4.5`; `fill` matches `/^#[0-9A-Fa-f]{6}$/`; `AcctTokens.gold.rich` returns the 55/45 mix itself (its ratio already clears); `AcctTokens.midnight.rich` returns a foreground with a higher ratio than its 55/45 mix would give (the escalation ran).

### 4. A card over its limit captions "Over limit" in the negative colour
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts:24-35` (`buildHeroCaption`)
- Change: inside the `isCC && limit > 0` branch, `current_balance > limit` returns `{ text: Strings.accountHeroOverLimit, adjusted: false, color: SemanticTokens.negative }`, the dashboard's condition (`account_card.tsx:81`). Otherwise unchanged: `available = limit − current_balance` (now never negative on this path), the `accountHeroAvailable` text and `availableCreditColor`. `HeroCaption` keeps its shape.
- Test: `__tests__/screens/accounts/balance_hero.helpers.test.ts`: replace `clamps available at zero when balance exceeds limit` (`:95-100`) with over limit on EGP (`credit_limit: 1000, current_balance: 1500` → text `Strings.accountHeroOverLimit`, `color` `SemanticTokens.negative`); add the same on USD; add balance equal to the limit → `Available 0 EGP of 1,000` with `availableCreditColor(0, 1000)`.

### 5. The fact rows derive from one helper
- File: `src/modules/accounts/screens/accounts/detail/components/account_facts.helpers.ts` (new), `buildAccountFacts(account: Account): AccountFact[]`, `AccountFact = { label: string; value: string }`
- Change: a card returns four rows, in order: `accountCreditLimitLabel` → `formatCurrencyAmount(credit_limit, currency)`; `accountMinPaymentLabel` → `formatCurrencyAmount(minimum_payment, currency)`; `accountDueDayLabel` → `Strings.accountDetailDueDayValue(formatOrdinal(statement_due_day))` when the day is a number above 0 (the dashboard's gate, `account_card.tsx:97`); `accountAprLabel` → `Strings.accountDetailAprValue(formatAmount(apr, APR_DISPLAY_DECIMALS))` with `APR_DISPLAY_DECIMALS = 2` as a named constant in this file (a rate, so `CURRENCY_CONFIG` does not apply), then `' · ' + Strings.accountDetailInterestTracked` appended when `interest_tracking === 1`. Every null card field prints `Strings.accountDetailFactUnset`. Every other type returns two rows: `accountCurrencyLabel` → `CURRENCY_CONFIG[currency].code`; `accountBalanceLabel` → `formatCurrencyAmount(opening_balance, currency)`. No branch on `Currency`.
- Test: `__tests__/screens/accounts/account_facts.helpers.test.ts`, written first: bank EGP gives `['Currency', 'EGP']`, `['Opening balance', '30,000 EGP']`; bank USD opening 1250.5 gives `'1,250.50 USD'`; each non-card type gives exactly two rows (`it.each` over the four); card full: limit `50,000 EGP`, minimum `2,500 EGP`, due day 23 → `'23rd of the month'`, apr 24.5 tracked → `'24.50% · interest tracked'`; card with every nullable null and tracking off → four `'—'` values; card apr null with tracking on → `'— · interest tracked'`; due day 1, 2, 11, 31 spellings; USD card limit 500 → `'500.00 USD'`.

### 6. A `DetailRow` renders without an icon tile
- File: `src/modules/transactions/screens/transactions/detail/components/detail_row.tsx:36,64-72` (`Props.icon`, `ListGroup.ItemPrefix`)
- Change: `icon?: IconName`; render the prefix only when `icon` is set. Existing callers (`transactions/detail/index.tsx:82-127`, `commitments/.../details_card.tsx:25-57`) all pass one and do not change.
- Test: none, `.tsx` render only.

### 7. A flat secondary button can take the danger colour
- File: `src/components/ui/button.tsx:15-30,93-113` (`ButtonProps`, the secondary branch)
- Change: add `tone?: 'danger'`, honoured only with `flat` and `variant="secondary"`: the label class becomes `text-danger` instead of `text-foreground`, an `icon` renders `SemanticTokens.negative`. Primary and non-flat paths untouched.
- Test: none, `.tsx` render only; `resolveButtonContent` is unchanged and `__tests__/components/ui/button_content.test.ts` stays as it is.

### 8. The hero carries the tile, the name, the badge and the balance at hero size
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.tsx`; `src/components/ui/status_badge.tsx:10-37`
- Change: `StatusBadge` props `color` → `fill: string; foreground: string`, painting `backgroundColor: fill` and icon plus label in `foreground` (its only consumer is this hero). The hero, on `HeroShell` with `glowColor` the account colour as today: a top row with the tile, `Size.typeIconBox` square at `Radius.sm` filled `resolveAccountTileColors(account.color).background` (`accounts/list/accounts_list.geometry.ts:28`) with `ACCOUNT_TYPE_ICONS[type]` at `Size.iconSm` in `.glyph`; the name in `font-sora-semibold` at `Type.subhead` (`numberOfLines={1}`, `flex: 1`); the `StatusBadge` with `resolveAccountBadgeColors(color)`. Then `Strings.accountDetailBalance` as the overline it is today; the balance from `formatCurrencyAmount(current_balance, currency)` as shipped (`balance_hero.tsx:43`), `font-sora-bold`, `resolveAccountBalanceColorClass(type)`, `style={{ fontSize: Type.hero, lineHeight: lineHeightFor(Type.hero) }}`, `numberOfLines={1}`; the caption as today, `buildHeroCaption`. Every `fontSize` pairs `lineHeightFor` (lint error otherwise).
- Test: none, `.tsx` render only; the text and colours come from the helpers tested in steps 2 to 5.

### 9. The review alert's two buttons take the flat shape
- File: `src/modules/accounts/screens/accounts/detail/components/balance_review_alert.tsx:32-48`
- Change: add `flat` to both `Button`s; variants, sizes, labels and disabled wiring unchanged.
- Test: `__tests__/screens/accounts/balance_review_alert.test.tsx` passes unchanged (its `Button` mock ignores `flat`).

### 10. The Adjust balance sheet shows today's balance, the code as suffix and the helper
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx:67-116`
- Change: above the input, a label-and-value row: `Strings.accountDetailBalance` and `formatCurrencyAmount(currentBalance, currency)`, the hero's call, two `Typography`s in a row. The input keeps `initialize(currentBalance)` prefill, `keyboardType`, `onFocus`/`onBlur`, `isInvalid`; it gains `suffix={<Typography className="text-muted font-sora-bold" …>{currency}</Typography>}` (the wrapper's `InputGroup` path, `input.tsx:42-56`) replacing the sibling code text at `:112`, and `helperText={Strings.adjustBalanceHelper}`. `FormErrorText` at `:114` stays the error slot. Footer: `flat` on Cancel and Save. `handleSave`, `parseAdjustInput`, `setError` and `onSave` untouched; `size` stays `sm` unless the row and helper push the input under the keyboard, then `md`.
- Test: `__tests__/screens/accounts/adjust_balance_sheet_save_error.test.tsx` and `__tests__/screens/accounts/adjust_balance_validation.test.ts` pass unchanged; the suite's `Input` mock drops `suffix` and `helperText`, so those two are the render pass's to check.

### 11. The screen composes hero, alert, facts and the two actions
- File: `src/modules/accounts/screens/accounts/detail/index.tsx:97-173`
- Change: order inside `ScreenScroll`: `BalanceHero`; the alert gated `!isEditing && shouldShowBalanceReview(account)` as today; the edit form gated `isEditing` as today; then the facts, always rendered: `DetailRowsCard` (`transactions/detail/components/detail_rows_card.tsx`) with one `DetailRow` per `buildAccountFacts(account)` entry, no `icon`, `showDivider={false}` on the last; then, gated `!isEditing`, a column at `mx-4 mt-4` with two full-width `Button variant="secondary" flat`: `Strings.accountDetailAdjustBalance` → `setAdjustVisible(true)`, `Strings.accountDetailArchive` with `tone="danger"` → `setArchiveVisible(true)`. The `ListGroup`, `Separator`, `MaterialCommunityIcons`, `CoreTokens` and `SemanticTokens` imports go with the old group. Header, `if (!account) return null`, the sheet and the dialog wiring at `:175-195` unchanged.
- Test: none new; `__tests__/screens/accounts/account_detail.hook.test.ts` and `__tests__/account_detail.state.test.ts` cover the unchanged hook and state.

## Screens
- Bank account, EGP (frame C1): hero with tile, name, badge, balance, Opening caption; the two fact rows; the two flat actions. Same account with Edit open: form shown, fact rows still there, actions and alert gone.
- Credit card with a limit (frame C2): one shot in the green band ("Available … of …"), one over the limit ("Over limit" in the negative colour); the four fact rows including a null one printing "—". Seed the row states with the `emulator-verify` skill's SQLite path.
- Credit card with `balance_review_required = 1` (frame C2b): alert between hero and facts, both buttons flat.
- Adjust balance sheet (frame G1): open on a card, prefilled, code suffix, helper; then with an unreadable value to show the invalid message. A USD account is not shot; `account_facts.helpers.test.ts` asserts the decimals.

## Non-goals
- Recent activity, month figures, the empty, loading and failed states and See all (MA-028, #402); `buildAccountFacts` returns an array MA-028 can append to.
- The accounts list and `accounts_list.geometry.ts` (MA-015, #381): step 8 imports `resolveAccountTileColors`, it does not move it.
- The archived account's detail, the archive confirmation and `if (!account) return null` (MA-017, #383, audit M14).
- The edit screen (MA-019, #385): the inline name-and-colour form and the header's Edit/Save toggle stay byte-identical.
- Deleting (MA-020, MA-021).
- The adjust and confirm write paths (`account.repository.ts:82-91`, `accounts.ts:118-149`), revolving-balance reconciliation (audit M16), the store, the state, the hook.
- `Strings.cardOverLimit` and anything on the dashboard card.
- Icons on the two actions; the acceptance names none.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The canvas is unreadable here; the hero's row layout (tile, name, badge) and the fact row density are from the ticket's words, and the render lens compares against frames C1, C2, C2b, G1.
- MA-015 (#381) owns `accounts_list.geometry.ts`; a rename of `resolveAccountTileColors` there breaks step 8 at merge.
- Step 3's fill composites over `Colors.shared.heroGrad2` alone; the painted backdrop is a three-stop gradient with the account-colour glow in the top-right corner, so the on-device ratio near the glow can differ from the tested one.
- `size="sm"` (45%) may not hold the new row, the helper and the keyboard on a small device; step 10 leaves `md` as the fallback.
- The detail's `accountHeroOverLimit` and the dashboard's `cardOverLimit` are two strings for one state, in two cases; unifying them is a dashboard copy change outside this ticket.
- Amended 2026-09-08 (plan review): the step that moved `formatOwnedAmountParts` into `format_amount.ts` is dropped; it prints an exact zero as `0` on every currency (`format_amount.ts:86-87`, pinned on USD by `net_worth_breakdown_sheet.helpers.test.ts:152-156`) and composes a sign, against the acceptance's per-currency decimals and unsigned magnitude, and it touched a file outside the ticket. The hero and the sheet row use `formatCurrencyAmount` as the hero ships it.

## Self-assessment
Step 3 is the least certain. The ticket gives a threshold (4.5:1 against the badge fill) and a starting mix (55/45), and the two disagree for seven palette colours once the fill is composited over the hero, so the plan makes the foreground escalate towards `text1` until the ratio clears. That satisfies the acceptance line and the test pins it, but it means seven badges render a lighter label than the frames draw, and the fill is tested as an opaque composite over one gradient stop while the device paints it over three stops plus the glow. If the reviewer reads "against the badge fill" as the alpha fill over whatever sits behind it, the resolver's backdrop choice is the line to change, not the escalation.
