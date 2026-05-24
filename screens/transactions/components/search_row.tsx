import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

interface Props {
  value: string;
  onChange: (s: string) => void;
  onClear: () => void;
  onOpenFilter: () => void;
  activeFilterCount: number;
}

export function SearchRow({
  value,
  onChange,
  onClear,
  onOpenFilter,
  activeFilterCount,
}: Props): React.ReactElement {
  return (
    <View className="mt-3 flex-row items-center gap-2 px-4">
      <View className="flex-1">
        <Input
          value={value}
          onChangeText={onChange}
          placeholder={Strings.searchTransactionsPlaceholder}
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel={Strings.searchTransactionsPlaceholder}
        />
        {value.length > 0 ? (
          <Pressable
            onPress={onClear}
            accessibilityLabel="Clear search"
            className="absolute top-2.5 right-2 h-7 w-7 items-center justify-center"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color="#999" />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={onOpenFilter}
        accessibilityRole="button"
        accessibilityLabel={`Filter${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        className="bg-default/40 relative h-10 w-10 items-center justify-center rounded-xl"
      >
        <MaterialCommunityIcons name="tune-variant" size={18} color="#F0EEE6" />
        {activeFilterCount > 0 ? (
          <View className="bg-accent absolute -top-1 -right-1 min-w-[16px] items-center rounded-full px-1.5">
            <Text className="font-inter text-accent-foreground text-[9px] font-bold">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
