# MA-175 — Every load-error alert's small retry takes a 44-high tap band, from one slop helper
base: 97669098a34fb0191fd40979d4da779e37d5785e · verify: emulator · flags: none · expected diff: ~65 lines

## Steps
### 1. One helper gives the top and bottom slop that lifts a control to the touch floor
- File: `src/constants/theme.ts` (new `touchFloorHitSlop`, declared after `TOUCH_SLOP_PIXEL_MARGIN` at `:284`)
- Change: `touchFloorHitSlop(height: number): { top: number; bottom: number }`. `height` is required and never `null`. Both fields are required, never `null`, and equal `touchFloorSlop(height) + TOUCH_SLOP_PIXEL_MARGIN`, so a height at or past 44 still gets the margin on each side, as `load_error_alert.geometry.ts:26` does today. Returns a new object per call. `touchFloorSlop` stays exported.
- Test: `first` · `__tests__/constants/touch_floor_slop.test.ts`, a `touchFloorHitSlop` block: for heights 16, 28, 34.5 and 40, `top === bottom` and `height + top + bottom` is close to `TouchSize.min + 2 * TOUCH_SLOP_PIXEL_MARGIN`; for 44 and 56, each side is `TOUCH_SLOP_PIXEL_MARGIN`.

### 2. Every `sm` retry takes the band, tinted or not, and the alert reads the helper
- File: `src/components/ui/load_error_alert.geometry.ts` (`resolveLoadErrorRetryHitSlop`, `:20-28`), `src/components/ui/load_error_alert.tsx` (the one caller, `:143`)
- Change: the resolver becomes `resolveLoadErrorRetryHitSlop(retrySize: ButtonSize, fontScale: number): { top: number; bottom: number } | undefined`, in that order, both arguments required; `tinted` is removed. It returns `touchFloorHitSlop(resolveSmallButtonHeight(fontScale))` when `retrySize === 'sm'` and `undefined` for `md` and `lg`. The caller drops its third argument; `tinted` still drives the tone. The geometry file drops its `TOUCH_SLOP_PIXEL_MARGIN` and `touchFloorSlop` imports. No mount changes: the 14 untinted mounts in Context take `sm` by default, and `transaction_form_data_error.tsx:16` passes `md`.
- Test: `first` · `__tests__/components/ui/load_error_alert.geometry.test.ts`: the `:30-50` cases become two. An `sm` retry at font scale 1 and 2: slop defined, `top === bottom`, band `>= TouchSize.min` and close to `Math.max(height, TouchSize.min) + 2 * TOUCH_SLOP_PIXEL_MARGIN`. An `md` retry at 1 and 2: `undefined`. At base the `sm` case fails, since the untinted call returns `undefined`.

### 3. The add and edit sheet reads the helper
- File: `src/modules/transactions/screens/transactions/transaction_form/components/transaction_form.geometry.ts` (`ACCOUNT_STRIP_CHIP_SLOP_Y` `:63-64`, `resolveTypeTabsGeometry` `:180`, `:184`)
- Change: `ACCOUNT_STRIP_CHIP_SLOP_Y = touchFloorHitSlop(ACCOUNT_STRIP_CHIP_HEIGHT).top`; `resolveTypeTabsGeometry` returns `triggerHitSlop: touchFloorHitSlop(compact.triggerHeight)`, which fits `TabsTriggerHitSlop` (`tabs.geometry.ts:15-18`). The values do not change. The file drops its `TOUCH_SLOP_PIXEL_MARGIN` and `touchFloorSlop` imports.
- Test: `none` · the values do not change, and `__tests__/screens/transactions/transaction_form/account_strip.geometry.test.ts:33-43` and `__tests__/screens/transactions/transaction_form/transaction_form.geometry.test.ts:131-142` pin them.

### 4. The empty state's link, the account chips and the reorder grip take the helper, margin included
- File: `src/components/ui/empty_state.tsx` (`resolveEmptyStateLinkHitSlop` `:176-179`), `src/modules/transactions/screens/transactions/components/account_chips.tsx` (`CHIP_SLOP_Y` `:22`), `src/modules/accounts/screens/accounts/list/accounts_list.geometry.ts` (`ACCOUNTS_LIST_GRIP_HIT_SLOP` `:106-111`)
- Change: `resolveEmptyStateLinkHitSlop(lineHeight)` keeps its signature and returns `touchFloorHitSlop(lineHeight + 2 * Spacing.xs)`. `CHIP_SLOP_Y = touchFloorHitSlop(Size.compactChipHeight).top`; the row paddings at `:25-26` keep their `Math.max`, so at 411 dp the padding reads 9 and 8 as today, and at 390 dp or narrower it grows up to 2 dp. The grip spreads `touchFloorHitSlop(Size.reorderGripSlot)` for `top` and `bottom` and keeps `right` and `left: 0`, still frozen. Each file drops its `touchFloorSlop` import.
- Test: `first` · `__tests__/components/ui/empty_state_placement.test.ts:18-37`: under the floor, `lineHeight + LINK_PADDING + top + bottom` is close to `TouchSize.min + 2 * TOUCH_SLOP_PIXEL_MARGIN`; at and past the floor, `{ top: TOUCH_SLOP_PIXEL_MARGIN, bottom: TOUCH_SLOP_PIXEL_MARGIN }`. `__tests__/screens/accounts/accounts_list.geometry.test.ts:257-264`: `top === bottom` and `Size.reorderGripSlot + top + bottom` close to `TouchSize.min + 2 * TOUCH_SLOP_PIXEL_MARGIN`. `CHIP_SLOP_Y` is module-private: the emulator row covers it.

### 5. Every toast fades in and out where it rests
- File: `src/components/ui/toast.anim.ts` (new), `src/components/ui/toast.tsx` (`TOAST_PROVIDER_PROPS` `:16-19`)
- Change: `toast.anim.ts` holds two module constants, `TOAST_FADE_IN_MS = 200` and `TOAST_FADE_OUT_MS = 150`, and exports `TOAST_ANIMATION = { entering: { top: FadeIn.duration(TOAST_FADE_IN_MS), bottom: <same> }, exiting: { top: FadeOut.duration(TOAST_FADE_OUT_MS), bottom: <same> } } satisfies ToastRootAnimation`, the type from `heroui-native`. Each builder is exactly `FadeIn.duration(n)` or `FadeOut.duration(n)` with no further chained call, since the Jest factories below implement `duration` alone. No `opacity`, `translateY`, `scale` or `state` key, so the hide under a newer toast stays HeroUI's 300 ms fade, 10 dp rise and 0.97 shrink (`node_modules/heroui-native/src/components/toast/toast.animation.ts:124-161`). `TOAST_PROVIDER_PROPS.defaultProps` becomes `{ placement: 'bottom', animation: TOAST_ANIMATION }` and stays a module constant, since HeroUI memoizes its config on the `defaultProps` reference (`node_modules/heroui-native/src/providers/toast/provider.tsx:134-137`). HeroUI runs `entering` and `exiting` on the outer wrapper and the hidden opacity 0 on the inner root (`toast.tsx:192-199`, `toast.animation.ts:352`), so a hidden older toast's fade out stays unseen; the swipe gesture is untouched. Real `react-native-reanimated` throws at import under this Jest setup, and so does `react-native-reanimated/mock` (`loadUnpackers` of undefined, `node_modules/react-native-worklets/src/WorkletsModule/NativeWorklets.native.ts:411`), so every suite that loads `toast.tsx` without mocking it takes a reanimated factory.
- Test: `first` · `__tests__/components/ui/toast_provider.test.ts`: `jest.mock('react-native-reanimated', () => ({ FadeIn: { duration: (ms: number) => ({ fade: 'in', ms }) }, FadeOut: { duration: (ms: number) => ({ fade: 'out', ms }) } }))`, and a case that `TOAST_PROVIDER_PROPS.defaultProps.animation` `toStrictEqual`s `{ entering: { top: { fade: 'in', ms: 200 }, bottom: { fade: 'in', ms: 200 } }, exiting: { top: { fade: 'out', ms: 150 }, bottom: { fade: 'out', ms: 150 } } }`, with 200 and 150 as literals. The same factory goes into `__tests__/components/ui/toast_clearance.state.test.ts`, `__tests__/components/ui/toast_success_icon.test.ts` and `__tests__/screens/transactions/transaction_form/transaction_form_host.test.tsx`, which load `toast.tsx` unmocked today; it adds no case.

### 6. The three band rows read a tap in the band, and the chip row reads the new slop
- File: `.claude/skills/emulator-verify/features/README.md` (the proof templates after `Header proof`), `.claude/skills/emulator-verify/features/dashboard.md` (`load error retry, large font` `:27`), `.claude/skills/emulator-verify/features/budget.md` (`copy sheet preview error, large font` `:30`), `.claude/skills/emulator-verify/features/account_detail.md` (`activity load error retry, large font` `:41`), `.claude/skills/emulator-verify/features/transactions.md` (`account chip hit area` `:45`)
- Change: README gains a `Band proof` (MA-175) template. The row's force runs `console.log(<tag>)` before its `throw`, and a store that logs with `console.error`, the dashboard's and the activity card's, also takes `LogBox.ignoreAllLogs(true)` per README § Source force. On the retry's `mqa bounds` box at each scale the row names, `tapxy` at its horizontal centre 4 px above its top and 4 px below its bottom, bounds in px as dp × 2.625 rounded, each adds one `<tag>` to `mqa logs --info`; a tap 16 px above its top adds none. The slop is 3 dp at 1.0 and 2.0 on the 411 dp emulator, `resolveSmallButtonHeight` 40 at both; on `main` an untinted alert's 4 px taps add none. The three rows append the `Band proof` to their Proof cell. The dashboard row runs it at 1.0 and stacked at 2.0 on `Retry` (`Strings.dashboardLoadRetry`), and its Proof cell's `Try again` becomes `Retry`, the label on screen. The copy sheet row's Force gains, at 2.0, `mqa scroll down --until 'label="Copy budget"'` before the tap on `Copy budget`, which sits below the fold at that scale. The chip row's slop becomes `touchFloorHitSlop(Size.compactChipHeight)`, 8 dp or 21 px at 411; its probes move to 19 px above and below, which miss on `main` at 7 dp, 18 px truncated.
- Test: `none` · a recipe file; the implementer and the render lens run it.

### 7. Every toast row reads the fade in place, and the accounts list gains the two-unarchive state
- File: `.claude/skills/emulator-verify/features/README.md`, `.claude/skills/emulator-verify/features/transactions.md` (`:90`, `:91`), `.claude/skills/emulator-verify/features/transaction_detail.md` (`:21`), `.claude/skills/emulator-verify/features/dashboard.md` (`:28`), `.claude/skills/emulator-verify/features/commitments.md` (`:34`), `.claude/skills/emulator-verify/features/budget.md` (`:37`), `.claude/skills/emulator-verify/features/accounts_list.md` (`after unarchive` `:23`, new row after it)
- Change: README gains a `Toast fade proof` (MA-175) template. The force sets `TOAST_FADE_IN_MS` and `TOAST_FADE_OUT_MS` in `src/components/ui/toast.anim.ts` to 3000, reverted with `git status` clean. Two `mqa bounds` reads of the label while it fades in, as soon as `mqa wait` finds it and once at rest; two shots while it fades out, from 4 s after it showed. Every read gives the resting box ± 1 dp, each shot draws the toast faint inside that box and nothing of it lower, and the box intersects neither `fab-button`'s, a tab cell's clickable node nor the floating alert's where the row names one. Each of the seven toast rows appends the `Toast fade proof`; the three that end "one shot, taken before the toast leaves, since a toast on its way out slides down across the alert" lose that clause. New row in `accounts_list.md`: `two unarchives inside four seconds` · `no frame, MA-175` · two archived accounts from `archived card expanded`, the `Toast fade proof` force, `$MQA tap 'Unarchive'` twice inside 2 s · from 4 s after the first tap until the second toast has gone, one shot per second, each showing `<second name> restored.` or no toast and never `<first name> restored.`, alone or through the newer toast's 60% black; `mqa db` reads `is_archived` 0 for both.
- Test: `none` · a recipe file; the implementer and the render lens run it.

## Screens
- `emulator-verify/features/dashboard.md`: load error retry, large font
- `emulator-verify/features/budget.md`: copy sheet preview error, large font
- `emulator-verify/features/account_detail.md`: activity load error retry, large font
- `emulator-verify/features/transactions.md`: toast after a delete
- `emulator-verify/features/transactions.md`: toast after a delete, refresh failed
- `emulator-verify/features/transaction_detail.md`: saved toast after edit, refresh failed
- `emulator-verify/features/dashboard.md`: saved toast, refresh failed
- `emulator-verify/features/commitments.md`: saved toast, refresh failed
- `emulator-verify/features/budget.md`: saved toast, refresh failed
- `emulator-verify/features/accounts_list.md`: after unarchive
- `emulator-verify/features/accounts_list.md`: two unarchives inside four seconds, new, step 7 adds it
- `emulator-verify/features/transactions.md`: account chip hit area

## Non-goals
- The tint, the flat retry and the toast's place over a floating alert, MA-161 (#680).
- Replacing the transaction detail's first-load alert with the error block, MA-182 (#723).
- The tabs' and the month filter's slop: `transactions_rail.geometry.ts`, `tabs.geometry.ts` and `month_filter.geometry.ts` keep their arithmetic and their `{ top, bottom }` types.
- A band for the `md` retry, or any change to a retry's drawn size.
- Any change to the toast's insets, placement, 4000 ms duration, swipe, look or stack hide; any per-call or per-screen toast config.
- A render suite for `LoadErrorAlert`, a new `.tsx` test file, or a global reanimated mock in `jest.setup.js` or `__mocks__/`.

## Untested inputs
- The account chip row's padding at 390 dp or narrower, step 4: module constants from `ms()` at load; the 411 dp row reads no change.
- A toast swiped down, step 5: the gesture path is HeroUI's and untouched.
- A hidden older toast leaving unseen, step 5: HeroUI's inner opacity; read by `accounts_list.md · two unarchives inside four seconds`.
- The band on the 11 mounts no device row reads, step 2: the resolver's case covers every `sm` mount, per the 2026-10-13 Decision.
- The grip's and the empty-state link's bands on a device, step 4: no Screen checks row.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `dashboard.md · load error retry, large font`: the 3 dp slop truncates to 7 px on the 2.625 device, so the 4 px probe sits 3 px inside; stacked at 2.0 the retry sits 8 dp under the message, and the 16 px probe lands in that gap.
- `budget.md · copy sheet preview error, large font`: the alert sits in the sheet's scroll content; a clipping ancestor drops the band's outer pixels.
- `account_detail.md · activity load error retry, large font`: the activity card is a rounded card; if it clips, the band's bottom pixels below the alert are lost.
- `transactions.md · account chip hit area`: at 411 dp the row's bottom padding equals the 8 dp slop, and Android drops a touch outside the ScrollView, so the 19 px probe has 2 px of room.
- `mqa bounds` may not list the label while Reanimated runs the exit on a removed view; the template reads the exit from shots for that reason.
- Under the 3000 ms force the toast rests 1 s of HeroUI's 4000 ms, so the second fade-in read must come within that second.
- A suite that starts loading `toast.tsx` without a reanimated factory fails at import.
- A HeroUI bump that moves `exiting` off the outer wrapper or the hidden opacity off the inner root lets a hidden toast show as it leaves.
- not probed: `transactions.md · account chip hit area`
- REBUILD: `package-lock.json`, `package.json`, `patches/expo-router+57.0.27.patch`. These are main's native changes, not this ticket's: the slot's APK predated them, and an APK built at `97669098` reads REUSE.

## Self-assessment
Step 7 is the step I am least sure of. The `Toast fade proof` depends on two device behaviours I read from source and did not run: that `mqa bounds` still lists a label near opacity 0 while it fades in, and that a 3000 ms force leaves room for two reads inside HeroUI's fixed 4000 ms. If either fails, the render lens reads motion from shots alone, which is weaker evidence than a bounds read.
