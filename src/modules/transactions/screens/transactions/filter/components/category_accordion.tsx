import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

import { FilterAccordionShell, FilterOptionPillList } from '@/components/ui/filter_accordion';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/modules/categories/entities/category.entity';
import { toIconName } from '@/utils/icon_name_guard';
import { ms } from '@/utils/responsive';

interface Props {
  categories: Category[];
  selectedIds: string[];
  selectedCount: number;
  summary: string;
  expanded: boolean;
  onToggleSection: () => void;
  onToggleId: (id: string) => void;
}

export function CategoryAccordion({
  categories,
  selectedIds,
  selectedCount,
  summary,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  const options = categories.map((category) => ({
    id: category.id,
    label: category.name,
    selected: selectedIds.includes(category.id),
    accessibilityLabel: Strings.filterCategoryAccessibility(category.name),
    startIcon: (
      <MaterialCommunityIcons
        name={toIconName(category.icon, 'tag')}
        size={ms(13)}
        // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
        color={category.color ?? CoreTokens.text2}
      />
    ),
  }));

  return (
    <FilterAccordionShell
      title={Strings.filterSectionCategories}
      count={selectedCount}
      summary={summary}
      expanded={expanded}
      onToggle={onToggleSection}
    >
      <FilterOptionPillList options={options} onToggle={onToggleId} />
    </FilterAccordionShell>
  );
}
