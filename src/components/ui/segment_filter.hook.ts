import { useMemo } from 'react';

import type { TabSegment, TabSegmentIcon } from './tabs';
import type { TabsTriggerHitSlop } from './tabs.geometry';

export interface SegmentFilterOption<T extends string = string> {
  value: T;
  label: string;
  accessibilityLabel?: string;
  icon?: TabSegmentIcon;
}

interface SegmentFilterBaseProps<T extends string = string> {
  selectedFilter: T;
  onSelectedFilterChange: (filter: T) => void;
  filters: ReadonlyArray<SegmentFilterOption<T>>;
  accessibilityLabel: string;
}

/** The slop's grown scroll box follows the track's outline under form corners only, so the union stops a pill row naming it. */
export type SegmentFilterProps<T extends string = string> = SegmentFilterBaseProps<T> &
  (
    | {
        corners: 'form';
        /** Opt-in touch area past each tab's top and bottom edge. */
        triggerHitSlop?: TabsTriggerHitSlop;
      }
    | { corners?: 'pill'; triggerHitSlop?: never }
  );

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
