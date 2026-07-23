# Startup and Async Ownership Design

**Date:** 2026-07-23
**Status:** Approved direction from the whole-app audit; implementation specification for PR 1
**Source audit:** `docs/superpowers/reviews/2026-07-23-whole-app-quality-performance-audit.md`

## Goal

Make app startup and shared reference-data loading deterministic: preserve manual exchange rates, prevent stale async results from overwriting newer state, surface fatal startup failures safely, and stop category/deferred-task failures from becoming endless loading or uncaught crashes.

## Scope

This PR includes:

1. Currency initialization, background refresh ownership, remote validation, and normalized manual input.
2. Required startup status and a retryable fatal startup presentation.
3. Safe post-interaction task error delivery.
4. Category request ownership, in-flight deduplication, and retryable settings UI.
5. Focused logic/render tests for these states.

This PR does not change Dashboard query orchestration, Budget/Commitment query performance, database schema/indexes, or transaction behavior. Those remain later audit PRs.

## Selected approach

Extend the existing Zustand/repository architecture with explicit lifecycle state and request generations. This matches the Account, Budget, and Transaction ownership patterns already present in the codebase and does not add a dependency.

Two alternatives were rejected:

- **Local guards only:** checking `isManualOverride` in AppLayout would fix one symptom but leave same-session races, remote validation, category races, and fatal startup behavior unresolved.
- **Adopt a query/cache library:** it could standardize ownership and caching, but it is a new dependency and a cross-app migration with much larger scope.

## Currency lifecycle

### Persisted initialization

Currency becomes part of required startup initialization. Before app routes render, the store reads and validates persisted rate metadata. A persisted rate is accepted only when it is finite and greater than zero. Missing or invalid persisted data keeps the configured fallback rate without crashing startup.

The store exposes whether persisted currency state has loaded. Rate-dependent UI therefore never renders the fallback and then immediately shifts to a persisted value.

### Background refresh policy

After required startup completes, a background refresh is eligible only when all of these are true:

- persisted currency state loaded successfully;
- manual override is false;
- no refresh is already in flight;
- the last remote fetch is absent or at least 24 hours old.

A background refresh failure preserves the current rate and does not block app use. The Currency screen's explicit Refresh action remains allowed even after a manual override; that action intentionally switches back to a remote rate when it succeeds.

### Request ownership

Every remote fetch receives a monotonically increasing request generation. A manual save invalidates all earlier fetch generations before persistence. A fetch may publish only when its generation still owns the request. Reset also invalidates outstanding work.

Persistence and state publication follow the same owner check so a stale remote fetch cannot write `isManualOverride=false` after a newer manual save.

### Remote and manual validation

The remote response must have a successful HTTP status and a Zod-valid positive finite `rates.EGP` number. Manual input uses the project's normalized amount parser in RHF/Zod; formatted input such as `5,000` is accepted, while malformed prefixes, zero, negative, empty, and non-finite values are rejected with existing form-error styling.

## Startup state

The ready store becomes a small state machine:

- `initializing`: splash remains visible while required initialization runs;
- `ready`: schema, onboarding, accounts, and persisted currency are valid;
- `fatalError`: required initialization failed and app routes must not render.

Database open/migrations, onboarding initialization, active-account loading, and persisted currency loading are required. Category preload and commitment housekeeping remain optional post-ready work.

The root provider tree remains mounted for both ready and fatal states. On fatal error it renders a compact full-screen HeroUI-compatible error state with one Retry action. Retry creates a new startup generation and reruns required initialization. A stale completion from an earlier attempt cannot mark the new attempt ready or failed.

Required startup failures are not converted into empty financial data. Optional category/commitment failures are logged and handled by their owning screens without blocking launch.

## Deferred work

`runAfterInteractions` keeps its cancellable API but no longer throws rejected work from a timer. It accepts an optional `onError` callback. When owned work rejects:

- canceled tasks do nothing;
- supplied `onError` receives the failure once;
- without an error callback, the helper logs a scoped error in development/console and does not crash the app.

Screen loaders that already model errors continue to catch them internally. Commitment and other throwing loaders pass an explicit handler or convert the failure into screen state.

## Category ownership and UI

The Category store receives:

- a request generation that suppresses stale results and stale errors;
- one shared in-flight promise so concurrent initial callers do not duplicate the query;
- warm-data preservation during revalidation;
- reset invalidation.

Mutations continue to persist first and then reload through the owned loader. A mutation-triggered reload supersedes an earlier preload so old category data cannot overwrite the mutation result.

The Category settings screen distinguishes:

- cold loading: stable loading state;
- initial error: stable error message and Retry action;
- ready data: list or empty state;
- refresh/revalidation failure with data: preserve the list and expose a nonblocking retry status.

This PR does not redesign the Category list or sheet.

## UI and layout requirements

- Fatal startup error uses `Screen`-equivalent safe-area/layout behavior inside the mounted provider tree.
- Error and retry copy comes from `Strings`.
- Existing tab and stack headers do not shift.
- Warm category content is never replaced by a spinner during revalidation.
- Currency values do not render before persisted initialization completes.
- No custom primitive is introduced where HeroUI Native already provides one.
- Shared spacing, sizing, typography, and colors use existing tokens/classes.

## Testing

### Currency store

- manual override suppresses automatic stale refresh;
- explicit refresh can replace a manual override;
- manual save invalidates an older in-flight remote response;
- later remote generations win over older generations;
- invalid HTTP/payload/stored values do not publish;
- 24-hour freshness boundary is deterministic with an injected clock;
- reset invalidates pending work.

### Startup

- required initialization publishes ready only after all required operations finish;
- required failure publishes fatalError and never ready;
- retry supersedes stale prior completion;
- optional preload failure does not block ready;
- fatal presentation renders a stable Retry action.

### Deferred task helper

- rejection is delivered to `onError` once;
- rejection does not become an uncaught timer throw;
- cancellation suppresses callback/error delivery.

### Category store and screen

- concurrent cold loads share one repository request;
- stale completion cannot overwrite a newer mutation reload;
- stale failure cannot replace newer ready state;
- reset invalidates pending requests;
- initial failure renders Retry;
- warm content remains mounted during revalidation failure.

## Success criteria

- A manual exchange rate survives app relaunch and cannot be overwritten by a stale startup fetch.
- App content never renders against a failed or unknown database schema.
- Category loading has no endless-spinner failure state and no stale publication race.
- Post-interaction promise rejection cannot crash the app through an asynchronous throw.
- Cold startup and retry states have stable, explicit UI.
- Typecheck, lint, focused tests, full unit tests, Expo Doctor, and Android prebuild parity pass before push.
