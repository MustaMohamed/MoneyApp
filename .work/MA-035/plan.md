# MA-035 — Detail chrome: match the canvas on facts, actions, badge, hero balance and sheet footer
base: 73da991b6ba530a495324cb6f10ec0ce15d1495a · verify: emulator · flags: none · expected diff: ~125 lines

The account detail is the only caller of `DetailRow`'s `plain` and `valueColor` branches (`git grep -n "plain\|valueColor" -- src`: `detail/index.tsx:156,159` are the sole product call sites). So the fact row moves to a detail-local component and `DetailRow` is not edited at all — the transactions and commitments rows, `DETAIL_ROW_HEIGHT`/`DETAIL_ACCOUNT_ROW_HEIGHT` and `detail_skeleton.tsx:80-88` keep their current geometry with no edit.

## Steps

### 1. The hero can draw the currency code separately from the magnitude
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.helpers.ts` (`formatAccountBalance`, `:53-59`)
- Change: add `formatAccountBalanceParts(balance, currency): { amount: string; code: string }` holding the existing body — `amount` is the signed magnitude, `code` is `CURRENCY_CONFIG[currency].code`. `formatAccountBalance` becomes `const { amount, code } = formatAccountBalanceParts(...); return \`${amount} ${code}\`` and its returned string is byte-identical for every input. No new `Intl`, no decimals literal, no branch on a currency (`.claude/rules/review.md` item 3).
- Test: `__tests__/screens/accounts/balance_hero.helpers.test.ts` — a new `describe` for the parts split: `${amount} ${code}` equals `formatAccountBalance` for a positive EGP, a positive USD, an overdrawn EGP and an overdrawn USD balance; `code` equals `CURRENCY_CONFIG[currency].code` on both currencies; the `−` (U+2212) sits on `amount`, never on `code`. Fails at base — the export does not exist. The 7 existing `formatAccountBalance` cases (`:145-181`) stay untouched and must stay green.

### 2. Hero geometry constants
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.geometry.ts` (new)
- Change: export `HERO_CURRENCY_GAP = ms(6)` and `HERO_CURRENCY_OPACITY = 0.8` — the canvas's `.cur` 6 point left margin and 80 percent opacity. A screen-local `*.geometry.ts` beside the component, the shape `account_form.geometry.ts` and `accounts_list.geometry.ts` already use; neither value belongs in `theme.ts`'s shared vocabulary. Scaled with `ms()` per `.claude/rules/ui.md`.
- Test: `none` — two named constants with no logic; a test asserting `ms(6) === ms(6)` is a gate that cannot fail (`.claude/rules/review.md` § Gates).

### 3. The badge sits under the name and the code is smaller than the balance
- File: `src/modules/accounts/screens/accounts/detail/components/balance_hero.tsx` (`BalanceHero`, top row `:32-62`, balance `:68-74`)
- Change: two edits in the same component.
  - Top row: the tile stays; the name `Typography` and the `StatusBadge` move into one `style={{ flex: 1 }}` column. The badge is wrapped in a `<View style={{ alignSelf: 'flex-start', marginTop: Spacing.xxs }}>` — `StatusBadge` takes no `style`, and a column child left at the default `stretch` would run the pill the full width. `Spacing.xxs` is the canvas's 4 point offset. The row keeps `items-center gap-3`; the canvas gives no cross-axis alignment for `.id-hero-top`, so it is not invented here.
  - Balance: replace the single `Typography` with a `<View style={{ flexDirection: 'row', alignItems: 'baseline' }}>` holding the magnitude at `Type.hero` and the code at `Type.subhead` (the canvas's 16 point), each pairing `lineHeightFor` (`.claude/rules/ui.md`); the gap is `HERO_CURRENCY_GAP` on the container and the code carries `opacity: HERO_CURRENCY_OPACITY`. The gap is a container `gap`, not a `marginLeft` on a nested `Text` — RN Android ignores margins on inline text. Both keep `font-sora-bold tabular-nums` and `resolveAccountBalanceColorClass(account.type)`, so the code inherits nothing implicitly and the balance colour vocabulary is unchanged. `numberOfLines={1}` stays on the magnitude, and the magnitude carries `flexShrink: 1` against the code's `flexShrink: 0`: `numberOfLines` alone is enough on today's full-width `Typography` (`:68-74`), but inside a row a `Text` keeps its intrinsic width and pushes the code out instead of truncating, so a long balance must be the part that gives way and the code must always stay visible. Source of both strings is `formatAccountBalanceParts` from step 1.
- Test: `none` — layout and type size only; `.claude/rules/tests.md` forbids adding to the render suites, and no `.tsx` suite renders `BalanceHero` today. Covered by the emulator pass (Screens).

### 4. A detail-local fact row: label left, value right, one line
- File: `src/modules/accounts/screens/accounts/detail/components/account_fact_row.tsx` (new)
- Change: `AccountFactRow({ label, value, valueColor, showDivider })` on HeroUI `ListGroup.Item` (Team Law 7; `ListGroupItem` is a bare `Pressable` with no sibling context, so it composes inside `DetailRowsCard` exactly as `DetailRow` does). Class list `flex-row items-center justify-between gap-3 px-4 py-2` plus the same `border-separator border-b` divider gate as `detail_row.tsx:66`; `style={{ minHeight: TouchSize.min }}` — the canvas's 44 floor, unscaled by design (`theme.ts:222-225`), a minimum and never a fixed height. Label: `ListGroup.ItemDescription`, `font-inter text-content-secondary`, `Type.body` with `lineHeightFor`, **no `uppercase` and no `tracking-wide`** — that class, not the string, is what upper-cases the label today (`detail_row.tsx:82`); `Strings.accountCreditLimitLabel` and its siblings are already sentence case (`strings.ts:31,34,43,45,47,52,303,304`), so no copy moves. Value: `ListGroup.ItemTitle`, `font-inter-medium text-foreground`, `Type.body` with `lineHeightFor`, `numberOfLines={1}`, and the runtime `valueColor` applied as `style={{ color }}` (`className` is build-time only). Invariant for the squeeze case: only the label carries `flexShrink: 1`, so a long label truncates and the value stays whole on the right.
- Test: `none` — same reason as step 3.

### 5. The detail renders its facts through the new row
- File: `src/modules/accounts/screens/accounts/detail/index.tsx` (`:14` import, `:152-163` facts map)
- Change: swap the `DetailRow` import for `AccountFactRow` and drop `plain` from the call; `label`, `value`, `valueColor`, `showDivider` and the `key={fact.label}` are unchanged, so a card's four facts, a bank's two plus its two month facts and the month figures' `valueColor` are content-identical. `DetailRowsCard` stays.
- Test: `none` — a prop-for-prop component swap with no logic; `__tests__/screens/accounts/account_facts.helpers.test.ts` already pins what the rows say and must stay green untouched.

### 6. The two actions share a row and carry their icons
- File: `src/modules/accounts/screens/accounts/detail/index.tsx` (`:167-181`)
- Change: the `Box` becomes `style={{ flexDirection: 'row' }}` with `className="mx-4 mt-4 gap-2"` (gap-2 is the canvas's 8), each `Button` wrapped in its own `<Box style={{ flex: 1 }}>` so the two are exactly half each — the shape `confirm_sheet.tsx:105-118` already uses. `icon="pencil-outline"` on Adjust balance and `icon="archive-outline"` on Archive: `pencil-outline` is the repo's established edit glyph (7 of 8 call sites, e.g. `detail_header.tsx:39`, `transaction_row.tsx:198`) and `archive-outline` its outline sibling; both exist in the MaterialCommunityIcons glyph map. Archive keeps `tone="danger"`, which `button.tsx:100,117,123` already paints on both glyph and label. `Button` restates `accessibilityLabel` when an `icon` is present (`:110`), so the labels stay announced.
- Test: `none` — same reason as step 3. The screen has no render suite and `.claude/rules/tests.md` forbids adding one.

### 7. `Button` honours `flat` on the ghost variant
- File: `src/components/ui/button.content.ts` (new export), `src/components/ui/button.tsx` (`:59-67`, `:99-110`)
- Change: the radius derivation moves to `button.content.ts`, the file's established logic seam, as `resolveFlatRadius({ variant, flat }): { borderRadius: number } | undefined` — `{ borderRadius: Radius.cta }` when `flat === true && (variant === 'primary' || variant === 'secondary' || variant === 'ghost')`, `undefined` otherwise; it adds `Radius` to the `@/constants/theme` import already there for `Colors`. Both `style` sites in `button.tsx` become `style={resolveFlatRadius({ variant, flat })}`: the primary-flat branch (`:67`) emits the same object it hard-codes today, and the plain branch (`:108`) now covers ghost as well as secondary. `flatSecondary` keeps owning the label colour and the `tone` branch, so nothing about the secondary path moves. Without this a ghost Cancel renders at HeroUI's `--radius-3xl` beside a `Radius.cta` (13) Save. Contract: the `ButtonProps` union already admits `{ variant: 'ghost'; flat: true }`; the wrapper's three ghost call sites — `confirm_sheet.tsx:107`, `current_cycle_card.tsx:87`, `dev/primitives/index.tsx:58` — pass no `flat` and no other caller pairs `flat` with a variant outside primary and secondary, so every shipped button renders byte-identically.
- Test: `__tests__/components/ui/button_content.test.ts` — a second `it.each` table beside the existing one, in the same row shape, for `resolveFlatRadius`: `secondary`+flat, `ghost`+flat and `primary`+flat each give `{ borderRadius: Radius.cta }`; bare `ghost` and bare `secondary` give `undefined`. Fails at base — the export does not exist — and `ghost`+flat is the row whose value the change moves (no `Radius.cta` at base, `Radius.cta` at head), so the gate differs at base and head (`.claude/rules/review.md` § Gates); the other four pin what already ships. The 7 `resolveButtonContent` rows stay untouched and green.

### 8. The sheet footer: ghost Cancel, filled Save, equal widths
- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx` (`footer`, `:74-95`)
- Change: Cancel becomes `variant="ghost" flat` — transparent fill (`button.css:28-30`), `--default-foreground` label, `Radius.cta` from step 7 — and its wrapper's `flex: 2` on the Save side drops to `flex: 1`, so both are the same width. Save stays `variant="primary" flat` with its `isDisabled`/`isLoading` wiring intact. Nothing about the save path, the error rail or `formatAccountBalance` at `:117` changes.
- Test: `none` new. `__tests__/screens/accounts/adjust_balance_sheet_save_error.test.tsx` mocks `Button` by label (`:29-42`) and must stay green unedited — that is the regression guard that the footer edit did not disturb the save, parse-error or retry behaviour.

## Screens
Emulator walk, on one launch, per `emulator-verify`. `mqa claim` first; ask `mqa needs-build` — this diff is JS-only, so expect no Gradle build.
- Account detail, bank account with this month's figures: the four fact rows each on one line at the 44 floor with sentence-case labels; the badge under the account name; the balance with the smaller dimmed currency code; the two actions side by side with pencil and archive glyphs.
- Account detail, credit card account: the four card facts on one line each; the hero's available-credit caption and the foreground balance colour unchanged; Archive still danger-coloured.
- Adjust balance sheet, open on that account: Cancel with no fill and Save filled, both the same width and the same corner radius.
- Adjust balance sheet, error state (type `abc`, press Save): the footer treatment holds with the error rail showing.
- Transaction detail, a transfer: icon tile, badge, sublabel and row height as today — the shared-row regression shot.
- Commitment detail: the six rows as today — the second shared-row regression shot.

## Non-goals
- The activity card, its empty block, its See all and its row content (MA-036); the transaction row's clipped note (MA-034); adjusting an overdrawn account (MA-030); the keyboard covering the sheet's field (MA-033).
- Changing what any fact says. Only the row's layout moves.
- The canvas's 13 point action label and 16 point action icon. `Button` hard-codes its glyph at `Size.iconSm` (18) and takes its label size from HeroUI `size="md"` (16); acceptance item 2 asks for side-by-side, half width and the icons, not for those sizes, and moving them would resize every icon button in the app.
- Raising the hero balance from `Type.hero` (28) to the canvas's 30. The listed drift is the currency code's size, not the balance's.
- Lightening the currency code's weight. It stays `font-sora-bold` because the canvas's `.cur` overrides size and opacity only; acceptance item 4's "same size and weight" is met by the size and opacity change alone.
- `DETAIL_ROW_HEIGHT`, `DETAIL_ACCOUNT_ROW_HEIGHT`, `detail_skeleton.tsx` and its suite. Nothing in this plan touches the transactions detail's row geometry.
- `detail_row.tsx` itself, including the `plain` and `valueColor` arms step 5 leaves without a caller. `detail_row.tsx` is not in the diff.
- The month figures' green and red, the review alert's flat buttons, the two-decimal APR, the day label's slot — sanctioned deviations, per the ticket's Rules.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `test -f __tests__/screens/accounts/balance_hero.helpers.test.ts` before citing it — jest reads a path argument as a regex and a miss is a silent exit 0.

## Risks
- The dimmed code is drawn with `opacity` on a sibling `Typography` inside a baseline row. If baseline alignment reads wrong on the device (Yoga's baseline with two different line heights), the fallback is `alignItems: 'flex-end'` with the gap unchanged; the emulator shot decides.
- The hero's top row keeps `items-center`, so the type tile now centres against a taller two-line column. If the shot shows the tile floating off the name, `items-start` is the correction.
- If a reviewer reads the canvas's `.acts` as binding on type size too, step 6 grows into a `Button` change with app-wide blast radius. Held out deliberately above; escalate rather than absorb.
- `DetailRow` keeps its `plain` and `valueColor` arms with no caller after step 5. Retiring them is a separate ticket's work on the transactions detail; doing it here would edit a component in another module that acceptance item 6 requires to render unchanged, for no acceptance line.
- The account detail has no render suite, so steps 3-6 and 8 rest entirely on the emulator pass. A skipped or stale-bundle render check leaves them unverified — `--clear` plus `am force-stop`, and prove the bundle's provenance.

## Self-assessment
Step 3 is the one I am least sure about. The badge move and the code split are both structural changes to a hero I have only read, and two details settle only on the device: whether `alignItems: 'baseline'` puts a 28 point Sora magnitude and a 16 point code on a convincing shared baseline once their paired line heights differ, and whether the top row's unchanged `items-center` still reads right with the type tile now centred against a two-line column instead of a one-line name. I chose a flex row with a container `gap` over a nested `<Text>` with `marginLeft` because RN Android drops margins on inline text, which trades a known failure for an unknown one; both are cheap to correct at implementation time and the plan's contract — magnitude and code from `formatAccountBalanceParts`, sizes from `Type`, gap and opacity from named constants — survives either fallback.
