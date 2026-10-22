import React from 'react';

import { CHIP_ROW_ROOM_BELOW } from '@/components/ui/account_chips.geometry';
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
      topRoom={CHIP_ROW_ROOM_BELOW}
    />
  );
}
