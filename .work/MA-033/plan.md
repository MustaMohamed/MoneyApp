# MA-033 — Adjust balance sheet: the keyboard covers the field and Save

base: 73da991b · verify: emulator · flags: none · expected diff: ~25 lines

## Root cause, from the engine's source

`@gorhom/bottom-sheet` treats `android_keyboardInputMode="adjustResize"` as a promise that the OS window will shrink, and switches its own compensation off:

- `node_modules/@gorhom/bottom-sheet/src/components/bottomSheet/BottomSheet.tsx:1692-1710` — on Android with `adjustResize` it forces `heightWithinContainer = 0`, and when `keyboardBehavior === 'interactive'` it writes the keyboard state and **returns before `evaluatePosition`**, so the sheet never animates.
- `:846-860` — the `interactive` branch that lifts the sheet is itself guarded by `!(Platform.OS === 'android' && android_keyboardInputMode === 'adjustResize')`.
- `components/bottomSheetFooter/BottomSheetFooterContainer.tsx:23-33` — the absolute footer's `translateY` subtracts `heightWithinContainer`, which the guard above pinned to `0`. This is why Save stays under the IME.

`extend` (`BottomSheet.tsx:822-828`) and `fillParent` (`:833-841`) run before that guard, so they do move the sheet, but neither restores `heightWithinContainer`, so neither lifts the footer. Only taking `android_keyboardInputMode` off `adjustResize` makes both the sheet and the footer move. gorhom's own default for that prop is `adjustPan` (`components/bottomSheet/types.d.ts:179-185`); `src/components/ui/sheet.tsx:171` overrides it.

The knob is scoped to this sheet, not flipped for all 20 consumers of `src/components/ui/sheet.tsx`: five of them (`add_edit_category_sheet`, `pay_sheet`, `set_budget_sheet`, `spending_plan_sheet`, `transaction_form`) pair a keyboard input with `scrollable`, and none is on the emulator matrix for this ticket. The `.claude/rules/ui.md:34` prescription of `extend` stays unresolved — the source above shows `extend` cannot satisfy this ticket's footer clause, so this change is not a ruling on it.

## Steps

### 1. The keyboard knobs become one resolved, testable object with an opt-in

- File: `src/components/ui/sheet.tsx` (`SheetProps`, `Sheet`, `sheet.tsx:166-176`), `.claude/rules/ui.md:34`, `.claude/skills/heroui-native/SKILL.md:62`
- Change: add `liftsAboveKeyboard?: boolean` to `SheetProps`, defaulting `false`. Add an exported pure `resolveKeyboardProps(liftsAboveKeyboard: boolean)` returning `{ keyboardBehavior: 'interactive', keyboardBlurBehavior: 'restore', android_keyboardInputMode }` as a `const`-typed object, where `android_keyboardInputMode` is `'adjustPan'` when the flag is set and `'adjustResize'` otherwise. Spread it onto `BottomSheet.Content` in place of the three literals at `:169-171`, keeping it after `{...contentSizingProps}` so neither spread shadows the other. The literal types must be `as const` or narrowed — gorhom types both props as `keyof typeof KEYBOARD_BEHAVIOR` / `keyof typeof KEYBOARD_INPUT_MODE`, not `string`. After this step alone every existing consumer resolves the same trio it has today. The prop carries a one-line JSDoc like every other prop in `SheetProps` (`:58,61,63,65,67,69,71`), naming its Android-only scope — iOS never reaches the guard at `BottomSheet.tsx:851-854` — and the two places that prescribe the sheet keyboard recipe, `.claude/rules/ui.md:34` and `.claude/skills/heroui-native/SKILL.md:62`, each gain a clause: a sheet with a `footer` uses `liftsAboveKeyboard`, not `keyboardBehavior="extend"`, which cannot lift a footer (`BottomSheet.tsx:822-828`, `BottomSheetFooterContainer.tsx:29`).
- Test: `__tests__/components/ui/sheet_keyboard_props.test.ts`, written first, in the shape of the existing `sheet_snap_points.test.ts` (behavioural, on the exported resolver — not the `readFileSync` shape of `sheet_dismissibility.test.ts`, which `.claude/rules/tests.md` puts on the prune list). Cases: the default resolves `android_keyboardInputMode` to `adjustResize`; the opt-in resolves it to `adjustPan`; `keyboardBehavior` is `interactive` and `keyboardBlurBehavior` is `restore` in both.

### 2. The adjust balance sheet opts in

- File: `src/modules/accounts/screens/accounts/detail/components/adjust_balance_sheet.tsx` (`AdjustBalanceSheet`, `:98-104`)
- Change: pass `liftsAboveKeyboard` on the `Sheet`. Nothing else on this file changes: `size="sm"`, `footer`, the absence of `scrollable`/`fitContent`, the body at `:105-153` and the `useBottomSheetAwareHandlers` wiring at `:50,127-128` all stay. The lifted sheet keeps its 45% content box and the footer's offset within the sheet is unchanged (`BottomSheetFooterContainer.tsx:27-32` cancels the keyboard term against the shifted `animatedPosition`), so the helper text and error rail hold their place.
- Test: none. The only new behaviour is one prop reaching a mocked primitive — `__tests__/screens/accounts/adjust_balance_sheet_save_error.test.tsx:9` mocks `@/components/ui/sheet`, and no suite renders the real one. The render pass below is the assertion.

## Screens

- Account detail → Adjust balance, **non-card account** (e.g. a cash or bank account): sheet at rest with the keyboard down; keyboard up with the amount field focused — field, `Strings.adjustBalanceHelper` and both footer buttons all fully above the IME; keyboard up with the error rail showing (type a value the parse rejects, tap Save); keyboard dismissed — the sheet restores to 45% and Save still writes.
- Account detail → Adjust balance, **keyboard still up**: tap Save without dismissing it — the sheet closes and the hero balance shows the new figure; then reopen and dismiss with the keyboard up, once by panning down and once by the header close button. These three carry the Acceptance clause "still opens, closes and saves", and they are the paths the knob change disturbs: a save closes the sheet programmatically while the input is focused (`account_detail.hook.ts:198-200`), and under `adjustPan` the interactive branch now sets `isInTemporaryPosition.value = true` (`BottomSheet.tsx:856`), which gates `getNextPosition` at `:866` and the force-close at `:1008` — neither runs today, because the `adjustResize` guard at `:851-854` skips that branch.
- Account detail → Adjust balance, **credit-card account**: the same seven shots. One layout serves both, so this is a falsification pass, not a second design.
- Tap the prefilled value inside the input — the field carries no placeholder, `initialize` fills it with the current balance on every open — never the `FormSectionLabel` above it, and confirm focus before typing.

## Non-goals

- The shared default for the other 19 `Sheet` consumers, and the `ui.md:34` `extend` vs `sheet.tsx:169` `interactive` disagreement for sheets without a footer — step 1 adds the footer-sheet clause to the two docs and settles nothing else.
- `app.json` `android.softwareKeyboardLayoutMode` — the manifest stays at Expo's `adjustResize` default (`@expo/config-plugins/build/android/WindowSoftInputMode.js:38-44`). No native config on this ticket.
- Re-sizing this sheet: no snap-point change, no `scrollable` + `SHEET_FOOTER_CLEARANCE`, no `fitContent`. The content fits at 45% with the keyboard down today and the fix does not change the content box.
- The signed parse in `adjust_balance_sheet.helpers.ts`, and the footer buttons' fill and widths (MA-035).
- New user copy, and any change to what Save writes.

## Verification

- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- `mqa claim` before any emulator call; run the parity chain before building so the render pass and the render lens share one APK. `mqa needs-build` — this diff is JS-only.

## Risks

- `android_keyboardInputMode` tells gorhom what the *window* does; it does not set the window. The manifest still says `adjustResize`. If the window does resize on the device under test, the container shrinks by the IME height and gorhom lifts by it again — the footer would float a keyboard's height above the IME. The keyboard-up shot is the check, and a double-lift means the fix belongs at the window instead.
- If gorhom never reaches `KEYBOARD_STATUS.SHOWN` — `useAnimatedKeyboard.ts:66-74` caches and drops the event until `state.target` is set, and that target comes from `useBottomSheetAwareHandlers` reaching the real `TextInput` through HeroUI's `InputGroup.Input` spread — then neither knob moves anything and this plan is inert. The first keyboard-up shot falsifies it.
- iOS never reaches the guard (`Platform.OS === 'android'`), so this changes nothing there.
- A later snap-point or `fitContent` change to this sheet invalidates step 2's claim that the content box is unaffected.

## Self-assessment

Step 1 is the one I am least sure about, and only in its last mile: the guard, the footer arithmetic and gorhom's own `adjustPan` default are all readable in the vendored source, so *why* nothing moves today is settled, but whether `adjustPan` alone lands the sheet in the right place on `Pixel_2_API_34` depends on a window behaviour I could not read from the tree — `android/` is gitignored and absent at this checkout, and the reproduction only tells me the current pair does nothing. The double-lift in Risks is the concrete way this goes wrong, and it is visible in the first keyboard-up screenshot rather than in any test. Step 2 carries no uncertainty; the prop is one line and the mocked-primitive suites cannot see it.
