# Transactions UI Performance Regression

## Problem

The transactions state-stability work introduced two operations on navigation and scrolling hot paths:

- The list publishes every 16 ms scroll event to a Zustand store.
- Focus revalidation starts transaction and totals database work during the tab transition.

Both behaviors are inconsistent with established MoneyApp patterns and add avoidable JavaScript and render work while the user is interacting with the UI.

## Scope

This fix changes scheduling and persistence only. It must not change transaction results, financial calculations, filters, refresh semantics, error states, or visible layout.

## Design

### Scroll persistence

- Keep the current offset in a non-reactive ref while the list is mounted.
- Persist the offset to `transactions.state.ts` only at drag/momentum completion and when the screen loses focus.
- Remove the 16 ms `scrollEventThrottle` requirement from the transaction list.
- Preserve query ownership: an offset can only update the active query.

### Focus revalidation

- Schedule automatic focus revalidation with the existing `runAfterInteractions` utility used by Dashboard, Commitments, and Budget.
- Cancel scheduled work when focus is lost before it starts.
- Preserve the currently visible rows and totals while revalidating.
- Keep pull-to-refresh immediate and user-driven.

## Verification

- A burst of scroll movement does not write repeatedly to Zustand.
- The final offset is persisted and restored for the owning query.
- Focus does not call refresh until the interaction task executes.
- A canceled focus task does not refresh.
- Manual refresh remains immediate.
- Existing transaction logic, typecheck, lint, formatting, tests, Expo Doctor, and Android prebuild remain green.
