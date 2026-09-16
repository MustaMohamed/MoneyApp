# MA-077 — Toasts clear the tab bar and the + button on tab screens
base: 0930368afe8e956777a20eeea64a67e1ac6a24c9 · verify: emulator · flags: none · expected diff: ~90 lines

Mechanism: `FABOverlay` (rendered by the `(tabs)` layout, a sibling of `<Tabs>`, so `useFocusEffect` there binds to the `(tabs)` route on the `(app)` Stack) holds a bottom clearance in a shared state store while that route is focused; `AppToastProvider` reads the store and passes it as HeroUI `insets.bottom`. `InsetsContainer` (`node_modules/heroui-native/src/providers/toast/insets-container.tsx:66-71`) resolves each edge independently with `??`, so `{ bottom }` alone leaves top/left/right on HeroUI's defaults, and `undefined` is today's position.

Clearance = safe-area bottom + `Size.tabBarHeight` + `Spacing.md` (the FAB's offset, `tabs.hook.ts:26`, whose `ms(16)` equals `Spacing.md`) + FAB size + `Spacing.md` as the gap above the button. A custom HeroUI inset replaces the safe area, so the safe-area bottom must be inside the published value.

## Steps
### 1. The FAB's size is a theme token
- File: `src/constants/theme.ts` (`Size`, `:150-159`), `src/components/ui/fab.tsx` (`FAB_SIZE`, `:35`, `:269-271`)
- Change: add `Size.fab: ms(56)` next to `tabBarHeight`; `fab.tsx` reads `Size.fab` and drops the local `FAB_SIZE`. Value unchanged. A `.ts` importing `fab.tsx` would pull reanimated and the gradient into a logic test; the token avoids that.
- Test: none, a token move with no behaviour; `typecheck` holds it.

### 2. The tab layout's geometry is one pure function
- File: `src/modules/navigation/screens/tabs/tabs.helpers.ts` (new)
- Change: `export function resolveTabsGeometry(safeAreaBottom: number): { fabBottomOffset: number; toastClearance: number }`. `fabBottomOffset = safeAreaBottom + Size.tabBarHeight + Spacing.md`; `toastClearance = fabBottomOffset + Size.fab + Spacing.md`. Imports `Size`, `Spacing` from `@/constants/theme` only.
- Test: `__tests__/screens/navigation/tabs.helpers.test.ts`, written first: `fabBottomOffset` for safe-area 0 and 34 equals `Size.tabBarHeight + Spacing.md` plus the inset; `toastClearance` is `fabBottomOffset + Size.fab + Spacing.md`; both grow by exactly the safe-area delta.

### 3. The toast clearance store
- File: `src/components/ui/toast_clearance.state.ts` (new)
- Change: zustand store, shape per `.claude/rules/state.md`: `{ bottomClearance: number | undefined; publish: (px: number) => void; clear: () => void; reset: () => void }`, `INITIAL_STATE = { bottomClearance: undefined }`. Also `export function holdToastClearance(px: number): () => void` that calls `publish(px)` via `getState()` and returns `clear`, the pair a focus effect installs and removes. Lives beside `toast.tsx`, not under `src/store/` (compat, no new consumers) and not in the tabs folder (the provider must not import a screen).
- Test: `__tests__/components/ui/toast_clearance.state.test.ts`, written first: initial `bottomClearance` is `undefined`; `publish(120)` publishes 120; `clear()` returns it to `undefined`; `holdToastClearance(120)` publishes and its returned function clears; `reset()` restores the initial state.

### 4. The provider reads the clearance as its bottom inset
- File: `src/components/ui/toast.tsx` (`AppToastProvider`, `:19-21`; `TOAST_PROVIDER_PROPS`, `:14-17`)
- Change: `export function resolveToastInsets(bottomClearance: number | undefined): ToastInsets | undefined` returns `undefined` for `undefined` and `{ bottom: bottomClearance }` otherwise (`ToastInsets` from `heroui-native`, all edges optional, `types.ts:13`). `AppToastProvider` selects `bottomClearance` from `useToastClearanceState` and renders `<ToastProvider {...TOAST_PROVIDER_PROPS} insets={resolveToastInsets(bottomClearance)}>`. `TOAST_PROVIDER_PROPS` unchanged. The `children` element identity is `RootLayout`'s, so the store update re-renders the provider only.
- Test: `__tests__/components/ui/toast_provider.test.ts`, extend, written first: `resolveToastInsets(undefined)` is `undefined` (HeroUI defaults, the stack position); `resolveToastInsets(120)` is `{ bottom: 120 }` and carries no `top`, `left`, `right` key.

### 5. The tab layout holds the clearance while its route is focused
- File: `src/modules/navigation/screens/tabs/tabs.hook.ts` (`useTabsLayout`, `:11-32`)
- Change: `const { fabBottomOffset, toastClearance } = resolveTabsGeometry(insets.bottom)`; `fabBottomOffset` replaces the inline sum at `:26` (drop the `ms` import if unused). `useFocusEffect(useCallback(() => holdToastClearance(toastClearance), [toastClearance]))` from `expo-router`. Blur runs the cleanup before react-native-screens freezes the subtree (the `freezeOnBlur` at `src/app/(app)/_layout.tsx:26`); a safe-area change re-runs the effect, its cleanup first. No other reader of `pathname` moves: `fabHidden` stays as is.
- Test: `__tests__/screens/navigation/tabs.hook.test.ts`, extend, written first. The `expo-router` mock gains `useFocusEffect: (effect) => mockFocusEffect(effect)` in the shape of `__tests__/screens/accounts/account_detail.hook.test.ts:46`; `beforeEach` resets `useToastClearanceState`. Cases: after `renderHook`, running the recorded effect publishes `resolveTabsGeometry(12).toastClearance` (12 is the file's mocked safe-area bottom) and `state.fabBottomOffset` equals `resolveTabsGeometry(12).fabBottomOffset`; running the effect's returned cleanup sets `bottomClearance` back to `undefined`.

## Screens
- Dashboard, after deleting an archived account with no active commitments from the detail reached via the dashboard: the "<name> deleted." toast above the + button, no overlap, tab bar fully visible under it.
- Dashboard, the same path through the replacement sheet (an archived account with commitments): the moved toast above the + button.
- Accounts list, the restore toast (`accounts_list.hook.ts:151`) after arriving from the dashboard: at today's position, flush with the bottom safe area, no gap where a tab bar would be.
- Dashboard again after popping back from the accounts list, any tab toast: clearance restored.

## Non-goals
- Toast copy, variants, icon, duration.
- Tab bar and + button layout, `fabBottomOffset`'s value, `shouldHideGlobalFab`.
- Dropping the clearance while the + button is hidden on a tab screen (a sheet open, `/commitments/*`, `/budget/*`): the clearance is constant while the `(tabs)` route is focused.
- Per-call placement or offset; a fixed app-wide inset in `toast.tsx`.
- Toasts on the stacked twins `/stacked/*`: stack toasts, untouched by this change.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- `useFocusEffect` inside `FABOverlay` binds to the `(tabs)` route only if the nearest `NavigationContext` is the `(app)` Stack's screen for `(tabs)`, not a Tabs child; if on device the effect never fires or fires per tab, move the call into `TabsLayout` itself and re-check.
- If the `(tabs)` blur event arrives after the freeze, the cleanup never runs and the stack toast floats; the fallback is a `usePathname` reader in `AppToastProvider` gated on `stackedPrefixOf`, which the ticket did not choose.
- `Spacing.md` as the gap above the button is a pick; if design wants HeroUI's own 12 (`Spacing.sm`), only step 2 and its test change.
- `Size.fab` as a token: if `fab.tsx` must keep `FAB_SIZE` for another reason, export it instead and accept the heavier import in the step 2 test.

## Self-assessment
Step 5's focus binding is the least certain: I read `useFocusEffect` (`node_modules/expo-router/build/useFocusEffect.js`, `useNavigation` under the hood) and the layout shape (`tabs/index.tsx:35-86`, `FABOverlay` a sibling of `<Tabs>`), and the ticket's own danger note says the blur precedes the freeze, but neither the timing of the blur against the freeze nor the route the hook binds to can be asserted in Jest; the emulator's accounts-list shot after leaving the dashboard is the only proof that the clear lands.
