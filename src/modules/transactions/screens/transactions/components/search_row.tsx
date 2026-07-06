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
const SEARCH_INPUT_HORIZONTAL_PADDING = ms(12);
const SEARCH_INPUT_CLEAR_PADDING = ms(40);
const FILTER_BADGE_SIZE = ms(16);

export const SEARCH_INPUT_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  minHeight: COMPACT_CONTROL_SIZE,
  paddingTop: 0,
  paddingBottom: 0,
  paddingLeft: SEARCH_INPUT_HORIZONTAL_PADDING,
  paddingRight: SEARCH_INPUT_HORIZONTAL_PADDING,
} as const;

export const SEARCH_INPUT_WITH_CLEAR_STYLE = {
  ...SEARCH_INPUT_COMPACT_STYLE,
  paddingRight: SEARCH_INPUT_CLEAR_PADDING,
} as const;

export const FILTER_BUTTON_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  width: COMPACT_CONTROL_SIZE,
  borderRadius: Radius.md,
} as const;

export const FILTER_BADGE_STYLE = {
  top: ms(2),
  right: ms(2),
  minWidth: FILTER_BADGE_SIZE,
  height: FILTER_BADGE_SIZE,
  borderRadius: FILTER_BADGE_SIZE / 2,
} as const;

const FILTER_BADGE_TEXT_STYLE = {
  lineHeight: FILTER_BADGE_SIZE,
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
          style={value.length > 0 ? SEARCH_INPUT_WITH_CLEAR_STYLE : SEARCH_INPUT_COMPACT_STYLE}
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
          <View
            testID="filter-badge"
            className="bg-accent absolute items-center justify-center px-1"
            style={FILTER_BADGE_STYLE}
          >
            <Text
              className="font-inter text-accent-foreground text-[9px] font-bold"
              style={FILTER_BADGE_TEXT_STYLE}
            >
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </PressableFeedback>
    </View>
  );
}
