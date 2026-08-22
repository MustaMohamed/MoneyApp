# ADR — render-error boundary mount point

- **Date:** 2026-08-22
- **Status:** accepted
- **Ticket:** MA-017 (issue #285)
- **Applies to:** `src/app/(app)/_layout.tsx`, `src/app/(onboarding)/_layout.tsx`, `src/modules/navigation/components/`

## 1. The mount point: segment layouts, not the root

`ErrorBoundary` named exports are added to `src/app/(app)/_layout.tsx` and
`src/app/(onboarding)/_layout.tsx` — two files, not the 29 `.tsx` files (21 of them routes,
excluding `_layout.tsx`) that sit under the two segments.

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

Two segment mount points buy the coverage that per-leaf-route exports would pay 21 route files
for.

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
the `useEffect` subscription in `OnboardingLayout` that registers the `BackHandler` listener —
the one that exists so system back on N2/N3/N4 does not fall through to `BackHandler`'s default
`exitApp()`.

**Consequence:** with the onboarding fallback mounted, system back exits the app rather than
going to the previous onboarding step.

**Accepted.** The fallback is a terminal error state and Retry is its only affordance; giving
the fallback its own back handler would duplicate a concern `OnboardingLayout` already owns for
every other route in the segment. @marcus may overrule this at gate 3 device QA — it is a UX
call, not an architectural one.

### `(app)`'s consequence is larger, and was missing here

For a deterministic render throw, `retry()` re-renders the identical throwing tree — the
fallback's Retry is a visible no-op on both mount points. On `(onboarding)` that is the whole
story (above). On `(app)` the mount point sits above `(tabs)/_layout.tsx`, so catching there
unmounts the entire tab navigator, not just the failing screen: every tab loses its state, and
the fallback's Retry cannot get the user back to a working tab without a state clear, since
retrying re-runs the same throw. The root `Stack` in `src/app/_layout.tsx` has exactly one
route, so system back from the `(app)` fallback also exits the app, the same way it does on
`(onboarding)` — that part is the same class of consequence as §5's `BackHandler` finding, just
reached through the root `Stack`'s own default behaviour rather than an unmounted subscription.

**Accepted, on the same terms as the onboarding case:** the fallback is a terminal error state,
Retry is its only affordance, and no per-tab escape hatch is built for it. @marcus may overrule
this at gate 3 device QA — it is a UX call, not an architectural one.

## 6. What the boundary actually covers, stated accurately

This count has been wrong on two prior revisions of this ADR, both times because the number was
restated rather than re-derived against the tree at the time of writing. This revision lists
every render-phase throw site found below the two mount points by name, traced by hand from each
mount point down to its throw, rather than restating a number.

### `(app)`

- **`assertSupportedCurrency`** (`src/modules/accounts/domain/account_aggregation.ts`), which
  throws `AccountAggregationError`. Reached from the `netWorth` `useMemo` in
  `dashboard.hook.ts`, via `computeNetWorth`.
- **The allocation-chip lookup inside `buildSpendingPlanCardDisplayChips`**
  (`src/modules/budget/screens/budget/spending_plans.helpers.ts`), which throws
  `Missing allocation card chip: <id>`. Reached two ways: from the `spendingPlanRows` `useMemo`
  in `budget.hook.ts`, and from the `plan` `useMemo` in `spending_plan_detail.hook.ts` — both via
  `buildSpendingPlanRows` -> `buildSpendingPlanCard`.
- **The category-chip lookup in the same function**, which throws
  `Missing category card chip: <id>`. Reached from the same two `useMemo` call sites, via the
  same call chain.

### `(onboarding)`

- **`assertSupportedCurrency`** (the onboarding-local copy, in
  `src/modules/onboarding/domain/starting_net_position.ts`), which throws
  `StartingNetPositionError`. Reached from the `summary` `useMemo` in `ready.hook.ts`, via
  `resolveStartingNetPosition`.

That is four `throw` statements, at three distinct guard functions, reached from four separate
`useMemo` call sites across four hook files. Two guard classes, not one:

**The two `assertSupportedCurrency` copies are unreachable from data today**, and this argument
does not extend to the other two. `src/database/migrations/001_create_accounts.ts` declares
`currency TEXT NOT NULL CHECK(currency IN ('EGP','USD'))`, and `Currency` is a closed enum, so an
unsupported currency reaching either assertion would already be a schema violation upstream, not
a state the app can be driven into by normal use.

**The two `buildSpendingPlanCardDisplayChips` throws are guarded by a different mechanism: an
application-level map-lookup invariant over an id set, not a schema constraint.** Tracing the
one production call path (`buildSpendingPlanRows` -> `buildSpendingPlanCard` ->
`buildSpendingPlanCardDisplayChips`), the chip list and the lookup maps it queries are built from
the same `allocationRows`/`categoryChips` arguments in every call, so the two throws do not fire
today. But that is a property of how those three functions currently pass data to each other, not
of a schema `CHECK` that would need a migration to relax — a future change to any one of the
three (e.g. building the lookup maps from a filtered or paginated subset before the chip list is
built from the full set) could break the equality this invariant depends on, with no database
change at all. **This is good for the ticket, not bad: it means the boundary is not backstopping
only a database-enforced defensive assertion — it also backstops an invariant that ordinary
application code changes could plausibly break**, which is closer to the render-phase throw class
the boundary exists for than the currency case is.

The transaction-domain throw sites in `transaction_amounts.ts` and `transaction_policy.ts` are
reached only from repository methods and async submit handlers (e.g.
`add_transaction.hook.ts`, inside its submit handler's `try` block, after `setSaving(true)`) —
every one of them async, none of them render-phase — and are **not** covered by this boundary.

The boundary's value is the whole render-phase class below the two mount points, not an
enumerated list of today's throw sites: any future render-phase throw introduced under `(app)`
or `(onboarding)` degrades to this fallback automatically, with no code change required at the
new throw site.

## 7. Verification status

§1's mechanism claim — that a layout route's `ErrorBoundary` export takes the identical
`fromImport` path a leaf route's does, and is therefore wrapped in `Try` — is verified
**statically only**. There is no emulator in the environment this ADR was written in, so nothing
below was observed running.

**Verified statically, by reading the installed `expo-router` package:**

- `fromImport` (in `useScreens.js`) destructures `{ ErrorBoundary, SuspenseFallback, ...component }`
  off whatever module it is handed and wraps the default export in `<Try catch={ErrorBoundary}>`
  when `ErrorBoundary` is present. Nothing in `fromImport` branches on `value.type`, so it cannot
  distinguish a layout route's module from a leaf route's — both take the same wrap.
- `routeToScreen` (also in `useScreens.js`) is `fromImport`'s only caller in the file, and passes
  every route through it uniformly, layouts included.
- `getRoutesCore.js` pushes a directory's `_layout` node onto its enclosing layout's `children`
  (`previousLayout.children.push(layout)`), which is what makes `(app)/_layout.tsx` and
  `(onboarding)/_layout.tsx` reachable by the root layout's own screen list in the first place —
  i.e. reachable by the same `fromImport` pass that wraps them.

**Not verified — deferred to a device pass:** that `Try` actually engages on a real Android build
under the New Architecture when a segment layout throws below it; that the fallback renders
inside all providers as claimed in §2; that Retry re-renders the segment; and the `(onboarding)`
`BackHandler` consequence recorded in §5.

**Consequence if the static reading does not hold at runtime:** the fallback here relies on the
segment-layout mount point working through the same code path as a leaf-route mount point. If
that turns out not to be true on expo-router 57.0.15 in practice, spec.md §3.1's own fallback
plan is per-leaf-route named `ErrorBoundary` re-exports, scoped to the transactions segment only
— still the router's own primitive, never a hand-rolled boundary. Counting only that segment's
leaf routes (`transactions/index.tsx`, `transactions/detail/[id]/index.tsx`) puts c4's file count
at roughly four (the two segment layouts this ADR keeps for every other route, plus those two
leaves), well short of the 29-file, per-route-everywhere alternative §1 also rejects. Spec.md
scoped that fallback to the transactions segment on the belief that every render-phase throw
site was transaction-domain; §6 of this revision shows that belief was already wrong before this
fallback would ever be exercised — a fact worth re-checking if the fallback is ever invoked,
not something this ADR revises on its own.
