---
paths:
  - "**/*.store.ts"
  - "**/*.state.ts"
  - "**/*.hook.ts"
---

# State rules

## Zustand store/state shape

Reactive values as top-level fields, actions as top-level functions. `set({ x: v })` for top-level partial updates; functional `set((s) => ...)` only when the next value reads current state; spread nested objects only when updating nested fields. `reset()` is `set(INITIAL_STATE)` or `set(initialState())`. Consumers group reactive reads with `useShallow` and read actions outside render via `useStore.getState().action`. Screen hooks return `{ state: { ...reactive }, ...flat actions }`.

The `.store.ts` vs `.state.ts` split: `.store.ts` = data (form drafts, selections, fetched results); `.state.ts` = UI state (visibility, loading, errors, tab selection). Don't invert it.

## Async ownership — the canonical template

`src/modules/dashboard/store/dashboard.store.ts` is the house template for async data ownership (audit-verified). Copy its shape rather than re-deriving:

1. **Request generation guard** — stamp every load with a monotonic id (plus month/query key where scoped); re-check the stamp after **every** `await` before publishing. A stale response must never overwrite newer state.
2. **Staleness gate on focus** — `useFocusEffect` loaders check freshness before re-querying; never unconditionally reload on every focus, and never invalidate the snapshot on blur (that makes the gate dead code — audit M13/M32/L26 class).
3. **Error field is mandatory** — every async write path sets a store/state error field the UI renders. A comment-only `catch {}` or a `void handler()` that discards the rejection leaves the user staring at a silent failure (audit H14/M42 class — the single most repeated defect family).
4. **One coherent publication per load** — compose the snapshot, then publish once; no loading → partial → final intermediate states that cause render storms.
5. **Single-owner lookups** — a shared "current item" slot with two independent writers silently cross-clobbers (audit L27). Key the slot by owner or scope it per screen.

## Misc

Avoid `Promise.try()` until Hermes support is verified — use explicit `try`/`catch` around `fn(...args)` and normalize with `Promise.resolve(result)`.
