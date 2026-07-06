import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Accordion } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';
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

export function CommitmentCategoryAccordion({
  categories,
  selectedIds,
  selectedCount,
  summary,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  return (
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Accordion
        selectionMode="single"
        value={expanded ? 'section' : ''}
        onValueChange={(_v: string | undefined) => onToggleSection()}
      >
        <Accordion.Item value="section">
          <Accordion.Trigger className="gap-0 px-0 py-0" style={{ padding: 0, gap: 0 }}>
            <View className="flex-row items-center justify-between" style={{ flex: 1 }}>
              <View className="flex-row items-center gap-2">
                <Text className="font-inter text-[13px] font-semibold">
                  {Strings.filterSectionCategories}
                </Text>
                {selectedCount > 0 ? (
                  <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                    <Text className="font-inter text-accent text-[10px] font-bold">
                      {selectedCount}
                    </Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text className="font-inter text-foreground/60 text-[11px]" numberOfLines={1}>
                  {expanded ? '' : summary}
                </Text>
                <Accordion.Indicator isAnimatedStyleActive={false}>
                  <MaterialCommunityIcons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={16}
                    color={CoreTokens.text2}
                  />
                </Accordion.Indicator>
              </View>
            </View>
          </Accordion.Trigger>
          <Accordion.Content className="px-0 pb-0" style={{ padding: 0 }}>
            <View className="mt-3 flex-row flex-wrap gap-1.5">
              {categories.map((category) => (
                <SelectablePill
                  key={category.id}
                  label={category.name}
                  selected={selectedIds.includes(category.id)}
                  onPress={() => onToggleId(category.id)}
                  startIcon={
                    <MaterialCommunityIcons
                      name={toIconName(category.icon, 'tag')}
                      size={ms(13)}
                      color={category.color}
                    />
                  }
                  checkable
                  accessibilityLabel={`${category.name}, commitment category filter`}
                />
              ))}
            </View>
          </Accordion.Content>
        </Accordion.Item>
      </Accordion>
    </View>
  );
}
