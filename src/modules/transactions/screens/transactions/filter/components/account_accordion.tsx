import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

import { TYPE_OPTIONS } from '@/components/account_type_pill';
import { FilterAccordionShell, FilterOptionPillList } from '@/components/ui/filter_accordion';
import { Strings } from '@/constants/strings';
import { resolveAccountGlyphColor } from '@/modules/accounts/constants/account_glyph_color';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { resolveAccountName } from '@/utils/account_name';
import { ms } from '@/utils/responsive';

interface Props {
  accounts: Account[];
  selectedIds: string[];
  selectedCount: number;
  summary: string;
  expanded: boolean;
  onToggleSection: () => void;
  onToggleId: (id: string) => void;
}

export function AccountAccordion({
  accounts,
  selectedIds,
  selectedCount,
  summary,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  const options = accounts.map((account) => {
    const label = resolveAccountName(account);
    return {
      id: account.id,
      label,
      selected: selectedIds.includes(account.id),
      accessibilityLabel: Strings.filterAccountAccessibility(label),
      startIcon: (
        <MaterialCommunityIcons
          name={TYPE_OPTIONS.find((option) => option.type === account.type)?.icon ?? 'bank'}
          size={ms(13)}
          color={resolveAccountGlyphColor(account.color)}
        />
      ),
    };
  });

  return (
    <FilterAccordionShell
      title={Strings.filterSectionAccounts}
      count={selectedCount}
      summary={summary}
      expanded={expanded}
      onToggle={onToggleSection}
    >
      <FilterOptionPillList options={options} onToggle={onToggleId} />
    </FilterAccordionShell>
  );
}
