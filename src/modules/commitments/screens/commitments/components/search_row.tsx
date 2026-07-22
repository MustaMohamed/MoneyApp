import React from 'react';

import {
  FILTER_BADGE_STYLE as COMMITMENT_FILTER_BADGE_STYLE,
  FILTER_BUTTON_COMPACT_STYLE as COMMITMENT_FILTER_BUTTON_STYLE,
  SEARCH_INPUT_COMPACT_STYLE as COMMITMENT_SEARCH_INPUT_STYLE,
  SearchFilterRow,
} from '@/components/ui/search_filter_row';
import { Strings } from '@/constants/strings';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export {
  COMMITMENT_FILTER_BADGE_STYLE,
  COMMITMENT_FILTER_BUTTON_STYLE,
  COMMITMENT_SEARCH_INPUT_STYLE,
};

export function CommitmentSearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <SearchFilterRow
      value={value}
      placeholder={Strings.searchCommitmentsPlaceholder}
      onChangeText={onChange}
      onClear={onClear}
      onOpenFilter={onOpenFilter}
      activeFilterCount={activeFilterCount}
      filterBadgeTestID="commitment-filter-badge"
    />
  );
}
