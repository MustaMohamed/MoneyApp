import { Size } from '@/constants/theme';

import { type SegmentFilterProps, useSegmentFilter } from './segment_filter.hook';
import { SegmentedTabs } from './tabs';

export function SegmentFilter<T extends string>(props: SegmentFilterProps<T>) {
  const segmentFilter = useSegmentFilter(props);

  return (
    <SegmentedTabs
      segments={segmentFilter.segments}
      value={props.selectedFilter}
      onValueChange={props.onSelectedFilterChange}
      variant="solid-gold"
      layout="scrollable"
      scrollAlign="visible"
      listClassName="self-stretch rounded-full bg-default/60"
      segmentWidth={Size.filterSegmentCompactWidth}
      density="compact"
      accessibilityLabel={props.accessibilityLabel}
    />
  );
}

export type { SegmentFilterOption, SegmentFilterProps } from './segment_filter.hook';
