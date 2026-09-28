import React from 'react';

import { SearchFilterRow } from '@/components/ui/search_filter_row';
import { Strings } from '@/constants/strings';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
  isDisabled?: boolean;
}

export function SearchRow({
  value,
  onChange,
  onOpenFilter,
  activeFilterCount,
  isDisabled,
}: Props): React.ReactElement {
  return (
    <SearchFilterRow
      value={value}
      placeholder={Strings.searchTransactionsPlaceholder}
      onChangeText={onChange}
      onOpenFilter={onOpenFilter}
      activeFilterCount={activeFilterCount}
      filterBadgeTestID="filter-badge"
      isDisabled={isDisabled}
    />
  );
}
