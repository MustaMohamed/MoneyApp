import { useWindowDimensions } from 'react-native';

import { resolveSegmentFilterWidth } from './segment_filter.geometry';
import { type SegmentFilterProps, useSegmentFilter } from './segment_filter.hook';
import { SegmentedTabs } from './tabs';

export function SegmentFilter<T extends string>(props: SegmentFilterProps<T>) {
  const segmentFilter = useSegmentFilter(props);
  const segmentWidth = resolveSegmentFilterWidth(useWindowDimensions().fontScale);

  return (
    <SegmentedTabs
      segments={segmentFilter.segments}
      value={props.selectedFilter}
      onValueChange={props.onSelectedFilterChange}
      variant="solid-gold"
      layout="scrollable"
      scrollAlign="visible"
      // Two literals, never a composed string: Uniwind scans class names at build time.
      listClassName={
        props.corners === 'form'
          ? 'self-stretch bg-default/60'
          : 'self-stretch rounded-full bg-default/60'
      }
      segmentWidth={segmentWidth}
      density="compact"
      corners={props.corners}
      accessibilityLabel={props.accessibilityLabel}
    />
  );
}

export type { SegmentFilterOption, SegmentFilterProps } from './segment_filter.hook';
