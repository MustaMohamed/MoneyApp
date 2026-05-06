# Pull-to-Refresh — Transaction List

**Date:** 2026-05-04  
**Status:** Approved

---

## Summary

Add native pull-to-refresh to the transaction list `SectionList`. Mirrors the pattern already shipping in `screens/dashboard`.

---

## Files Changed

| File | Change |
|---|---|
| `screens/transactions/transactions.hook.ts` | Add `refreshing` state + `handleRefresh` callback |
| `screens/transactions/index.tsx` | Wire `RefreshControl` into `SectionList` |

No store, database, or routing files change.

---

## Hook (`transactions.hook.ts`)

Add alongside existing `useState` imports:

```typescript
const [refreshing, setRefreshing] = useState(false);
```

Add callback (same shape as `useDashboard.refresh`):

```typescript
const handleRefresh = useCallback(async () => {
  setRefreshing(true);
  try {
    await refresh();
  } finally {
    setRefreshing(false);
  }
}, [refresh]);
```

Where `refresh` is `useTransactionStore((s) => s.refresh)` — already exists in the store, re-fetches from offset 0 using the current query (search + filter chips + advanced filters).

Return from hook: add `refreshing` and `handleRefresh`.

---

## UI (`screens/transactions/index.tsx`)

Add `RefreshControl` to the `react-native` import. Wire into `SectionList`:

```tsx
refreshControl={
  <RefreshControl
    refreshing={t.refreshing}
    onRefresh={t.handleRefresh}
    tintColor={Colors.shared.cairoGold}
  />
}
```

`tintColor` only (iOS spinner colour). No Android `colors` prop — matches dashboard convention.

---

## State Isolation

`refreshing` is separate from the store's `loading`. This prevents the infinite-scroll footer spinner (`loading && hasMore`) from appearing simultaneously with the native pull-to-refresh indicator.

---

## Empty State

Pull-to-refresh is only available on the `SectionList` (when `emptyVariant === 'none'`). The empty-state `View` is unchanged — for a local SQLite app, refreshing an empty list yields no new data.

---

## Design Token

Spinner colour: `Colors.shared.cairoGold` (`#C9973A`) — the active/CTA colour in the Cairo Nights design system.
