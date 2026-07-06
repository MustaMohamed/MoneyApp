import React from 'react';

import {
  FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SEARCH_INPUT_WITH_CLEAR_STYLE,
  SearchFilterRow,
} from '@/components/ui/search_filter_row';
import { Strings } from '@/constants/strings';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export {
  FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE,
  SEARCH_INPUT_COMPACT_STYLE,
  SEARCH_INPUT_WITH_CLEAR_STYLE,
};

export function SearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <SearchFilterRow
      value={value}
      placeholder={Strings.searchTransactionsPlaceholder}
      onChangeText={onChange}
      onClear={onClear}
      onOpenFilter={onOpenFilter}
      activeFilterCount={activeFilterCount}
      filterBadgeTestID="filter-badge"
    />
  );
}
