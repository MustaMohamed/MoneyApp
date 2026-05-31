# Signals App Flow Migration Design

## Goal

Migrate the first two app-flow slices from Zustand to Preact Signals without broadening into accounts, dashboard, transactions, commitments, categories, or currency.

## Scope

The migration runs as two small parts with disjoint ownership:

1. App global boot readiness:
   - `store/ready.store.ts`
   - `utils/use_layout_init.hook.ts`
   - `app/_layout.tsx`

2. Onboarding:
   - `modules/onboarding/store/onboarding.store.ts`
   - `store/onboarding.store.ts`
   - `app/index.tsx`
   - `app/(onboarding)/_layout.tsx`
   - onboarding screen hooks
   - onboarding tests that directly depend on the old Zustand API

`app/(app)/_layout.tsx` stays out of this wave because it still depends on account, category, and currency stores. It should become Signals-only when those data stores are migrated.

## Architecture

Shared app/domain data uses small class-based stores that own their `signal(...)` refs and persistence dependencies, then export one singleton through a `useX()` facade. The Babel `@preact/signals-react-transform` plugin handles render tracking, so hook facades should not add empty `useSignals()` calls. The returned shape stays consistent:

```ts
const { state, action } = useDomain();
state.valueSignal.value;
```

Component-local state uses hook-based stores with hook-created `useSignal(...)` values. Async operation state uses `useAsync(...)` loading/error signal refs instead of custom loading booleans unless that operation state must be global. Actions remain flat on the returned object.

Names should describe responsibility, not use a fixed `Setup` suffix:

- `useAppReady()` for global boot readiness.
- `useAppInit()` for root startup effects.
- `useOnboarding()` for onboarding shared data and actions.
- `useReady()` for ready screen orchestration; completion loading comes from `useAsync(completeOnboarding)`.

## Compatibility

Backward-compat root exports may remain under `store/` while consumers are migrated. They must not expose Zustand-specific APIs such as `.getState()`, `.setState()`, `.useState`, or selector-call syntax for migrated stores.

## Data Flow

`useAppInit()` runs DB migrations, loads onboarding persisted state through `loadOnboardingState()`, marks app readiness, and schedules commitment housekeeping for completed users. The readiness signal gates splash hiding in `app/_layout.tsx`.

`loadOnboardingState()` reads SecureStore values, normalizes legacy onboarding steps, writes normalized values back when needed, updates onboarding signals, and returns `{ complete, step }`.

Onboarding screens read `state.baseCurrency.value`, `state.currentStep.value`, `state.complete.value`, and call flat actions such as `setStep`, `setBaseCurrency`, and `completeOnboarding`.

## Testing

Tests should stop relying on Zustand internals for migrated stores. Prefer exported reset/test helpers from the store module where direct state setup is needed.

Targeted verification for these slices:

- `npm run format:check`
- `npm run typecheck`
- onboarding and layout-init Jest tests
- changed-file oxlint

Full `npm run lint` is currently known to fail because of pre-existing repo-wide warnings outside this slice, so it is reported separately rather than treated as proof this slice regressed lint.
