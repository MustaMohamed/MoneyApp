# Smooth Transitions Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reduce avoidable render and IO work during navigation transitions without changing user-visible finance behavior.

**Architecture:** Keep this pass narrow: introduce one small deferral helper for focus-time reloads, enable the existing `react-native-screens` freeze support at the app/navigation boundary, and lazy-mount expensive sheet bodies through the existing HeroUI-backed `Sheet` primitive plus the add-transaction sheet. Sheet state remains owned by existing stores and hooks.

**Tech Stack:** Expo Router, React Native `InteractionManager`, `react-native-screens`, HeroUI Native `BottomSheet`, Jest, TypeScript strict.

---

## Root Cause Summary

- Closed `Sheet` instances still render `BottomSheet.Content`, so every hidden sheet keeps its body and hooks mounted.
- `AddTransactionSheet` calls `useAddTransaction()` and mounts account/category picker sheets even when `visible=false`.
- Dashboard, budget, and commitments perform DB/store reloads directly inside `useFocusEffect`, racing navigation animations.
- Onboarding already sets `freezeOnBlur`, but root/app/tabs stacks do not, and `enableFreeze(true)` is not called at startup.

## Files

- Create: `src/utils/run_after_interactions.ts`
- Test: `__tests__/utils/run_after_interactions.test.ts`
- Modify: `src/app/_layout.tsx`
- Modify: `src/app/(app)/_layout.tsx`
- Modify: `src/app/(app)/(tabs)/_layout.tsx`
- Modify: `src/components/ui/sheet.tsx`
- Modify: `src/modules/transactions/screens/transactions/transaction_form/index.tsx`
- Modify: `src/modules/dashboard/screens/dashboard/dashboard.hook.ts`
- Modify: `src/modules/budget/screens/budget/budget.hook.ts`
- Modify: `src/modules/commitments/screens/commitments/commitments.hook.ts`

## Tasks

- [x] Add a failing unit test for a helper that schedules work with `InteractionManager.runAfterInteractions`, runs cancelled work never, and supports async callbacks without swallowing the promise chain.
- [x] Implement `runAfterInteractions(callback)` as a tiny utility returning `{ cancel() }`, using explicit `try`/`catch` and `Promise.resolve(result)` rather than `Promise.try()`.
- [x] Enable `enableFreeze(true)` once at startup in `src/app/_layout.tsx`, and set `freezeOnBlur: true` on root/app/tabs navigators where safe.
- [x] Add a `mountMode?: 'always' | 'lazy'` prop to `Sheet`; default to `always` for compatibility, and only render the portal/content once open when `mountMode="lazy"`.
- [x] Split `AddTransactionSheet` into an outer gate and inner mounted body so `useAddTransaction()` and nested picker sheets are created only after the sheet is opened; preserve a short close grace period so the close animation has content.
- [x] Defer non-critical focus reloads in dashboard, budget, and commitments through `runAfterInteractions`, and cancel scheduled work on blur/unmount.
- [x] Run targeted tests for the new helper and affected transaction/sheet tests, then run typecheck, lint, format check, and the full Jest suite.

## Device QA Notes

- Manual device QA must verify tab transitions into Dashboard, Budget, Commitments, and Transactions while opening/closing Add Transaction.
- Watch for stale data after navigating back to the affected screens; reloads should happen after transitions, not disappear.
