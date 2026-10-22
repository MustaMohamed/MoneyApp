import React from 'react';

import { SearchFilterRow } from '@/components/ui/search_filter_row';
import { Strings } from '@/constants/strings';

import { SUMMARY_HEADER_MARGIN_BOTTOM } from './summary_header.geometry';

interface Props {
  value: string;
  onChange: (value: string) => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export function CommitmentSearchRow({
  value,
  onChange,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <SearchFilterRow
      value={value}
      placeholder={Strings.searchCommitmentsPlaceholder}
      onChangeText={onChange}
      onOpenFilter={onOpenFilter}
      activeFilterCount={activeFilterCount}
      filterBadgeTestID="commitment-filter-badge"
      topRoom={SUMMARY_HEADER_MARGIN_BOTTOM}
    />
  );
}
