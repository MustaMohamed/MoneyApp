// modules/transactions/screens/transactions/components/search_row.tsx
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors, Radius } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

const COMPACT_CONTROL_SIZE = ms(36);

export const SEARCH_INPUT_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  paddingTop: 0,
  paddingBottom: 0,
} as const;

export const FILTER_BUTTON_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  width: COMPACT_CONTROL_SIZE,
  borderRadius: Radius.md,
} as const;

export function SearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <View className="mb-2 flex-row items-center gap-2 px-4">
      <View className="flex-1">
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={Strings.searchTransactionsPlaceholder}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={Strings.searchTransactionsPlaceholder}
          style={SEARCH_INPUT_COMPACT_STYLE}
        />
        {value.length > 0 ? (
          <PressableFeedback
            onPress={onClear}
            hitSlop={8}
            accessibilityLabel="Clear search"
            className="absolute top-1.5 right-2 h-7 w-7 items-center justify-center"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color={Colors.dark.text2} />
          </PressableFeedback>
        ) : null}
      </View>
      <PressableFeedback
        onPress={onOpenFilter}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`Filter${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        className="bg-default/40 relative items-center justify-center"
        style={FILTER_BUTTON_COMPACT_STYLE}
      >
        <MaterialCommunityIcons name="tune-variant" size={18} color={Colors.dark.text1} />
        {activeFilterCount > 0 ? (
          <View className="bg-accent absolute -top-1.5 -right-1.5 min-w-[16px] items-center rounded-full px-1.5">
            <Text className="font-inter text-accent-foreground text-[9px] font-bold">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </PressableFeedback>
    </View>
  );
}
