# MA-023 — List: /accounts screen, dashboard See all, rows to detail
base: 5530a7f9b002996b04fce5c243cdbe0f5bd4a20c · verify: emulator · flags: none · expected diff: ~270 lines

Design read from the canvas (frames A1, B1; canvas file `Main.dc.html` is B1). Geometry taken from it: header 56 with a 36 back square and a 36 `+` square (glyph 20); "See all" Inter 600 12/16 accent with a 14 chevron-right, 6 under the count; section header `.sec-hd` is the shipped `SectionHeader`; row `.cb-row` 12/16 padding (12 on the right), gap 12, min-height 64; tile 28 radius 8, account hex fill, 16 glyph in the palette's tick colour; name Inter 500 15/20; balance Sora 15/20 tabular over the code 11/14; grip slot 16 wide.

## Steps

### 1. Copy and tokens exist for the list
- File: `src/constants/strings.ts` (after `accountDetail*`, `:283-293`); `src/constants/theme.ts` (`Size`, `:142`)
- Change: add `accountsListTitle: 'Accounts'` and `accountsListSection: 'Your accounts'`; `dashSeeAll` (`:252`) and `emptyAccountsCta` (`:340`, the `+` a11y label, as `add_card.tsx:23`) already exist. Add to `Size`: `accountTile: ms(28)`, `accountListRowMinHeight: ms(64)`, `reorderGripSlot: ms(16)`, `inlineLinkChevron: ms(14)`.
- Test: `__tests__/geometry_tokens.test.ts`, one `it` locking the four new values through `ms()` (the file's own pattern, `:7-15`).

### 2. Row geometry and resolvers, tested before the row exists
- File: `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts` (new)
- Change: export `ACCOUNTS_LIST_ROW_STYLE: Readonly<ViewStyle>`, frozen, keys exactly `minHeight` (`Size.accountListRowMinHeight`), `paddingLeft` (`Spacing.md`), `paddingRight` (`Spacing.sm`), `paddingVertical` (`Spacing.sm`), `gap` (`Spacing.sm`), `flexDirection`, `alignItems`; `resolveAccountTileColors(color: string | null): { background: string; glyph: string }` from `findAccountColor(...)` (`account_palette.ts:100`), `{ hex, tickColor }` of the entry, falling back to `DEFAULT_ACCOUNT_COLOR` and its own entry's `tickColor` for `null` or a hex outside the 32; `resolveAccountListRowA11yLabel(account)` = `${name}, ${ACCOUNT_TYPE_LABELS[type]}, ${value} ${code}` from `formatCurrencyParts(current_balance, currency)`. Same shape as `more_accounts.geometry.ts:18-49`; do not import from `onboarding/`.
- Test: `__tests__/screens/accounts/accounts_list.geometry.test.ts`, modelled on `__tests__/screens/onboarding_more_accounts.geometry.test.ts`: style keys and frozen; `minHeight === ms(64)`; `resolveAccountTileColors('#D4830A')` is `{ background: '#D4830A', glyph: CoreTokens.bg }` (saffron takes the dark glyph, B1) and `'#2D7D6E'` takes `CoreTokens.text1`; `null` and `'#ABCDEF'` fall back to `DEFAULT_ACCOUNT_COLOR`; the a11y label reads `current_balance` not `opening_balance`, prints USD at 2dp and EGP at 0dp (`makeTestAccount` from `@/test_helpers/transaction`).

### 3. The row component
- File: `src/modules/accounts/screens/accounts/list/components/account_list_row.tsx` (new)
- Change: `AccountListRow({ account, onPress }: { account: Account; onPress: (id: string) => void })`. `ListGroup.Item` with `onPress`, `style={ACCOUNTS_LIST_ROW_STYLE}`, `accessibilityRole="button"`, `accessibilityLabel={resolveAccountListRowA11yLabel(account)}`. `ListGroup.ItemPrefix` is the tile: `width/height Size.accountTile`, `borderRadius Radius.sm`, `backgroundColor` from `resolveAccountTileColors(account.color).background` (runtime hex in `style`, ui.md), holding `MaterialCommunityIcons name={ACCOUNT_TYPE_ICONS[account.type]} size={Size.iconXs} color={glyph}`. `ListGroup.ItemContent` (`flex: 1, minWidth: 0`): `ItemTitle` name, `font-inter-medium`, `Type.bodyStrong` with `lineHeightFor`, one line tail-ellipsis; under it a `Typography` `text-content-secondary font-inter` at `Type.caption`, `marginTop: Spacing.xxxs`, `ACCOUNT_TYPE_LABELS[account.type]`, no glyph (the tile carries it). `ListGroup.ItemSuffix` (`alignItems: 'flex-end', flexShrink: 0`, children replace the chevron): balance `Typography` `font-sora tabular-nums` with `className={resolveAccountBalanceColorClass(account.type)}` (`account_balance_color.ts:14`), `Type.bodyStrong`; code `text-content-secondary font-inter` `Type.micro`, `marginTop: Spacing.xxxs`; both from `formatCurrencyParts(account.current_balance, account.currency)`. Last child a `View` `width: Size.reorderGripSlot`, empty. Copy source: `more_accounts/components/account_row.tsx:20-99`.
- Test: `none`; render tests are forbidden (`tests.md`), the resolvers it calls are covered in step 2 and `__tests__/accounts/account_balance_color.test.ts`.

### 4. The screen hook
- File: `src/modules/accounts/screens/accounts/list/accounts_list.hook.ts` (new)
- Change: `useAccountsList()` returns `{ state: { accounts }, goToAccount, goToAddAccount, onBack }`. `accounts = useAccountStore((s) => s.accounts)` (active rows in `sort_order`, `accounts.ts:7-11`); `goToAccount(id)` → `router.push(`/accounts/${id}`)`, `goToAddAccount` → `router.push('/accounts/add_account')`, `onBack` → `router.back()`. No focus loader: the store reloads after every mutation (`account.store.ts:85-130`) and at startup (`use_layout_init.hook.ts:42`). No `.state.ts`, no `.store.ts`.
- Test: `__tests__/screens/accounts/accounts_list.hook.test.ts`, `renderHook` with the `expo-router` and store mocks of `__tests__/screens/accounts/account_detail.hook.test.ts:14-22` (`attachMockSelectorStore`): `state.accounts` is the store's array by reference; `goToAccount('acc-1')` pushes `/accounts/acc-1`; `goToAddAccount` pushes `/accounts/add_account`; `onBack` calls `back` once. "Archived accounts do not appear and count in no total" is already held by `__tests__/account.repository.test.ts:234` (`getAll no longer returns archived account`, real SQLite); the hook reads that `getAll` result through the store and adds no filter, so no new case.

### 5. The screen and its route
- File: `src/modules/accounts/screens/accounts/list/index.tsx` (new); `src/app/(app)/accounts/index.tsx` (new)
- Change: `AccountsListScreen`: `<Screen>` → `StackHeader` (`stack_header.tsx:11-15`) `title={Strings.accountsListTitle}` `onBack={onBack}` `right=` a `PressableFeedback` 36 square in the `detail/index.tsx:80-91` shape (`bg-surface border-border h-9 w-9 rounded-[8px] border`, `hitSlop`), `accessibilityRole="button"` `accessibilityLabel={Strings.emptyAccountsCta}`, holding `MaterialCommunityIcons name="plus" size={Size.iconBack} color={CoreTokens.text1}`, `onPress={goToAddAccount}`. Body: when `accounts.length === 0`, `<EmptyState variant="accounts" onAction={goToAddAccount} />` (`empty_state.tsx:44-50`); else `ScreenScroll` → `SectionHeader title={Strings.accountsListSection} count={accounts.length}` (`section_header.tsx:12`, uppercases itself) → `ListCard` (`list_card.tsx:11`) mapping rows with `index > 0 ? <Separator thickness={Size.hairline} /> : null` between (`more_accounts/index.tsx:150-157`), `AccountListRow account onPress={goToAccount}`. Not a `FlatList`. No `useState`. Route file is the one line `export { default } from '@/modules/accounts/screens/accounts/list';` — nothing else under `src/app/`.
- Test: `none`; render tests are forbidden. The route's gate is step 6's `npm run typecheck`: `router.push('/accounts')` fails at base (no route) and passes at head (`scripts/generate-typed-routes.js` regenerates `.expo/types/router.d.ts` before `tsc`).

### 6. "See all" on the dashboard strip opens the list
- File: `src/modules/dashboard/screens/dashboard/components/total_balance_strip.tsx` (`TotalBalanceStripProps`, `:26-32`; accounts column `:93-100`); `dashboard.hook.ts` (`:177-182`, return `:231-236`); `dashboard/index.tsx` (`:223-227`)
- Change: `TotalBalanceStripProps` gains required `onSeeAllPress: () => void`. Under the count in the accounts column, a HeroUI `LinkButton` (`node_modules/heroui-native/src/components/link-button/link-button.md`; Team Law 7, no custom pressable) `size="sm"` `onPress={onSeeAllPress}` `accessibilityRole="button"`, `marginTop: Spacing.xxs + Spacing.xxxs`, with `LinkButton.Label className="text-accent font-inter-semibold"` at `Type.caption` reading `Strings.dashSeeAll` and a `MaterialCommunityIcons name="chevron-right" size={Size.inlineLinkChevron} color={GoldTokens[500]}` beside it. Hook adds `goToAccountsList = useCallback(() => router.push('/accounts'), [router])` and returns it; index destructures it and passes `onSeeAllPress={goToAccountsList}`. Nothing else on the dashboard moves.
- Test: `__tests__/screens/dashboard/dashboard_hook.test.ts:523-545` (`retains Dashboard navigation and UI actions`): add `result.current.goToAccountsList()` to the `act` block and `['/accounts']` at the matching position in the expected `mockPush.mock.calls` list, written before the hook change so it fails at base. `__tests__/dashboard.store.test.ts` and `dashboard.repository.test.ts` are untouched by this step.

## Screens
- Dashboard, Accounts segment: the strip with "See all" under the count; nothing else changed against base.
- Dashboard strip "See all" → list; list header `+` → add-account form → back → list.
- Accounts list, populated: one EGP asset (gold, 0dp), one USD asset (gold, 2dp), one credit card (neutral) — tile colours and glyphs, type label under the name, empty 16 slot at the right edge, "YOUR ACCOUNTS" with the count pill, `+` square in the header.
- Accounts list → row → detail → back: lands on the list; back from the list lands on Dashboard, Overview segment.
- Accounts list, empty: archive the last account from detail; the list shows the accounts `EmptyState`; its CTA opens the add form.

## Non-goals
- The per-type caption under the name (MA-024); the row shows the type label.
- B2/B3 empty states (MA-025); the shipped `EmptyState` accounts variant stands in.
- Error state and retry (MA-026); the store's `loadError` is not read here.
- Drag-to-reorder (MA-016): the grip slot stays empty, no gesture, no handle glyph.
- The type filter rail B1 shows above the section header (MA-022).
- The archived accordion B1 shows under the list (MA-017).
- A new tab, a `FlatList`, a focus-effect reload of accounts, a new `SectionHeader` or `ListCard`, any change to N3's row, any dashboard change beyond the `LinkButton` and its callback.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- Geometry is read from the canvas today (`B1` = `Main.dc.html`); a canvas revision moves the four `Size` values in step 1 and nothing else.
- `Size.accountListRowMinHeight` 64 is B1's row with MA-024's caption; a name-plus-type row fills ~62, so the min-height holds the row and MA-024 changes no token.
- `formatCurrencyParts` prints Intl's ASCII hyphen for an overdrawn (negative) bank balance, as the N3 row does today; `formatOwnedAmountParts` (U+2212) lives in `dashboard/` and is not imported across modules here. Not this ticket's acceptance.
- `LinkButton` is unused in `src/` today; if its `sm` label size fights `Type.caption`, the `Label` `style` `fontSize`/`lineHeightFor` pair wins (`ui.md`).
- Jest ignores `<rootDir>/.claude/` and `.worktrees/`; run the suites from the worktree root, where `rootDir` is the worktree itself.
- Amended 2026-09-07 after review: step 6's test was wrong (`dashboard_hook.test.ts:523-545` asserts the full `router.push` list, so the new callback needs a line there); step 4 now cites the existing archived-rows test; Screens gained the "See all" and `+` walk, the two `router.push` callbacks with no store effect.

## Self-assessment
Step 6 is the least certain: `LinkButton` has never been used in this repo, and its root is a ghost `Button` whose padding and min-height in 1.0.8 (`link-button.css` sets `height: auto; padding: 0`, but the button base may still add horizontal padding) could push "See all" out of right alignment under the count. If it does, the fix is `className="p-0 h-auto"` on the root and `alignSelf: 'flex-end'`, not a hand-rolled pressable. Everything else copies a shape that already ships: the row is N3's row with a tile and a slot, the header is the detail's, the hook is the detail's minus the form.
