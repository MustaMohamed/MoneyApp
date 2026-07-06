import { useMemo } from 'react';

import type { TabSegment, TabSegmentIcon } from './tabs';

export interface SegmentFilterOption<T extends string = string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
  icon?: TabSegmentIcon;
}

export interface SegmentFilterProps<T extends string = string> {
  selectedFilter: T;
  onSelectedFilterChange: (filter: T) => void;
  filters: ReadonlyArray<SegmentFilterOption<T>>;
  accessibilityLabel: string;
}

export function useSegmentFilter<T extends string>({ filters }: SegmentFilterProps<T>) {
  const segments = useMemo<TabSegment<T>[]>(
    () =>
      filters.map((filter) => ({
        value: filter.value,
        label: filter.label,
        accessibilityLabel: filter.accessibilityLabel,
        icon: filter.icon,
      })),
    [filters],
  );

  return { segments };
}
