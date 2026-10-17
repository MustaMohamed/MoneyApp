# MA-194 — Every action on the right of the stack header is a shared header component
base: 9deefd77e98f9ff2a65ac3ff8f70d66b83b6cc31 · verify: emulator · flags: none · expected diff: ~158 lines

## Steps
### 1. One box token, one tap-band token, and a header text label on `Type.micro` at every scale
- File: `src/constants/theme.ts` (`Size.headerTextActionTrack`, `theme.ts:162-163`); `src/components/ui/stack_header.geometry.ts` (`HeaderTextActionGeometry`, `resolveHeaderTextActionGeometry`, `:19-33`); `src/components/ui/header_text_action.tsx` (`:28-30`)
- Change: rename `Size.headerTextActionTrack` to `Size.headerActionTrack` (raw 36, comment now names every header action's and back button's box) and add `Size.headerActionSlop: 8` (raw, never `ms()`, one-line comment: the tap band past each side of that box). In the geometry file export `HEADER_ACTION_HIT_SLOP: { top: number; bottom: number; left: number; right: number }`, each field `Size.headerActionSlop`, all required, none null, assignable to RN `Insets`. `HeaderTextActionGeometry` becomes `{ label: ScaledTextStyle; allowFontScaling: boolean; minWidth: number; height: number }`, all required, none null. `resolveHeaderTextActionGeometry(fontScale: number)`: `allowFontScaling` is `fontScale <= 1`; `label` is `scaledTextStyle(Type.micro, allowFontScaling ? 1 : fontScale)`; `minWidth` is `Size.headerActionTrack`; `height` is `Math.max(Size.headerActionTrack, label.lineHeight + 2 * Size.hairline)`. Above scale 1 every value equals today's. In `header_text_action.tsx` the label drops `text-[11px]` (Rules: type from the theme tokens) and takes `allowFontScaling={geometry.allowFontScaling}`, `style={geometry.label}`.
- Test: `first` · `__tests__/components/ui/stack_header.geometry.test.ts`: the 0.85 and 1 cases read `{ label: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) }, allowFontScaling: true, minWidth: 36, height: 36 }`; the 2 and 3 cases add `allowFontScaling: false`; a new case asserts `HEADER_ACTION_HIT_SLOP` equals the literal `{ top: 8, bottom: 8, left: 8, right: 8 }`; the comment at `:43` names `headerActionTrack`.

### 2. One shared header box, drawn by the icon action, the text action and the back button
- File: new `src/components/ui/header_icon_action.tsx`; `src/components/ui/header_text_action.tsx`; `src/components/ui/back_button.tsx`; `src/components/ui/stack_header.tsx` (`:29-38`, `:47`); `src/app/(app)/settings/_layout.tsx` (`SettingsBackButton`, `:12`)
- Change: the new file exports `HeaderActionBox(props: { accessibilityLabel: string; onPress: () => void; style: ViewStyle; children: React.ReactNode })`, all required, none null: a HeroUI `PressableFeedback` (Rules: stays on its primitive) with `hitSlop={HEADER_ACTION_HIT_SLOP}`, `accessibilityRole="button"`, colour classes `bg-surface border-border items-center justify-center`, and `style={{ borderRadius: Radius.sm, borderWidth: Size.hairline, ...style }}` (corner per audit M44's recommendation, `docs/superpowers/reviews/2026-07-29-full-technical-audit.md:1104`; border 1, the width `resolveHeaderTextActionGeometry` already counts). It also exports `HeaderIconAction(props: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; iconSize: number; iconColor: string; accessibilityLabel: string; onPress: () => void })`, all required, none null: `HeaderActionBox` with `style={{ width: Size.headerActionTrack, height: Size.headerActionTrack }}` around the glyph. `HeaderTextAction` keeps `{ label: string; onPress: () => void }` and renders `HeaderActionBox` with `style={{ minWidth: geometry.minWidth, height: geometry.height, paddingHorizontal: Spacing.xxs }}` (`px-1` as a token), dropping its own `hitSlop` const and `rounded-[8px]`. `BackButton` keeps `{ onPress: () => void }` and renders `HeaderIconAction` with `chevron-left`, `Size.iconBack`, `CoreTokens.text2`, `Strings.goBackAccessibility`. `StackHeader` renders `<BackButton onPress={handleBack} />` in place of its inline copy, and its empty right slot is `<View style={{ width: Size.headerActionTrack }} />`; unused imports go. `SettingsBackButton`'s wrapper becomes `{ paddingLeft: 0, paddingRight: Size.headerActionSlop, paddingVertical: Size.headerActionSlop }`, `Size` for `Spacing` in the import, and its comment at `:8` becomes one line saying the native header clips its left item at the item's edge, so this padding is the back button's tap band. The native header's left item is a `ScreenStackHeaderSubview`, a plain `ViewGroup` (`node_modules/react-native-screens/android/src/fabric/java/com/swmansion/rnscreens/FabricEnabledHeaderSubviewViewGroup.kt:12-14`) whose `clipChildren` nothing overrides (the only override is the toolbar's, `ScreenStackHeaderConfig.kt:507`), sized to the wrapper React measures (`ScreenStackHeaderSubview.kt:54-71`). RN drops a touch outside a clipping `ViewGroup` (`node_modules/react-native/ReactAndroid/src/main/java/com/facebook/react/uimanager/TouchTargetHelper.kt:188-208`). So the subview at 44 by 52, centred in the toolbar, is the band of Decisions 2026-10-17: 8 above, below and right, none left, the box where it draws today.
- Test: `none` · no `.ts` logic in these files and no new `.tsx` suite is allowed; `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx` 'puts edit in the standard header for an ordinary transaction' presses `Go back` through the new `BackButton` and stays green, and `__tests__/screens/budget/fifty_thirty_twenty_ledger.test.tsx` renders `CategoryDetailSkeleton` with its `BackButton`.

### 3. The commitment detail's `Edit` is the account detail's `HeaderTextAction`
- File: `src/modules/commitments/screens/commitments/detail/index.tsx` (`:30-42`)
- Change: `right` is `<HeaderTextAction label={Strings.commitmentsDetailEdit} onPress={goToEdit} />` under the unchanged `state.commitment && state.viewState !== 'loading'` guard, else `undefined` (Decisions 2026-10-16, first line). `PressableFeedback` and `GoldTokens` imports go; `Text` stays for the not-found line.
- Test: `none` · no render suite holds this screen and a new `.tsx` file is forbidden; `commitment_detail.md · header title, large font` proves it.

### 4. The spending plan detail's edit and the accounts list's add draw `HeaderIconAction`
- File: `src/modules/budget/screens/budget/spending_plan_detail/index.tsx` (`:27-42`); `src/modules/accounts/screens/accounts/list/index.tsx` (`:71-82`)
- Change: spending plan: `HeaderIconAction` with `icon="pencil-outline"`, `iconSize={Size.iconSm}`, `iconColor={Colors.dark.gold}`, `` accessibilityLabel={`${Strings.budgetPlanEditTitle} ${plan.name}`} ``, `onPress={editPlan}`, under the unchanged `state.viewState === 'ready' && plan` guard; the `PressableFeedback` import goes. Accounts list: `HeaderIconAction` with `icon="plus"`, `iconSize={Size.iconBack}`, `iconColor={CoreTokens.text1}`, `accessibilityLabel={Strings.emptyAccountsCta}`, `onPress={goToAddAccount}`, in every state; the `PressableFeedback`, `MaterialCommunityIcons` and `Radius` imports go, `Typography` stays (`:164`).
- Test: `none` · neither screen has a render suite and a new `.tsx` file is forbidden; `spending_plan_detail.md` and `accounts_list.md` rows prove them.

### 5. The transaction detail's edit draws `HeaderIconAction`, its spinner the box's size
- File: `src/modules/transactions/screens/transactions/detail/components/detail_header.tsx` (`:22-45`)
- Change: the editable branch is `HeaderIconAction` with `icon="pencil-outline"`, `iconSize={Size.iconSm}`, `iconColor={GoldTokens[500]}`, `accessibilityLabel={Strings.detailEditAccessibility}`, `onPress={onEdit}`; the refreshing `Spinner` keeps `size="sm"` and its label and takes `style={{ width: Size.headerActionTrack, height: Size.headerActionTrack }}` for `h-9 w-9`. Branch order unchanged: refreshing, then editable, then `undefined` (MA-094 keeps the pencil). `PressableFeedback`, `MaterialCommunityIcons` and `Radius` imports go.
- Test: `after` · `__tests__/screens/transactions/detail/detail_screen_actions.test.tsx`, one case under the Render-suite policy (Acceptance names the tap band and the spinner's place and size): editable and not refreshing, `getByLabelText(Strings.detailEditAccessibility)` and `getByLabelText(Strings.goBackAccessibility)` each have prop `hitSlop` equal to `HEADER_ACTION_HIT_SLOP` and style `{ width: Size.headerActionTrack, height: Size.headerActionTrack, borderRadius: Radius.sm, borderWidth: Size.hairline }`; refreshing, `getByLabelText(Strings.detailRefreshingAccessibility)` has style `{ width: Size.headerActionTrack, height: Size.headerActionTrack }`.

### 6. The budget category detail's pencil draws `HeaderIconAction`
- File: `src/modules/budget/screens/budget/category_detail/index.tsx` (`:71-81`, `styles.editBtn` at `:122`)
- Change: `HeaderIconAction` with `icon="pencil"`, `iconSize={Size.iconBack}` (ms(20), the token the accounts list's `plus` draws with at `accounts/list/index.tsx:80`), `iconColor={Colors.dark.gold}`, `accessibilityLabel={Strings.budgetEditTitle}`, `onPress={editBudget}`, under the unchanged `state.liveMonth && state.canEditLiveBudget` guard. `styles.editBtn` and the `PressableFeedback` import go; `Size` joins the theme import. Its two `BackButton`s (`:39`, `:62`) and the skeleton's (`category_detail_skeleton.tsx:12`) take the shared box through step 2 unchanged.
- Test: `none` · no render suite holds the loaded screen and a new `.tsx` file is forbidden; `budget_category_detail.md` rows prove it.

### 7. The features files read the shared box and its tap band
- File: `.claude/skills/emulator-verify/features/commitment_detail.md`, `account_detail.md`, `spending_plan_detail.md`, `budget_category_detail.md`, `categories.md`
- Change: commitment_detail `header title, large font`: the proof becomes the `Header proof` (README) on the commitment's name with `Edit` read as account_detail's row reads it, 36 by 36 ± 1 dp at 1.0 and `resolveHeaderTextActionGeometry(2).height` high, at least 36 wide, at 2.0, its label's `TextView` inside it; at 1.0 the title is 8 dp wider than on `main` (323.4 against 315.4), whose `Edit` was a borderless 43.8 by 22.48, and the hero below the header sits where it does on `main` (probe: 35.8 by 35.81 at 1.0, 57.1 by 35.81 at 2.0); the clauses comparing with pre-MA-173 `main` go; Frame adds MA-194. account_detail `header title and Edit action, large font`: the label reads `Type.micro` at 1.0, 11.43 dp on the 411 dp emulator against `main`'s 11, its `TextView` 23.6 by 15.24 against `main`'s 22.9 by 28.19 with its centre unchanged, so the 1.0 crop matches `main` but for the label; Frame adds MA-194. budget_category_detail `readable text, large font`: the 1.0 shots match `main` but for the pencil in the 36 box and the title line beside it, 7 dp narrower; Frame adds MA-194. Append three states, each `no frame, MA-194`, at 1.0, each tap a `tapxy` at an edge's centre 19 px (7.2 dp) outside it, bounds in px as dp × 2.625 rounded: spending_plan_detail `header edit tap band` (a seeded plan; the pencil reads 36 by 36 ± 1 dp; each of the four taps opens the plan sheet, closed between; a tap 24 px above its top opens nothing; on `main` the 19 px taps open nothing); budget_category_detail `header back and edit tap band` (a category whose budget covers the device's month, so the pencil draws; `label="Go back"` and `label="Edit budget"` each 36 by 36 ± 1 dp; four taps round the pencil each open the set-budget sheet, four round the back box each land on the `Budget` tab, reopened between; on `main` the back box takes no tap outside it); categories `header back button tap band` (reached by the user path, Settings then the `Categories` row; `label="Go back"` 36 by 36 ± 1 dp, its left edge 16 dp from the screen's, as on `main`; taps above, below and right each land on Settings, reopened between; a tap 19 px left of its left edge stays on Categories, Decisions 2026-10-17; the 1.0 header crop matches `main`).
- Test: `none` · emulator recipes, no code.

## Screens
- `emulator-verify/features/commitment_detail.md`: header title, large font
- `emulator-verify/features/account_detail.md`: header title and Edit action, large font
- `emulator-verify/features/spending_plan_detail.md`: header title, large font
- `emulator-verify/features/spending_plan_detail.md`: header edit tap band (new, step 7)
- `emulator-verify/features/transaction_detail.md`: header title, large font
- `emulator-verify/features/accounts_list.md`: header title, large font
- `emulator-verify/features/budget_category_detail.md`: readable text, large font
- `emulator-verify/features/budget_category_detail.md`: header back and edit tap band (new, step 7)
- `emulator-verify/features/categories.md`: header back button tap band (new, step 7)

## Non-goals
- The dashboard's settings gear (`dashboard/index.tsx:112-122`) and `Size.backBtn`: a tab screen's header.
- The canvas `.hdr-btn`'s 13 px semibold type, 10 px padding and `.gold` variant: the text action stays the account detail's (Decisions 2026-10-16).
- The transactions canvas's text `Edit` in the transaction detail header (MA-094 keeps the pencil).
- Other `h-9 w-9` boxes outside a header slot (`transfer_flow_card.tsx:54`, `commitment_rows_skeleton.tsx:26`).
- A lint or structural guard for icon-only pressables (audit M44's last recommendation).
- Any change to the other `StackHeader` screens (add account, edit account, commitment form, onboarding) beyond the back button they inherit.

## Untested inputs
- The commitment detail's `Edit` box and binding: step 3, emulator only.
- The spending plan's edit and the accounts list's add, box and binding: step 4, emulator only.
- The budget category detail's pencil and back button band: step 6, emulator only.
- The settings back button's band and its clipped left edge: step 2, emulator only.
- The budget category detail's load-error back (`category_detail/index.tsx:39`) and skeleton back (`components/category_detail_skeleton.tsx:12`): step 2, no Screens row walks either; `fifty_thirty_twenty_ledger.test.tsx:362` only renders the skeleton.
- Every other tap band on a device, since a `hitSlop` prop in Jest proves nothing about Android hit-testing: steps 2 to 6, emulator only.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `categories.md · header back button tap band`: the band above, below and right is the wrapper's padding inside a clipping header subview, not `BackButton`'s slop; only the comment at `_layout.tsx:8` guards it, so an edit that ignores the comment drops it with no test failing.
- `account_detail.md · header title and Edit action, large font`: the label moves from raw 11 to `Type.micro` at 1.0 under the Rules line; a reviewer reading "as today" may count it as drift.
- `budget_category_detail.md · readable text, large font`: the pencil's box is 7 dp wider than today's target, so a title that fit one line at 1.0 may wrap or end in `…` sooner.
- not probed: `spending_plan_detail.md · header edit tap band`
- not probed: `transaction_detail.md · header title, large font`
- not probed: `accounts_list.md · header title, large font`
- not probed: `budget_category_detail.md · readable text, large font`
- not probed: `budget_category_detail.md · header back and edit tap band`
- not probed: `categories.md · header back button tap band`
- REBUILD: none, the probe's build verdict was REUSE.

## Self-assessment
Least sure about the settings back button in step 2. Its band comes from the wrapper's padding growing the clipping header subview to 44 by 52, read from react-native-screens and RN source, and the probe did not reach `categories.md · header back button tap band`, so the toolbar centring the taller subview with the box unmoved is unmeasured. Second is step 1's label change. The Rules line puts type under the theme tokens, and `Type.micro` is what the resolver already uses above scale 1. The probe measured the account detail's `Edit` label at 23.6 by 15.24 against `main`'s 22.9 by 28.19, centre unchanged, inside the same 36 box. A reviewer may still read that as drift on a screen the ticket otherwise leaves alone.
