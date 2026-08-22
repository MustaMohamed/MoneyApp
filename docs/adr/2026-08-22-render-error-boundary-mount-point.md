# ADR — render-error boundary mount point

- **Date:** 2026-08-22
- **Status:** accepted
- **Ticket:** MA-017 (issue #285)
- **Applies to:** `src/app/(app)/_layout.tsx`, `src/app/(onboarding)/_layout.tsx`, `src/modules/navigation/components/`

## 1. The mount point: segment layouts, not the root

`ErrorBoundary` named exports are added to `src/app/(app)/_layout.tsx` and
`src/app/(onboarding)/_layout.tsx` — two files, not the 32 individual route files under them.

The mechanism is expo-router's own primitive (Team Law 7 — never a hand-rolled
`componentDidCatch` / `getDerivedStateFromError`): `getQualifiedRouteComponent` ->
`fromImport` (`node_modules/expo-router/build/useScreens.js:141-161`) destructures
`{ ErrorBoundary, SuspenseFallback, ...component }` off any route module and, when
`ErrorBoundary` is present, wraps the default export in `<Try catch={ErrorBoundary}>`
(`:152`). `fromImport` never branches on `value.type`, so a layout route node takes the
identical path as a leaf route. A directory's `_layout` node is pushed as a child of its
enclosing layout by `getRoutesCore.js:467` (`previousLayout.children.push(layout)`), which is
what makes `(app)/_layout.tsx` and `(onboarding)/_layout.tsx` reachable by the root layout's
own `useSortedScreens` in the first place.

Two segment mount points buy the coverage that per-leaf-route exports would pay 32 files for.

## 2. The provider-unmount constraint, in full

`Try` wraps the layout *component*, so it sits outside that component's own render output. An
`ErrorBoundary` exported from the root `src/app/_layout.tsx` would catch a throw by unmounting
`RootLayout` itself — and with it `GestureHandlerRootView`, `SafeAreaProvider`,
`HeroUINativeProviderRaw` and `ThemeProvider` (`src/app/_layout.tsx:71-93`). The fallback would
then render with none of those providers mounted.

That is fatal for a fallback built from this app's design system: `Screen` calls
`useSafeAreaInsets` (`src/components/ui/screen.tsx:34`) and `Button` wraps HeroUI's
(`src/components/ui/button.tsx:2`), both of which require a provider that no longer exists —
the fallback throws *inside its own boundary* and produces the exact white screen this ticket
exists to prevent.

**Consequence for any future root-layout boundary:** its fallback must be built from
provider-free primitives only — bare `View` and `Text`, nothing from `@/components/ui/*` or
HeroUI. `ErrorState` (this ticket's shared presentation component) is **not** safe at the root
for this reason.

Mounted at `(app)` and `(onboarding)` instead, `Try` nests inside the root layout's own render
output, every provider stays mounted, and the fallback may use the design system freely — it
is a second caller of `ErrorState`, sharing the layout and supplying its own `Strings` copy
(`renderErrorTitle` / `renderErrorDescription` / `renderErrorRetry`), never the startup copy.

## 3. Scenario 4 — throw inside the root layout is a deliberate gap

A throw inside `RootLayout` itself (font loading, provider setup) is not caught by anything
this ticket adds — per §2, a boundary there could not safely render a design-system fallback.
This is a known, deliberate gap, not an oversight.

The root layout's own failure path is not left bare, however: `useAppInit` -> `rejectFatal` ->
`StartupError` (`src/utils/use_layout_init.hook.ts:45`, `src/app/_layout.tsx:76-86`) already
covers startup failures — migration errors, store-init errors — through a dedicated status
flow, not through a render-error boundary. `StartupError` now renders through the same shared
`ErrorState` component as the segment fallback (MA-017 c3), with its own copy.

`src/app/(dev)/primitives/index.tsx` and `src/app/index.tsx` are direct children of the root
layout, outside any segment `_layout.tsx`, and are uncovered for the same reason: dev-only
surface and the root redirect respectively, deliberate gaps rather than oversights.

## 4. Async throws are not covered

Error boundaries — expo-router's `Try` included — catch render-phase throws only. A rejected
promise from an async submit handler, a repository call, or any `.catch()`-less async path
does **not** reach `Try` and is not caught by this boundary. Nothing in this ADR, the boundary's
copy, or the PR claims otherwise.

## 5. The `BackHandler` consequence — decided, not discovered

`Try` catching a render-phase throw in `(onboarding)` unmounts `OnboardingLayout`, and with it
the `useEffect` subscription at `src/app/(onboarding)/_layout.tsx:32-38` — the one that exists
so system back on N2/N3/N4 does not fall through to `BackHandler`'s default `exitApp()`.

**Consequence:** with the onboarding fallback mounted, system back exits the app rather than
going to the previous onboarding step.

**Accepted.** The fallback is a terminal error state and Retry is its only affordance; giving
the fallback its own back handler would duplicate a concern `OnboardingLayout` already owns for
every other route in the segment. @marcus may overrule this at gate 3 device QA — it is a UX
call, not an architectural one.

## 6. What the boundary actually covers, stated accurately

At this commit, the render-phase throw sites reachable below the two mount points are exactly
two, both the same defensive assertion:

- `(app)`: `dashboard.hook.ts:154`'s `useMemo` -> `computeNetWorth` -> `assertSupportedCurrency`
  (`src/modules/accounts/domain/account_aggregation.ts:216`) -> `AccountAggregationError`.
- `(onboarding)`: `ready.hook.ts:52`'s `useMemo` -> `resolveStartingNetPosition` ->
  `assertSupportedCurrency` (`src/modules/onboarding/domain/starting_net_position.ts:51`) ->
  `StartingNetPositionError`.

Both are unreachable from data today: `src/database/migrations/001_create_accounts.ts:9`
declares `currency TEXT NOT NULL CHECK(currency IN ('EGP','USD'))`, and `Currency` is a closed
enum, so an unsupported currency reaching either assertion would already be a schema violation
upstream, not a state the app can be driven into by normal use.

The transaction-domain throw sites in `transaction_amounts.ts` and `transaction_policy.ts` are
reached only from repository methods and async submit handlers (e.g.
`add_transaction.hook.ts:409`, inside its `try` block after `setSaving(true)`) — every one of
them async, none of them render-phase — and are **not** covered by this boundary.

The boundary's value is the whole render-phase class below the two mount points, not an
enumerated list of today's throw sites: any future render-phase throw introduced under `(app)`
or `(onboarding)` degrades to this fallback automatically, with no code change required at the
new throw site.
