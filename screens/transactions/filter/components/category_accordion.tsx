import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { GoldTokens } from '@/constants/theme_tokens';
import type { Category } from '@/database/entities/category.entity';

import { formatSelectionSummary } from '../filter.helpers';

interface Props {
  categories: Category[];
  selectedIds: string[];
  expanded: boolean;
  onToggleSection: () => void;
  onToggleId: (id: string) => void;
}

export function CategoryAccordion({
  categories,
  selectedIds,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  const selectedNames = categories.filter((c) => selectedIds.includes(c.id)).map((c) => c.name);
  const summary = formatSelectionSummary(selectedNames, Strings.filterSummaryCategoriesEmpty);

  return (
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Pressable
        onPress={onToggleSection}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter text-[13px] font-semibold">
              {Strings.filterSectionCategories}
            </Text>
            {selectedIds.length > 0 ? (
              <View className="bg-accent/15 min-w-[18px] items-center rounded-full px-1.5">
                <Text className="font-inter text-accent text-[10px] font-bold">
                  {selectedIds.length}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-inter text-foreground/60 text-[11px]" numberOfLines={1}>
              {expanded ? '' : summary}
            </Text>
            <MaterialCommunityIcons
              name={expanded ? 'chevron-up' : 'chevron-down'}
              size={16}
              color="#888"
            />
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {categories.map((c) => {
            const selected = selectedIds.includes(c.id);
            return (
              <Pressable
                key={c.id}
                onPress={() => onToggleId(c.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${c.name}, category filter`}
                className={
                  selected
                    ? 'bg-accent/15 border-accent/50 flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5'
                    : 'bg-default/40 border-border flex-row items-center gap-1.5 rounded-full border px-2.5 py-1.5'
                }
              >
                <View
                  // oxlint-disable-next-line typescript/no-unnecessary-condition -- DB color can be null despite type
                  style={{ backgroundColor: c.color ?? '#888' }}
                  className="h-2 w-2 rounded-full"
                />
                <Text
                  className={
                    selected
                      ? 'font-inter text-accent text-[11.5px] font-semibold'
                      : 'font-inter text-foreground/70 text-[11.5px] font-medium'
                  }
                >
                  {c.name}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={12} color={GoldTokens[500]} />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
