import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { SelectablePill } from '@/components/ui/chip';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { CoreTokens } from '@/constants/theme_tokens';
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
    <View className="border-separator bg-surface mb-2 rounded-xl border p-3.5">
      <Pressable
        onPress={onToggleSection}
        accessibilityRole="button"
        accessibilityState={{ expanded }}
      >
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center gap-2">
            <Text className="font-inter text-[13px] font-semibold">
              {Strings.filterSectionAccounts}
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
              color={CoreTokens.text2}
            />
          </View>
        </View>
      </Pressable>
      {expanded ? (
        <View className="mt-3 flex-row flex-wrap gap-1.5">
          {accounts.map((a) => (
            <SelectablePill
              key={a.id}
              label={a.name}
              selected={selectedIds.includes(a.id)}
              onPress={() => onToggleId(a.id)}
              dotColor={a.color ?? CoreTokens.text2}
              checkable
              accessibilityLabel={`${a.name}, account filter`}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
}
