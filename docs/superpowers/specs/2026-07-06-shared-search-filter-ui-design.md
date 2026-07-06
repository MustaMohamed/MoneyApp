# Shared Search and Filter UI Design

## Context

Transactions and Commitments now have matching compact search rows and advanced filter sheets. The shipped behavior is approved, but the implementation duplicates presentational UI across the two modules:

- compact search input, clear button, filter button, and badge
- accordion header layout with count badge, summary text, and chevron
- account and category selectable-pill sections
- amount range accordion content

The previous PR also exposed an architecture risk: filter components can easily drift into owning state or parsing logic. This refactor keeps the behavior unchanged while extracting shared presentational primitives that make that boundary harder to violate.

## Goals

- Preserve the current Transactions and Commitments search/filter behavior and visual layout.
- Reduce duplicated presentational code between the two modules.
- Keep all domain state, parsing, summaries, and filtering logic in existing hooks/stores/helpers.
- Keep shared UI components presentational: no React local state, no Zustand reads, no domain helper imports.
- Strengthen tests so future changes catch drift in layout props and architecture boundaries.

## Non-Goals

- Do not redesign the search row or filter sheet.
- Do not introduce a generic filter-sheet engine.
- Do not move transaction or commitment stores, hooks, or filtering helpers into shared code.
- Do not change filter semantics, copy, badge counts, or reset/apply behavior.
- Do not touch unrelated feature screens.

## Architecture

Shared UI code will live under `src/components/ui/` and will be composed by thin domain wrappers in each module.

Planned shared components:

- `SearchFilterRow`: compact search input, optional clear button, trailing filter button, and active filter badge.
- `FilterAccordionShell`: shared accordion container/header layout for section title, count badge, summary, and chevron.
- `FilterOptionPillList`: shared selectable-pill list renderer for account/category-like option groups.
- `AmountRangeFilterContent`: shared currency tabs and min/max inputs used inside the amount accordion.

Transactions and Commitments will keep their module files:

- `src/modules/transactions/screens/transactions/components/search_row.tsx`
- `src/modules/commitments/screens/commitments/components/search_row.tsx`
- `src/modules/*/screens/*/filter/components/*_accordion.tsx`

Those module files become thin adapters that pass domain labels, accessibility text, test IDs, options, and callbacks into the shared UI primitives.

## Data Flow

No data-flow ownership changes:

1. Screen hooks/stores own search text, applied filters, draft filters, amount text, parsing, summaries, and counts.
2. Domain wrappers receive hook state and callbacks from existing screen/filter files.
3. Shared UI primitives render only the props they receive and call only the callbacks they are passed.

The shared components must not import:

- transaction or commitment stores
- transaction or commitment filter helpers
- account/category stores
- domain screen hooks

## Component Boundaries

### SearchFilterRow

Inputs:

- `value`
- `placeholder`
- `onChangeText`
- `onClear`
- `onOpenFilter`
- `activeFilterCount`
- optional `filterBadgeTestID`
- optional accessibility labels

Behavior:

- uses the same compact dimensions currently used by both screens
- reserves right padding only when the clear button is visible
- shows the badge only when `activeFilterCount > 0`
- keeps the filter icon at the end of the row

### FilterAccordionShell

Inputs:

- `title`
- `summary`
- `count`
- `expanded`
- `onToggle`
- `children`

Behavior:

- renders the shared surface, title row, count badge, summary text, and chevron
- hides summary text while expanded, matching current behavior
- delegates all body content to `children`

### FilterOptionPillList

Inputs:

- an array of already-mapped option view models: `id`, `label`, `selected`, `accessibilityLabel`, optional `icon`
- `onToggle(id)`

Behavior:

- renders the same wrapping pill layout used today
- does not know whether options represent accounts, categories, amount types, or recurrence presets

### AmountRangeFilterContent

Inputs:

- `currency`
- `minValue`
- `maxValue`
- `onChangeCurrency`
- `onChangeMinText`
- `onChangeMaxText`
- `accessibilityLabel`

Behavior:

- renders EGP/USD segmented currency tabs
- renders min/max inputs with existing labels and placeholders
- does not parse values

## Testing

Tests will be updated or added before implementation:

- `__tests__/components/ui/search_filter_row.test.tsx`
  - badge hidden at zero, visible with count
  - clear button appears only with text
  - filter button calls `onOpenFilter`
  - compact style constants remain stable

- `__tests__/components/ui/filter_accordion.test.tsx`
  - renders title, summary, count badge, and children
  - hides summary while expanded
  - calls `onToggle`

- Existing screen tests:
  - Transactions and Commitments search row tests continue to verify domain placeholders and badge test IDs.
  - Filter sheet tests continue to verify reset/apply actions and section wiring.

- Architecture test:
  - extend `filter_component_architecture.test.ts` so shared filter UI and domain wrappers stay presentational.
  - shared UI primitives must not import domain helper/store modules.

## Manual QA Gate

After implementation and automated verification, device QA is required on the real app:

- Transactions search row remains compact and clear button does not overlap input text.
- Transactions filter badge count appears and updates.
- Transactions reset/apply behavior still works for accounts, categories, and amount range.
- Commitments search row matches Transactions spacing.
- Commitments filter badge count appears and updates.
- Commitments reset/apply behavior still works for accounts, categories, amount range, amount type, and recurrence.

## Risks and Mitigations

- Risk: over-generalizing the filter sheet.
  - Mitigation: share only presentational leaf components and keep screen-specific orchestration in existing modules.

- Risk: losing domain-specific accessibility copy or test IDs.
  - Mitigation: module wrappers continue to pass those values explicitly.

- Risk: reintroducing local state or parsing into components.
  - Mitigation: architecture test scans shared UI and filter wrappers for forbidden hooks and domain helper imports.

## Acceptance Criteria

- Transactions and Commitments search/filter behavior is visually unchanged.
- Shared UI primitives are used by both domains for search row and common filter accordion pieces.
- Domain wrappers remain thin and presentational.
- No component in the shared filter/search UI path owns parsing, filtering, or store state.
- Automated tests pass for shared UI, screen wrappers, hooks, stores, and architecture boundaries.
- Manual device QA checklist is ready for user execution.
