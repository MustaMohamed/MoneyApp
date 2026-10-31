import React from 'react';

import { FilterAccordionShell, FilterOptionPillList } from '@/components/ui/filter_accordion';
import { Strings } from '@/constants/strings';
import type { Commitment } from '@/modules/commitments/entities/commitment.entity';

interface Props {
  options: readonly Pick<Commitment, 'id' | 'name'>[];
  selectedId: string | undefined;
  summary: string;
  expanded: boolean;
  onToggleSection: () => void;
  onToggle: (id: string) => void;
}

export function CommitmentAccordion({
  options,
  selectedId,
  summary,
  expanded,
  onToggleSection,
  onToggle,
}: Props): React.ReactElement {
  const pills = options.map((option) => ({
    id: option.id,
    label: option.name,
    selected: option.id === selectedId,
    accessibilityLabel: Strings.commitmentFilterCommitmentAccessibility(option.name),
  }));

  return (
    <FilterAccordionShell
      title={Strings.filterSectionCommitments}
      count={selectedId === undefined ? 0 : 1}
      summary={summary}
      expanded={expanded}
      onToggle={onToggleSection}
    >
      <FilterOptionPillList options={pills} onToggle={onToggle} />
    </FilterAccordionShell>
  );
}
