import { useFormState, type UseFormReturn } from 'react-hook-form';

import type { CommitmentFormValues } from '../commitment_form.shared';

const ENDS_FAULT_FIELDS = ['endAfterCount', 'endDate'] as const;

export interface DurationPickerFaults {
  countError: string | undefined;
  dateError: string | undefined;
}

/** The count and date faults, read through the picker's own subscription: a compiled body reuses the picker while `form` keeps its identity. */
export function useDurationPickerFaults(
  form: UseFormReturn<CommitmentFormValues>,
): DurationPickerFaults {
  const formState = useFormState({ control: form.control, name: ENDS_FAULT_FIELDS });
  return {
    countError: form.getFieldState('endAfterCount', formState).error?.message,
    dateError: form.getFieldState('endDate', formState).error?.message,
  };
}
