import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, SearchField } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Radius, Size, Type } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';
import { ms } from '@/utils/responsive';

import { Text } from './text';

interface SearchFilterRowProps {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
  filterBadgeTestID: string;
  clearAccessibilityLabel?: string;
  filterAccessibilityLabel?: string;
}

const COMPACT_CONTROL_SIZE = ms(36);
const FILTER_BADGE_SIZE = ms(16);

export const SEARCH_INPUT_COMPACT_STYLE = {
  height: COMPACT_CONTROL_SIZE,
  minHeight: COMPACT_CONTROL_SIZE,
  paddingTop: 0,
  paddingBottom: 0,
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
  fontSize: Type.chip,
  lineHeight: FILTER_BADGE_SIZE,
} as const;

export function SearchFilterRow({
  value,
  placeholder,
  onChangeText,
  onClear,
  onOpenFilter,
  activeFilterCount,
  filterBadgeTestID,
  clearAccessibilityLabel = Strings.filterSearchClearAccessibility,
  filterAccessibilityLabel = Strings.filterSearchButtonAccessibility,
}: SearchFilterRowProps): React.ReactElement {
  const hasFilters = activeFilterCount > 0;
  const filterLabel = hasFilters
    ? Strings.filterAccessibilityWithActiveCount(filterAccessibilityLabel, activeFilterCount)
    : filterAccessibilityLabel;

  return (
    <View className="mb-2 flex-row items-center gap-2 px-4">
      <SearchField value={value} onChange={onChangeText} className="flex-1">
        <SearchField.Group style={SEARCH_INPUT_COMPACT_STYLE}>
          <SearchField.SearchIcon iconProps={{ size: Size.iconXs, color: CoreTokens.text2 }} />
          <SearchField.Input
            placeholder={placeholder}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={placeholder}
            style={SEARCH_INPUT_COMPACT_STYLE}
          />
          <SearchField.ClearButton onPress={onClear} accessibilityLabel={clearAccessibilityLabel} />
        </SearchField.Group>
      </SearchField>
      <PressableFeedback
        onPress={onOpenFilter}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={filterLabel}
        className="bg-default/40 relative items-center justify-center"
        style={FILTER_BUTTON_COMPACT_STYLE}
      >
        <MaterialCommunityIcons name="tune-variant" size={Size.iconSm} color={CoreTokens.text1} />
        {hasFilters ? (
          <View
            testID={filterBadgeTestID}
            className="bg-accent absolute items-center justify-center px-1"
            style={FILTER_BADGE_STYLE}
          >
            <Text
              className="font-inter text-accent-foreground font-bold"
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
