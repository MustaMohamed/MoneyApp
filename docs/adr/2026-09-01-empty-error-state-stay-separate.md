# ADR: EmptyState and ErrorState stay separate components

- **Date:** 2026-09-01
- **Status:** accepted
- **Ticket:** #340 (`debt:quality`, filed from #290 via PR #337)
- **Applies to:** `src/components/ui/empty_state.tsx`, `src/components/ui/error_state.tsx`, and the geometry both consume from `src/components/ui/state_screen.geometry.ts`

They stay two components. #290 asked whether `EmptyState` and `ErrorState` are one component wearing two names; the ruling is that they are genuinely different, that only their geometry is shared, and that a merge behind a variant prop is refused. The ruling shipped as a comment in #337, and #353's comment fold (`d469d10c`) deleted it outright, so until this file the decision was recorded nowhere in the tree. This is now the canonical record; each component carries a one-line pointer here and nothing more.

Every fact below was re-verified against the tree on 2026-09-01, not copied from #290. The line numbers had drifted since the issue was filed; the counts had not.

## 1. The four discriminating facts

**The action is optional in one and mandatory in the other.** `onAction?` at `empty_state.tsx:27`, against a required `onAction: () => void` at `error_state.tsx:22`. `grep -rn "<EmptyState" src --include="*.tsx"` returns 9 call sites, and 4 pass no action at all: `src/modules/commitments/screens/commitments/index.tsx:191`, `src/modules/goals/screens/goals/index.tsx:20`, `src/modules/categories/screens/settings/categories/index.tsx:112`, `src/modules/onboarding/screens/onboarding/more_accounts/index.tsx:63`. Both `ErrorState` callers pass one, and the type would refuse them otherwise: `src/modules/navigation/components/startup_error.tsx:15`, `src/modules/navigation/components/route_error_fallback.tsx:9`.

**The action widget differs.** An `EmptyState` action is a gold gradient CTA (`empty_state.tsx:130-145`) or a bare text link (`:147-156`), chosen by variant config, with no in-flight state. An `ErrorState` action is the shared `Button` with `isLoading` and `isDisabled` (`error_state.tsx:53-59`), because its one job is a retry that can be in flight; both callers use exactly that.

**The wrapper differs.** `EmptyState` renders a plain `View` (`empty_state.tsx:112`) and is embedded in its caller's own layout, list bodies and tab content slots. `ErrorState` owns a route-level `Screen` (`error_state.tsx:41`); its callers are whole-screen fallbacks, the startup error and the router error boundary.

**The a11y and testID contracts differ.** `ErrorState` requires `actionAccessibilityLabel` (`error_state.tsx:21`) and takes a `testID` (`:25`) that lands on its `Screen` (`:41`); both callers pass both (`startup-error`, `route-error`). `EmptyState`'s public props carry neither (`empty_state.tsx:25-28`); its labels are internal, derived from variant config (`:134`, `:152`), and its only testID is the internal gradient probe `empty-state-cta-gradient` (`:137`).

## 2. What is shared, and how the sharing is guarded

The geometry in `state_screen.geometry.ts`, and nothing else. The two kinds share the resolver and the slot names, not the values: error is a 64 icon circle and 320 body width (`state_screen.geometry.ts:26-32`), empty is 80 and 260 (`:33-39`), and the action slot itself differs (`:83-86`, full-width for error only). That shared file is what #340 predicts will make the next reader reopen this question. Since #358 it is typed shut: `as const satisfies StateScreenGeometry` (`:40`, the #338 guard) makes a dropped member or a re-split slot fail typecheck rather than drift silently. Sharing the geometry while splitting the components is a stable state, not an accident waiting to converge.

## 3. The rejected alternative

One component with a variant prop was weighed in #290 and is refused. The merged prop surface would be a discriminated union with a nullable CTA slot: `isActionLoading`, `isActionDisabled`, `actionAccessibilityLabel` and `testID` mean nothing to the four action-less empty variants, and the variant-config copy machinery means nothing to error callers, which pass free strings. The wrapper split is worse than cosmetic: the merged component would own a `Screen` on one discriminant and not the other, so what a caller may embed it in changes with a prop value. Every caller would use roughly half the surface, which is the two-half-used-prop-sets component #290 itself warned about, built deliberately this time.

## 4. Provenance

The ruling was reached in #290 and shipped as a comment on `error_state.tsx` in #337, with `empty_state.tsx` pointing at it; the pointer exists because #337's review de-duplicated a pasted second copy, the drift shape #290 was filed about, reproduced by its own fix. #353 (`d469d10c`) then deleted both comments in the repo-wide comment fold: `grep -rn "#290" src/` returns nothing on this ADR's date. A decision that lives only in a comment did not survive one comment sweep, which is #340's argument for this file. The components keep a one-line pointer each; the reasoning lives here and nowhere else.
