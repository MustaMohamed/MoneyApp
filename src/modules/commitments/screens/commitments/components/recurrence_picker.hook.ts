import { useCallback, useState } from 'react';
import { useFormState, type UseFormReturn } from 'react-hook-form';
import type { LayoutChangeEvent } from 'react-native';

import type { CommitmentFormValues } from '../commitment_form.shared';
import { resolvePeriodRowTopRoom } from './commitment_form.geometry';

interface MeasuredRows {
  presetsRowBottom?: number;
  customRowTop?: number;
  inputLineBottom?: number;
  periodRowTop?: number;
}

type MeasuredKey = keyof MeasuredRows;

export interface RecurrencePeriodRoom {
  periodTopRoom: number;
  onPresetsRowLayout: (event: LayoutChangeEvent) => void;
  onCustomRowLayout: (event: LayoutChangeEvent) => void;
  onInputLayout: (event: LayoutChangeEvent) => void;
  onPeriodRowLayout: (event: LayoutChangeEvent) => void;
}

/** The period pills' room above, from where the presets, the custom row, the `Every` input and the period row lay out. */
export function useRecurrencePeriodRoom(): RecurrencePeriodRoom {
  const [rows, setRows] = useState<MeasuredRows>({});

  const measure = useCallback((key: MeasuredKey, value: number) => {
    setRows((previous) => (previous[key] === value ? previous : { ...previous, [key]: value }));
  }, []);

  return {
    periodTopRoom: resolvePeriodRowTopRoom(
      rows.presetsRowBottom,
      rows.customRowTop,
      rows.inputLineBottom,
      rows.periodRowTop,
    ),
    onPresetsRowLayout: (event) => {
      const { y, height } = event.nativeEvent.layout;
      measure('presetsRowBottom', y + height);
    },
    onCustomRowLayout: (event) => measure('customRowTop', event.nativeEvent.layout.y),
    onInputLayout: (event) => {
      const { y, height } = event.nativeEvent.layout;
      measure('inputLineBottom', y + height);
    },
    onPeriodRowLayout: (event) => measure('periodRowTop', event.nativeEvent.layout.y),
  };
}

/** The `Every` fault, read through the picker's own subscription: a compiled body reuses the picker while `form` keeps its identity. */
export function useRecurrenceEveryFault(
  form: UseFormReturn<CommitmentFormValues>,
): string | undefined {
  const formState = useFormState({ control: form.control, name: 'recurrenceEvery' });
  return form.getFieldState('recurrenceEvery', formState).error?.message;
}
