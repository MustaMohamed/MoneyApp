# MA-067 — Toast: the success toast shows its icon before its label
base: ca01025b09c1d20139af5a822f3394afc057a6fc · verify: emulator · flags: none · expected diff: ~40 lines

Mechanism, from `node_modules/heroui-native/lib/module/providers/toast/provider.js:66-87`: `icon` reaches `DefaultToast` only through the per-call config, never through `defaultProps`. So the wrapper's `useToast` decorates `show`: a config call with `variant: 'success'` and no `icon` gets the check-circle glyph; strings, `component` calls, other variants and caller-supplied icons pass through unchanged. `toast.css` and `--overlay` stay as they are.

## Steps
### 1. The theme names the toast glyph size
- File: `src/constants/theme.ts` (`Size`, `:142-229`)
- Change: add `toastIcon: ms(20)` to `Size`, beside `iconBack: ms(20)` (`:180`), with the same do-not-dedupe comment shape as `iconXl` (`:185`): the design's 20px toast glyph, not the back chevron.
- Test: none; a token declaration with no behaviour of its own. Step 3's test reads it.

### 2. The hook suites mock the wrapper, so their assertions see what the call site passed
- File: `__tests__/screens/accounts/accounts_list.hook.test.ts` (`:3`, `:491-494`), `__tests__/screens/accounts/account_detail.hook.test.ts` (`:3`, `:712-715`), `jest.setup.js:189`
- Change: each suite keeps its `@/components/ui/toast` import and adds, beside its other `jest.mock` calls (`accounts_list.hook.test.ts:21-27`), `jest.mock('@/components/ui/toast', () => ({ useToast: () => ({ toast, isToastVisible: false }) }))` over one suite-level `const toast = { show: jest.fn(), hide: jest.fn() }` (hoisting: name it `mockToast` or declare it inside the factory and read it back through the mocked module). The exact `{ label, variant: 'success' }` assertions stay as written: with the wrapper mocked, `show` receives the call site's object alone, so a call site that adds an `icon` fails here. `account_detail.hook.test.ts:738` is unchanged. In `jest.setup.js:189` the `heroui-native` mock's `toast` becomes `{ show: jest.fn(), hide: jest.fn() }`, so step 3's `hide`-by-identity assertion compares functions, not `undefined` to `undefined`.
- Test: the two suites are green before and after this step and after step 3; the mock is what keeps them callable outside a render once step 3 makes the wrapper a hook. Same commit as step 3.

### 3. The wrapper's `useToast` adds the check-circle to every success config call (one commit with step 2)
- File: `src/components/ui/toast.tsx` (`useToast`, `:15`)
- Change: replace the re-export with a hook. It calls HeroUI's `useToast` (imported under another name), and returns `{ toast, isToastVisible }` where `toast` is `useMemo(() => ({ show: (options) => heroToast.show(withSuccessIcon(options)), hide: heroToast.hide }), [heroToast])`. `withSuccessIcon(options: string | ToastShowOptions)` (`ToastShowOptions` is exported by `heroui-native` through `components/toast/index.d.ts`) returns `options` unchanged when it is a string, has `component`, has `variant !== 'success'`, or already has `icon`; otherwise `{ ...options, icon }` where `icon` is `<View style={{ flex: 1, justifyContent: 'center' }}><MaterialCommunityIcons name="check-circle" size={Size.toastIcon} color={Colors.dark.positive} /></View>`. The `View` centres the glyph against the label line: `DefaultToast` (`components/toast/toast.js:398-411`) puts `icon` in a bare `View` inside a `flex-row` root, stretched to the row's height, so an unwrapped glyph sits at the top. Colour precedent: `src/components/ui/chip.tsx:101-104` (`check-circle`, `Colors.dark.positive`, the same `#4CAF82` as `--success` at `global.css:26`). Return type must stay assignable to HeroUI's `ReturnType<typeof useToast>` so the two call sites (`accounts_list.hook.ts:51`, `account_detail.hook.ts:35`) compile untouched; `TOAST_PROVIDER_PROPS` and `AppToastProvider` do not change.
- Test: `__tests__/components/ui/toast_success_icon.test.ts`, written first, `renderHook(() => useToast())` from `@testing-library/react-native` against the wrapper, asserting on `heroui-native`'s mocked `useToast().toast`:
  - `show({ label: 'x', variant: 'success' })` forwards `{ label: 'x', variant: 'success', icon }` where `icon.props.children.props` matches `{ name: 'check-circle', size: Size.toastIcon, color: Colors.dark.positive }`;
  - `show({ label: 'x', variant: 'danger' })` forwards the caller's object with no `icon` key; `show('x')` forwards the string; `show({ label: 'x', variant: 'success', icon: <sentinel> })` keeps the sentinel; `show({ component })` forwards the same object;
  - `toast.hide` is HeroUI's `hide` by identity and `isToastVisible` is forwarded;
  - a `rerender()` returns the same `toast` object (the memo holds, so `accounts_list.hook.ts:153`'s `useCallback` deps do not churn).

## Screens
- Accounts list (`/accounts`), archived card expanded, tap Restore on an archived row: the "<name> restored." toast at the bottom, check-circle in green before the label, glyph vertically centred on the label line, surface the same 60% black as at base.
- Archived account detail (`/accounts/[id]` for an archived account), tap Unarchive: the same toast, same shape. One shot each; nothing else on either screen changes.

## Non-goals
- Toast copy (MA-068, #483); the delete toast (MA-038, #427) inherits the icon by going through the wrapper.
- The `--overlay` token, `toast.css`, `patch-package` on HeroUI, the dialog backdrop and the sheet surfaces; no surface change at all.
- Icons for `default`, `accent`, `warning` or `danger` variants; the label's face, size and colour.
- A `Toast.Root` custom component (`component` path) or provider-level `defaultProps` change; neither carries an icon.
- Adding `toast.tsx` to the heroui-native skill by hand: `npm run ui:inventory` reads `src/components/ui/` from disk.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.
- Gate check: `npx jest __tests__/components/ui/toast_success_icon.test.ts` is red with step 3's test alone and green with step 3's code; `npx jest __tests__/screens/accounts/accounts_list.hook.test.ts __tests__/screens/accounts/account_detail.hook.test.ts` stays green at base and at head. `test -f` each path before citing it.

## Risks
- `ToastShowOptions` narrowing: `variant` lives on the `ToastShowConfig & { component?: never }` arm only; the type guard must check `'component' in options` before reading `variant`, or `tsc` rejects step 3.
- HeroUI's `useToast` return type is an inline object, not a named export; if the wrapper's return does not unify with it, the two hook call sites' `toast` types drift and typecheck fails there, not in the wrapper.
- MA-068 (#483) edits the same two hook assertions; step 2 leaves those lines as they are, so whichever lands second rebases only the label strings.
- The centring `View` is a render-pass guess about a 2-4 px offset; if the emulator shows the glyph already centred without it, drop the wrapper and read `icon.props` directly in step 3's test.
- Amended after review: step 2 now mocks the wrapper in the two hook suites instead of re-pointing them at HeroUI's mock (a call-site icon had no failing test), adds `hide` to the `heroui-native` mock (the identity assertion compared `undefined` to `undefined`), and lands in step 3's commit (no red commit under the per-commit gate).

## Self-assessment
Step 3's icon shape is the least certain row. The glyph size, colour and name are pinned to tokens and a precedent, but the centring `View` around it comes from reading `DefaultToast`'s bare icon `View` inside a stretched `flex-row`, not from a screenshot; the emulator pass decides whether it stays, and the test reads one level deeper because of it. The `useMemo` decision is why step 2 mocks the wrapper in two suites MA-068 also touches; the assertion lines themselves stay put, so that rebase is label strings only.
