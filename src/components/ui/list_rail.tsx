import type React from 'react';
import { View } from 'react-native';

import {
  LIST_RAIL,
  LIST_RAIL_STYLE,
  LIST_RAIL_TABS_STYLE,
} from '@/components/ui/list_rail.geometry';
import { MonthFilter } from '@/components/ui/month_filter';
import { SegmentFilter, type SegmentFilterOption } from '@/components/ui/segment_filter';

export interface ListRailProps<T extends string> {
  testID: string;
  selectedMonth: string;
  onSelectedMonthChange: (month: string) => void;
  selectedFilter: T;
  onSelectedFilterChange: (filter: T) => void;
  filters: ReadonlyArray<SegmentFilterOption<T>>;
  accessibilityLabel: string;
}

/** The list tabs' month row over their segment rail; no HeroUI primitive stacks the two. */
export function ListRail<T extends string>({
  testID,
  selectedMonth,
  onSelectedMonthChange,
  selectedFilter,
  onSelectedFilterChange,
  filters,
  accessibilityLabel,
}: ListRailProps<T>): React.ReactElement {
  return (
    <View testID={testID} className="px-4" style={LIST_RAIL_STYLE}>
      <MonthFilter
        selectedMonth={selectedMonth}
        onSelectedMonthChange={onSelectedMonthChange}
        rowHitSlop={LIST_RAIL.monthRowHitSlop}
      />
      <View style={LIST_RAIL_TABS_STYLE}>
        <SegmentFilter
          selectedFilter={selectedFilter}
          onSelectedFilterChange={onSelectedFilterChange}
          filters={filters}
          accessibilityLabel={accessibilityLabel}
          corners="form"
          triggerHitSlop={LIST_RAIL.tabsHitSlop}
        />
      </View>
    </View>
  );
}
