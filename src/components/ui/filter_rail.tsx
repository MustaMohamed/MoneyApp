import { Surface } from 'heroui-native';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { MonthFilter } from './month_filter';
import { SegmentFilter, type SegmentFilterOption } from './segment_filter';

export type FilterRailOption<T extends string = string> = SegmentFilterOption<T>;

interface FilterRailProps<T extends string = string> {
  selectedMonth: string;
  onSelectedMonthChange: (month: string) => void;
  selectedFilter: T;
  onSelectedFilterChange: (filter: T) => void;
  filters: ReadonlyArray<FilterRailOption<T>>;
  filterAccessibilityLabel: string;
}

export function FilterRail<T extends string>({
  selectedMonth,
  onSelectedMonthChange,
  selectedFilter,
  onSelectedFilterChange,
  filters,
  filterAccessibilityLabel,
}: FilterRailProps<T>) {
  return (
    <View className="px-4 pt-1 pb-2">
      <Surface
        variant="transparent"
        className="bg-default/40 border-border rounded-2xl border p-1.5 shadow-none"
      >
        <View style={{ gap: Spacing.xs }}>
          <MonthFilter
            selectedMonth={selectedMonth}
            onSelectedMonthChange={onSelectedMonthChange}
          />
          <SegmentFilter
            selectedFilter={selectedFilter}
            onSelectedFilterChange={onSelectedFilterChange}
            filters={filters}
            accessibilityLabel={filterAccessibilityLabel}
          />
        </View>
      </Surface>
    </View>
  );
}
