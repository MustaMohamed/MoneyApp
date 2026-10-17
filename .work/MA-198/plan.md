# MA-198 — The Home hero takes its entrance through the hero frame, with no wrapper view
base: 7f90c5b9279f8e1edab6d9a46d56d258225547dd · verify: emulator · flags: none · expected diff: ~40 lines

## Steps
### 1. `HeroShell` carries `entering` on a view that stays mounted when `onPress` goes from unset to set
- File: `src/components/ui/hero_shell.tsx` (`HeroShell`, `hero_shell.tsx:70-103`; the comment at `:50`)
- Change: `HeroShell` always returns one `Animated.View` that takes `entering` and has no style. It holds a `Pressable` (`onPress`, `accessibilityRole="button"`, `accessibilityLabel`) only while `onPress` is set, and the frame inside it. With no `onPress`, it holds the frame directly. The frame becomes a plain `View` with `[frameStyle, style]` and the same four children. `HeroShellProps` does not change: every prop stays optional except `children`, none takes `null`. The `:50` comment drops its `Animated.View` clause and keeps the line about the 16s mirroring `mx-4 mt-4 rounded-2xl`. No `Pressable` renders without `onPress`, so no hero becomes an accessibility group (ADR `docs/adr/2026-08-19-dashboard-net-worth-refusal.md` §4). `style` stays on the frame, so the margin overrides and the archived opacity of the seven other callers keep their place (`transactions_hero.tsx:26`, `detail.geometry.ts:18`, `balance_hero.tsx:37`, `live_month_card.tsx:27`, `ready.geometry.ts:40`).
- Test: `first` · `__tests__/screens/dashboard/hero_card.test.tsx`, a new `describe` that renders the real `HeroShell` from `jest.requireActual('@/components/ui/hero_shell')`. Add module-level mocks: `react-native-reanimated`, whose `default.View` renders a react-native `View` and records each mount of an instance that holds `entering`; `expo-linear-gradient` as a `View`, as `__tests__/screens/dashboard/budget_card.test.tsx:13` does; `react-native-svg` as views only if its import fails under Jest. Nothing `HeroCard` imports loads these three modules. Cases: (a) The entrance sits on the view that holds `entering`. Rendered with an `entering` value and no `onPress`, the path the commitment detail and onboarding ready heroes take, that view is the root host element and an ancestor of the frame, the host parent of a child with a `testID`. Rerendered with `onPress`, it stays the root and an ancestor of the `button`, and the mock records one mount. Base records two, because the root changes from the frame to a `Pressable`. (b) With no `onPress`, no element has the `button` role; with `onPress`, one does, and it carries the `accessibilityLabel` passed. (c) Place and size go through `style` on the frame. With `style={{ marginTop: Spacing.xs }}`, the frame has `marginTop: Spacing.xs` both with and without `onPress`, and the view that holds `entering` does not.

### 2. `HeroCard` hands its `entering` to `HeroShell`
- File: `src/modules/dashboard/screens/dashboard/components/hero_card.tsx` (`HeroCardProps` `:35-48`, `HeroCard` `:125-152`)
- Change: `HeroCardProps` gains `entering?: HeroShellProps['entering']` as its last field: optional, `undefined` when absent, never `null`. Import the `HeroShellProps` type from `@/components/ui/hero_shell`. `HeroCard` passes it as `HeroShell`'s `entering`, on every outcome, the rate-needed one included. The `onPress` expression at `:150` does not change. One consumer: `src/modules/dashboard/screens/dashboard/index.tsx:21`.
- Test: `first` · `__tests__/screens/dashboard/hero_card.test.tsx`: the `HeroShell` mock at `:16-35` takes `entering` and renders a `dashboard-hero-entering` sentinel `View` while it is set, the way it renders `dashboard-hero-press-target` for `onPress`. Two cases: `HeroCard` with `entering` set shows the sentinel, and without it shows none. The value comes from the step 1 reanimated mock, the way `__tests__/screens/dashboard/dashboard_anim.test.ts:4-11` builds its own.

### 3. Home gives the hero its entrance through `HeroCard`, with no view around it
- File: `src/modules/dashboard/screens/dashboard/index.tsx` (`:162-174`)
- Change: delete the `<Animated.View entering={heroEntering}>` around `HeroCard` and pass `entering={heroEntering}` to `HeroCard`. The `Animated` import stays, since `statsEntering` (`:176`) and `sectionEntering` (`:227`) still use it. `useDashboardAnim` and `HERO_ENTERING` (`dashboard.anim.ts:6-19`) do not change.
- Test: `none` · no suite renders `DashboardScreen` (`ls __tests__/screens/dashboard/`), and `.claude/rules/tests.md` forbids a new `.tsx` suite. `__tests__/screens/dashboard/dashboard_anim.test.ts` keeps the opening-render gate, and the three `dashboard.md` rows under Screens read the device.

### 4. `dashboard.md` points its two hero forces at the new views
- File: `.claude/skills/emulator-verify/features/dashboard.md` (§ States rows `skeletons, large font` `:25` and `hero after a forced JS stall on opening Home` `:44`)
- Change: In `skeletons, large font`, the method clause "a temporary `onLayout` on the `Animated.View` around `HeroCard`, `…index.tsx:166`, less the 16 dp `marginTop` of the shell's frame, `…hero_shell.tsx:53`, which that view holds" becomes a temporary `onLayout` on the `Animated.View` in `src/components/ui/hero_shell.tsx` that holds `entering`, less the 16 dp `marginTop` of `frameStyle`, which that view holds. Home draws one hero, so the log carries Home's heights only. The dated `Head at …` records stay as written. In `hero after a forced JS stall on opening Home`, the force is no longer the same on base and head. Base keeps today's text: the `53efffd6` files, with `Ma195StallForce` inside the hero's `Animated.View` in `index.tsx`. On head, the `ma195-home-render` log stays the first statement of `DashboardScreen`. `Ma195StallForce` is declared above `HeroCard` in `src/modules/dashboard/screens/dashboard/components/hero_card.tsx` and rendered as the last child of its `HeroShell` as `{onPress ? <Ma195StallForce /> : null}`, since Home sets `onPress` only from `presentation.hasSnapshot` (`index.tsx:172`). The head restore becomes `git checkout HEAD -- src/modules/dashboard/screens/dashboard/index.tsx src/modules/dashboard/screens/dashboard/components/hero_card.tsx`, then `git status` clean.
- Test: `none` · a recipe file; the implementer's render pass runs both recipes at head.

## Screens
- `emulator-verify/features/dashboard.md`: hero entrance, on opening Home and back on Overview
- `emulator-verify/features/dashboard.md`: hero on a cold launch, one account and one transaction
- `emulator-verify/features/dashboard.md`: hero after a forced JS stall on opening Home, with the head force from step 4

## Non-goals
- No source change to the seven other `HeroShell` callers: `transactions_hero.tsx`, the transaction detail's `detail_hero.tsx` and `detail_skeleton.tsx`, `live_month_card.tsx`, the commitments `detail_hero.tsx`, `balance_hero.tsx` and onboarding `ready/index.tsx`.
- No `Pressable` rendered on every hero to keep the frame mounted. The frame inside the conditional `Pressable` still mounts again on the flip, as after MA-195.
- The frame keeps its style object; no move to `className`.
- No change to the hero's content and pills, to `statsEntering` or `sectionEntering`, or to `useDashboardAnim`.
- The three existing `HeroShell` mocks (`hero_card.test.tsx:16`, `detail_hero.test.tsx:15`, `detail_skeleton.test.tsx:21`) stay mocks.

## Untested inputs
- The commitment detail and onboarding ready entrances on the device, now played by the outer view: no device read, per the Rules bullet "The device read is the three `dashboard.md` rows" (Decisions 2026-10-17). Their builders (`detail.anim.ts:9`, `onboarding_rise.ts`) do not change. Step 1 case (a) asserts that the entrance sits on the view that holds `entering`, around the frame.
- The place and size of the Transactions, transaction detail, its loading state, budget category detail and account detail heroes on the device, the archived opacity included: no device read, per the same Rules bullet. Step 1 case (c) asserts that `style` lands on the frame.
- The rate-needed outcome mid-entrance: `HeroCard` withholds `onPress` (`hero_card.tsx:150`, existing case at `hero_card.test.tsx:308`), so the shell never flips. Step 1 case (b) covers the role.

## Verification
- Per commit: `npm run format:check && npm run lint && npm run typecheck && npm test -- --ci`
- Once, before hand-off: the full CI parity chain from `CLAUDE.md`.

## Risks
- The real `HeroShell` may not load in `hero_card.test.tsx` with only reanimated and the gradient mocked; `react-native-svg` then needs a view mock too.
- The outer `Animated.View` stays a native view on every hero, because Reanimated renders with `collapsable: false` on native (`node_modules/react-native-reanimated/src/css/component/AnimatedComponent.tsx:218-221`). Each hero is one unstyled view deeper. The parents of the seven other heroes are column containers that stretch their children, so the frame keeps its place and width.
- `dashboard.md · hero entrance, on opening Home and back on Overview`: a height that is not a whole number of dp, a clipped or rounded container.
- `dashboard.md · hero on a cold launch, one account and one transaction`: a height that is not a whole number of dp, a clipped or rounded container.
- `dashboard.md · hero after a forced JS stall on opening Home`: a height that is not a whole number of dp, a clipped or rounded container.
- `not probed: dashboard.md · hero entrance, on opening Home and back on Overview`
- `not probed: dashboard.md · hero on a cold launch, one account and one transaction`
- `not probed: dashboard.md · hero after a forced JS stall on opening Home`

## Self-assessment
Step 1's test is the least certain. It renders the real `HeroShell` through `jest.requireActual` inside a suite that mocks the same module. It counts mounts through a reanimated mock, because RNTL 14 shows host elements only and the real reanimated throws at import under Jest (`src/test_helpers/mock_reanimated_fade.ts:1`). Which other native imports of `hero_shell.tsx` load under Jest is not known until the test writer runs it. The source change is small and copies the shape Home's wrapper already proved on the device after MA-195. The device risk is on the seven heroes no Screen checks row reads, each now one unstyled view deeper.
