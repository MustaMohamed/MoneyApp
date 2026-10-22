import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

import { resolvePeriodRowTopRoom } from './commitment_form.geometry';

interface MeasuredRows {
  presetsRowBottom?: number;
  customRowTop?: number;
  periodRowTop?: number;
}

type MeasuredKey = keyof MeasuredRows;

export interface RecurrencePeriodRoom {
  periodTopRoom: number;
  onPresetsRowLayout: (event: LayoutChangeEvent) => void;
  onCustomRowLayout: (event: LayoutChangeEvent) => void;
  onPeriodRowLayout: (event: LayoutChangeEvent) => void;
}

/** The period pills' room above, from where the presets, the custom row and the period row lay out. */
export function useRecurrencePeriodRoom(): RecurrencePeriodRoom {
  const [rows, setRows] = useState<MeasuredRows>({});

  const measure = useCallback((key: MeasuredKey, value: number) => {
    setRows((previous) => (previous[key] === value ? previous : { ...previous, [key]: value }));
  }, []);

  return {
    periodTopRoom: resolvePeriodRowTopRoom(
      rows.presetsRowBottom,
      rows.customRowTop,
      rows.periodRowTop,
    ),
    onPresetsRowLayout: (event) => {
      const { y, height } = event.nativeEvent.layout;
      measure('presetsRowBottom', y + height);
    },
    onCustomRowLayout: (event) => measure('customRowTop', event.nativeEvent.layout.y),
    onPeriodRowLayout: (event) => measure('periodRowTop', event.nativeEvent.layout.y),
  };
}
