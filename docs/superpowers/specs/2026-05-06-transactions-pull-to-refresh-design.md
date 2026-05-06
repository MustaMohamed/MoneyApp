# Transactions Pull-to-Refresh Design

**Date:** 2026-05-06

## Summary

Add pull-to-refresh to the transactions list screen. The user drags the list down to trigger a reload against the current query. Works in all states: populated list, no-results, and no-data empty.

## Approach

Use `SectionList`'s built-in `onRefresh` / `refreshing` props. Move the empty state out of a parallel conditional branch and into `ListEmptyComponent` so the `SectionList` is always rendered and PTR is available regardless of data state.

## Changes

### `screens/transactions/transactions.hook.ts`

- Subscribe to `refresh` from `useTransactionStore` (already exists on the store).
- Track a `refreshing: boolean` in local component state (`useState`). Set `true` before calling `refresh()`, set `false` after it resolves or rejects.
- `refreshing` is separate from `txState.loading` so it does not trigger the pagination footer spinner.
- Expose `onRefresh` callback and `refreshing` flag in the hook return value under `state`.

### `screens/transactions/index.tsx`

- Remove the outer `emptyVariant !== 'none'` conditional that renders a plain `View` with `EmptyState`.
- Always render the `SectionList`.
- Pass the `EmptyState` (using the correct `variant` derived from `emptyVariant`) as `ListEmptyComponent`. The component must be full-height so it is centred on screen; use `{ flex: 1, justifyContent: 'center' }` style, or pass the existing `styles.body` layout.
- Add `onRefresh={t.onRefresh}` and `refreshing={t.state.refreshing}` props to `SectionList`.

## State

```
refreshing: boolean   // true only during user-initiated PTR drag
loading: boolean      // existing — pagination and initial load only
```

These two flags are independent. During PTR: `refreshing=true`, `loading` may also be true internally but the footer only shows when `loading && hasMore` (unchanged).

## Out of Scope

- Refresh button in the header.
- Auto-refresh on focus (existing `setQuery` call on focus effect handles that already).
- Animated indicator customisation (use RN default).
