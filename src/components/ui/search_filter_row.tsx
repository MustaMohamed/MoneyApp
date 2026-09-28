import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, SearchField } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { resolveSearchFilterRowGeometry } from './search_filter_row.geometry';
import { Text } from './text';

interface SearchFilterRowProps {
  value: string;
  placeholder: string;
  onChangeText: (value: string) => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
  filterBadgeTestID: string;
  clearAccessibilityLabel?: string;
  filterAccessibilityLabel?: string;
  isDisabled?: boolean;
}

export function SearchFilterRow({
  value,
  placeholder,
  onChangeText,
  onOpenFilter,
  activeFilterCount,
  filterBadgeTestID,
  clearAccessibilityLabel = Strings.filterSearchClearAccessibility,
  filterAccessibilityLabel = Strings.filterSearchButtonAccessibility,
  isDisabled,
}: SearchFilterRowProps): React.ReactElement {
  const geometry = resolveSearchFilterRowGeometry(useWindowDimensions().fontScale);
  const hasFilters = activeFilterCount > 0;
  const filterLabel = hasFilters
    ? Strings.filterAccessibilityWithActiveCount(filterAccessibilityLabel, activeFilterCount)
    : filterAccessibilityLabel;

  return (
    <View className="mb-2 flex-row items-center gap-2 px-4">
      <SearchField value={value} onChange={onChangeText} isDisabled={isDisabled} className="flex-1">
        <SearchField.Group style={geometry.input}>
          <SearchField.SearchIcon iconProps={{ size: Size.iconXs, color: CoreTokens.text2 }} />
          <SearchField.Input
            placeholder={placeholder}
            returnKeyType="search"
            autoCorrect={false}
            accessibilityLabel={placeholder}
            allowFontScaling={geometry.inputText === undefined}
            style={geometry.inputStyle}
          />
          <SearchField.ClearButton accessibilityLabel={clearAccessibilityLabel} />
        </SearchField.Group>
      </SearchField>
      <PressableFeedback
        onPress={onOpenFilter}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={filterLabel}
        className="bg-default/40 relative items-center justify-center"
        style={geometry.filterButton}
      >
        <MaterialCommunityIcons name="tune-variant" size={Size.iconSm} color={CoreTokens.text1} />
        {hasFilters ? (
          <View
            testID={filterBadgeTestID}
            className="bg-accent absolute items-center justify-center px-1"
            style={geometry.badge}
          >
            <Text
              numberOfLines={1}
              allowFontScaling={false}
              className="font-inter-bold text-accent-foreground"
              style={geometry.badgeText}
            >
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </PressableFeedback>
    </View>
  );
}
