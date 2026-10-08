import { useMemo } from 'react';

import type { SegmentedTabsCorners, TabSegment, TabSegmentIcon } from './tabs';
import type { TabsTriggerHitSlop } from './tabs.geometry';

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
  corners?: SegmentedTabsCorners;
  /** Opt-in touch area past each tab's top and bottom edge. */
  triggerHitSlop?: TabsTriggerHitSlop;
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
