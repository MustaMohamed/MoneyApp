# M2e — Advanced Filter Drawer Implementation Plan (Index)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Execute parts in numerical order — later parts depend on earlier ones.

**Spec:** `docs/superpowers/specs/2026-05-02-m2e-advanced-filter-drawer-design.md`

**Goal:** Add the U31 Advanced Filter Drawer to the Transactions screen, enabling multi-axis filtering by account, category, date range, and amount.

**Architecture:** Bottom-sheet drawer with explicit Apply semantics; draft state isolated from applied state; SQL `getTransactions` extended with optional clauses for the new axes; new dedicated multi-select sub-pickers (no reuse of single-select pickers).

**Tech Stack:** React Native (Expo), TypeScript strict, Zustand v5, expo-sqlite, react-native-reanimated, MaterialCommunityIcons, `@react-native-community/datetimepicker` (added in Part 4).

---

## Plan Parts

Execute parts in order. Each part is self-contained and ends at a green test/typecheck state — safe to commit, push, and pause between parts.

| Part | File | Scope | Dependencies |
|---|---|---|---|
| 1 | `01-foundation.md` | DatePreset enum, strings, AdvancedFilters type, pure helpers (TDD), filter.store (TDD), transactions.store extension (TDD) | none |
| 2 | `02-database.md` | TransactionListFilters widening, getTransactions SQL extension (TDD) | Part 1 (helpers + types) |
| 3 | `03-ui-primitives.md` | FilterButton, FilterSectionRow, FilterAmountSection, FilterDateSection, sub-pickers (Account, Category, Date Custom) | Part 1 (store + types) |
| 4 | `04-drawer-assembly.md` | datetimepicker dependency, filter.anim, filter.hook, FilterDrawer index | Parts 1, 3 |
| 5 | `05-wiring-verification.md` | search_bar style prop, transactions.hook extension, transactions/index updates, end-to-end verification | Parts 1, 2, 4 |

---

## Conventions Followed Throughout

- **File naming:** snake_case for filenames, camelCase for TypeScript identifiers.
- **Per-folder modules:** `index.tsx` (template only), `<name>.hook.ts` (logic), `<name>.store.ts` (Zustand), `<name>.anim.ts` (Reanimated), `<name>.helpers.ts` (pure functions). `components/` for sub-components used only by that screen.
- **Tokens:** All sizing/spacing/colors come from `constants/theme.ts` via `ms()` / `msFont()` from `utils/responsive.ts`.
- **Strings:** All user-visible copy lives in `constants/strings.ts`.
- **Tests:** Pure-logic tests only, in `__tests__/` with snake_case filenames. Coverage thresholds 80% lines / 95% functions / 100% branches on the logic layer.
- **Commits:** One commit per task. Conventional Commits style (`feat(m2e): ...`, `test(m2e): ...`, `refactor(m2e): ...`).

---

## How to Execute

### Subagent-driven (recommended)

Open a fresh session per part:

```
Read docs/superpowers/plans/2026-05-02-m2e-advanced-filter-drawer/01-foundation.md
and execute every task in order using subagent-driven-development.
```

### Inline

Open one session and walk through all 5 parts using `executing-plans`. Pause and review between parts — each part ends at a clean checkpoint (tests green, no half-applied state).
