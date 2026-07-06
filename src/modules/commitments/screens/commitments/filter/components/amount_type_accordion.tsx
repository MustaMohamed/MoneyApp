import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

import { FilterAccordionShell, FilterOptionPillList } from '@/components/ui/filter_accordion';
import { AmountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import { COMMITMENT_AMOUNT_TYPE_OPTIONS } from '../filter_options';

interface Props {
  selectedTypes: AmountType[];
  selectedCount: number;
  summary: string;
  expanded: boolean;
  onToggleSection: () => void;
  onToggleType: (type: AmountType) => void;
}

export function CommitmentAmountTypeAccordion({
  selectedTypes,
  selectedCount,
  summary,
  expanded,
  onToggleSection,
  onToggleType,
}: Props): React.ReactElement {
  const options = COMMITMENT_AMOUNT_TYPE_OPTIONS.map((option) => ({
    id: option.value,
    label: option.label,
    selected: selectedTypes.includes(option.value),
    accessibilityLabel: Strings.commitmentFilterAmountTypeAccessibility(option.label),
    startIcon: <MaterialCommunityIcons name={option.icon} size={ms(13)} color={CoreTokens.text2} />,
  }));

  return (
    <FilterAccordionShell
      title={Strings.filterSectionAmountType}
      count={selectedCount}
      summary={summary}
      expanded={expanded}
      onToggle={onToggleSection}
    >
      <FilterOptionPillList options={options} onToggle={onToggleType} />
    </FilterAccordionShell>
  );
}
