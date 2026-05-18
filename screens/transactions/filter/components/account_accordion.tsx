import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import type { Account } from '@/database/entities/account.entity';
import { formatSelectionSummary } from '../filter.helpers';

interface Props {
  accounts: Account[];
  selectedIds: string[];
  expanded: boolean;
  onToggleSection: () => void;
  onToggleId: (id: string) => void;
}

export function AccountAccordion({
  accounts,
  selectedIds,
  expanded,
  onToggleSection,
  onToggleId,
}: Props): React.ReactElement {
  const selectedNames = accounts.filter((a) => selectedIds.includes(a.id)).map((a) => a.name);
  const summary = formatSelectionSummary(selectedNames, Strings.filterSummaryAccountsEmpty);

  return (
    <View className="rounded-xl border border-separator bg-surface mb-2 p-3.5">
      <Pressable
        onPress={onToggleSection}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View className="flex-row justify-between items-center">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter font-semibold text-[13px]">
              {Strings.filterSectionAccounts}
            </Text>
            {selectedIds.length > 0 ? (
              <View className="px-1.5 rounded-full bg-accent/15 min-w-[18px] items-center">
                <Text className="font-inter font-bold text-[10px] text-accent">
                  {selectedIds.length}
                </Text>
              </View>
            ) : null}
          </View>
          <View className="flex-row items-center gap-1.5">
            <Text className="font-inter text-[11px] text-foreground/60" numberOfLines={1}>
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
        <View className="flex-row gap-1.5 flex-wrap mt-3">
          {accounts.map((a) => {
            const selected = selectedIds.includes(a.id);
            return (
              <Pressable
                key={a.id}
                onPress={() => onToggleId(a.id)}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`${a.name}, account filter`}
                className={
                  selected
                    ? 'px-2.5 py-1.5 rounded-full bg-accent/15 border border-accent/50 flex-row items-center gap-1.5'
                    : 'px-2.5 py-1.5 rounded-full bg-default/40 border border-transparent flex-row items-center gap-1.5'
                }
              >
                <View
                  style={{ backgroundColor: a.color ?? '#888' }}
                  className="w-2 h-2 rounded-full"
                />
                <Text
                  className={
                    selected
                      ? 'font-inter font-semibold text-[11.5px] text-accent'
                      : 'font-inter font-medium text-[11.5px] text-foreground/70'
                  }
                >
                  {a.name}
                </Text>
                {selected ? (
                  <MaterialCommunityIcons name="check" size={12} color="#D4AF37" />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
