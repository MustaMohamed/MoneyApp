# Commitment Form Refactor — Design Spec
**Date:** 2026-05-08  
**Scope:** `screens/commitments/` — form body, add/edit hooks, state stores  
**Goal:** Make RHF the single source of truth for all form-related data; collapse 5 Zustand stores to 3; reduce `CommitmentFormBody` from 18 props to 7; eliminate hook duplication via a shared module.

---

## Problem Statement

The commitment form currently splits ownership of the same facts across RHF and Zustand:

- `amountType` lives in `useAddCommitmentStore` but the corresponding `amount_type` field is absent from the RHF schema — so the hook must pass it around as a prop and manually inject it at submit time.
- `durationType` lives in **both** `useAddCommitmentStore` *and* the RHF schema as `duration_type`. Every change requires two sync calls: `setDurationType(v)` + `form.setValue('duration_type', v)`. Missing either causes a silent bug.
- `recurrencePreset` is stored in Zustand even though it is purely a derived view of `recurrence_every` + `recurrence_period`, which are already in the form.
- `CommitmentFormBody` has 18 props because every piece of state is threaded through from parent to child.
- `add_commitment.hook.ts` and `edit_commitment.hook.ts` duplicate ~120 lines of identical schema, types, mapping constants, and handlers.
- `commitment_form_body.state.ts` is a global Zustand store for what is purely local component state (date picker visibility).

---

## Architecture

### Single source of truth: RHF

`amount_type` is added to the form schema. `duration_type` already exists in the schema — its Zustand mirror is deleted. `recurrencePreset` is removed from state entirely; it is computed on demand from `recurrence_every` and `recurrence_period`.

```
RHF form (CommitmentFormValues)
├── amount_type        ← NEW — was in AddStore/EditStore
├── name
├── amount
├── currency
├── category_id
├── recurrence_every   ← recurrencePreset derived from these two
├── recurrence_period
├── start_date
├── account_id
├── notes
├── duration_type      ← already in schema; Zustand mirror deleted
├── end_date
└── end_after_count
```

### Static schema replaces factory

The `createSchema(amountType, durationType)` factory is replaced with a single static schema. Conditional validation is handled in `superRefine`, which already receives all submitted values:

```ts
export const COMMITMENT_SCHEMA = z.object({
  amount_type: z.nativeEnum(AmountType),
  // ... all other fields
}).superRefine((data, ctx) => {
  if (data.amount_type === AmountType.Fixed && !data.amount)
    ctx.addIssue({ code: 'custom', message: Strings.commitmentsErrAmountRequired, path: ['amount'] });
  if (data.duration_type === DurationType.UntilDate && !data.end_date)
    ctx.addIssue({ code: 'custom', message: Strings.commitmentsErrEndDateRequired, path: ['end_date'] });
  if (data.duration_type === DurationType.AfterCount && !data.end_after_count)
    ctx.addIssue({ code: 'custom', message: Strings.commitmentsErrAfterCountRequired, path: ['end_after_count'] });
});
```

No `useMemo`, no external parameters, no re-creation on state change.

---

## File Inventory

### Created

| File | Purpose |
|---|---|
| `screens/commitments/commitment_form.shared.ts` | Schema, `CommitmentFormValues` type, `PRESET_MAP`, `buildAddDefaults()`, `buildEditDefaults(commitment)`, `detectPreset(every, period)` |

### Modified

| File | Change |
|---|---|
| `screens/commitments/components/commitment_form_body.tsx` | 18 props → 7; owns all internal state and handlers via form.watch and commitment_form_body.state |
| `screens/commitments/components/commitment_form_body.state.ts` | Expands to include `categoryPickerVisible` and `accountPickerVisible` (was only date pickers) |
| `screens/commitments/components/recurrence_picker.tsx` | Re-points `CommitmentFormValues` import from `add_commitment.hook` to shared module |
| `screens/commitments/components/duration_picker.tsx` | Re-points `CommitmentFormValues` import from `add_commitment.hook` to shared module |
| `screens/commitments/add_commitment/add_commitment.hook.ts` | Imports from shared module; drops store dependency; simplified return |
| `screens/commitments/add_commitment/add_commitment.state.ts` | Shrinks to `{ saving: boolean }` only |
| `screens/commitments/add_commitment/index.tsx` | Passes 5 props instead of 20+ |
| `screens/commitments/edit_commitment/edit_commitment.hook.ts` | Imports from shared module; drops store dependency; simplified return |
| `screens/commitments/edit_commitment/edit_commitment.state.ts` | Shrinks to `{ saving: boolean, deactivateDialogVisible: boolean }` |
| `screens/commitments/edit_commitment/index.tsx` | Same as add plus deactivate button/dialog |

### Deleted

| File | Reason |
|---|---|
| `screens/commitments/add_commitment/add_commitment.store.ts` | Entirely replaced by `amount_type` and `duration_type` living in RHF |
| `screens/commitments/edit_commitment/edit_commitment.store.ts` | Same |

### Untouched

- All database, entity, store (`commitment.store.ts`, `account.store.ts`, `category.store.ts`), and test files
- `detail/`, `detail_payment/` screens
- `commitments.hook.ts`, `commitments.anim.ts`, `components/commitment_row.tsx`, `components/summary_header.tsx`, etc.

---

## Detailed Design

### `commitment_form.shared.ts`

```ts
export const COMMITMENT_SCHEMA = z.object({ ... }).superRefine(...)
export type CommitmentFormValues = z.infer<typeof COMMITMENT_SCHEMA>

export const PRESET_MAP: Record<RecurrencePreset, { every: number; period: RecurrencePeriod } | null> = {
  [RecurrencePreset.Monthly]:  { every: 1, period: RecurrencePeriod.Months },
  [RecurrencePreset.Weekly]:   { every: 1, period: RecurrencePeriod.Weeks },
  [RecurrencePreset.Annually]: { every: 1, period: RecurrencePeriod.Years },
  [RecurrencePreset.Custom]:   null,
}

export function buildAddDefaults(): CommitmentFormValues { ... }      // today, Fixed, Forever, EGP, empty
export function buildEditDefaults(c: Commitment): CommitmentFormValues { ... } // maps entity fields
export function detectPreset(every: number, period: RecurrencePeriod): RecurrencePreset { ... }
```

### `CommitmentFormBody` — props

```ts
interface CommitmentFormBodyProps {
  form: UseFormReturn<CommitmentFormValues>;
  categories: Category[];
  accounts: Account[];
  saving: boolean;
  onSubmit: () => void;
  title: string;
  locked?: boolean;
}
```

### `CommitmentFormBody` — internal responsibilities

| Responsibility | How |
|---|---|
| Current amount type | `form.watch('amount_type')` |
| Current duration type | `form.watch('duration_type')` |
| Current recurrence preset | `detectPreset(form.watch('recurrence_every'), form.watch('recurrence_period'))` |
| Changing amount type | `form.setValue('amount_type', v)` |
| Changing duration type | `form.setValue('duration_type', v)` + clear `end_date`/`end_after_count` |
| Changing recurrence preset | `form.setValue('recurrence_every', ...)` + `form.setValue('recurrence_period', ...)` via `PRESET_MAP` |
| Category/account selection | `form.setValue('category_id'/'account_id', ...)` + close picker |
| Derived selected category/account | `categories.find(c => c.id === form.watch('category_id'))` |
| Picker / date picker visibility | `useCommitmentFormBodyState` |

The body passes `recurrencePreset` and `onPresetChange` down to `RecurrencePicker` and `durationType` + `onDurationTypeChange` down to `DurationPicker` — their prop interfaces are unchanged.

### `commitment_form_body.state.ts` — expanded

```ts
interface CommitmentFormBodyStateShape {
  categoryPickerVisible: boolean;
  accountPickerVisible: boolean;
  showStartDatePicker: boolean;
  showEndDatePicker: boolean;
}
```

Reset on unmount via `useEffect(() => () => useCommitmentFormBodyState.getState().reset(), [])` inside the body component.

### `useAddCommitment` — simplified return

```ts
return {
  state: {
    saving: screenState.saving,
    categories: categoryState.categories,
    accounts: accountState.accounts,
  },
  form,
  onSubmit: form.handleSubmit(onValid),
}
```

`onValid` reads `data.amount_type` and `data.duration_type` directly from the submitted values — no Zustand sync required.

### `useEditCommitment` — simplified return

Same shape as add, plus:
```ts
return {
  state: { saving, categories, accounts, deactivateDialogVisible },
  form,
  onSubmit: form.handleSubmit(onValid),
  handleDeactivate,
  confirmDeactivate,
  cancelDeactivate,
}
```

Pre-fill effect simplifies to:
```ts
useEffect(() => {
  if (!commitment) return;
  form.reset(buildEditDefaults(commitment));
  // No setAmountType / setDurationType calls — these are now form field values
}, [commitment?.id]);
```

---

## State Store Summary (after)

| Store | Holds | Owner |
|---|---|---|
| `useAddCommitmentState` | `saving` | `useAddCommitment` hook |
| `useEditCommitmentState` | `saving`, `deactivateDialogVisible` | `useEditCommitment` hook |
| `useCommitmentFormBodyState` | `categoryPickerVisible`, `accountPickerVisible`, `showStartDatePicker`, `showEndDatePicker` | `CommitmentFormBody` component |

3 stores (down from 5). No Zustand store holds data that RHF also holds.

---

## Testing

All existing tests in `__tests__/` are untouched — they test the database query layer and store logic, not the form UI. No new tests are required by this refactor. Coverage thresholds (80% lines / 95% functions / 100% branches) are unaffected.

---

## Out of Scope

- `RecurrencePicker` and `DurationPicker` internal logic — only the `CommitmentFormValues` import source changes
- Any detail, list, or dashboard screens
- Database migrations or entity changes
- The nested-ScrollView structure in `edit_commitment/index.tsx` (outer `ScrollView` wrapping `CommitmentFormBody` which has its own `ScrollView` + `KeyboardAvoidingView`). This is a pre-existing structural issue unrelated to state ownership; fixing it is a separate task.
