import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

import { FilterAccordionShell, FilterOptionPillList } from '@/components/ui/filter_accordion';
import { RecurrencePreset } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import { COMMITMENT_RECURRENCE_OPTIONS } from '../filter_options';

interface Props {
  selectedPresets: RecurrencePreset[];
  selectedCount: number;
  summary: string;
  expanded: boolean;
  onToggleSection: () => void;
  onTogglePreset: (preset: RecurrencePreset) => void;
}

export function CommitmentRecurrenceAccordion({
  selectedPresets,
  selectedCount,
  summary,
  expanded,
  onToggleSection,
  onTogglePreset,
}: Props): React.ReactElement {
  const options = COMMITMENT_RECURRENCE_OPTIONS.map((option) => ({
    id: option.value,
    label: option.label,
    selected: selectedPresets.includes(option.value),
    accessibilityLabel: Strings.commitmentFilterRecurrenceAccessibility(option.label),
    startIcon: <MaterialCommunityIcons name={option.icon} size={ms(13)} color={CoreTokens.text2} />,
  }));

  return (
    <FilterAccordionShell
      title={Strings.filterSectionRecurrence}
      count={selectedCount}
      summary={summary}
      expanded={expanded}
      onToggle={onToggleSection}
    >
      <FilterOptionPillList options={options} onToggle={onTogglePreset} />
    </FilterAccordionShell>
  );
}
