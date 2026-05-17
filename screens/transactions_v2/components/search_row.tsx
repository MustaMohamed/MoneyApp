import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';

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
    <View className="px-4 mt-3 flex-row items-center gap-2">
      <View className="flex-1">
        <Input
          value={value}
          onChangeText={onChange}
          placeholder="Search transactions"
          returnKeyType="search"
          autoCorrect={false}
          accessibilityLabel="Search transactions"
        />
        {value.length > 0 ? (
          <Pressable
            onPress={onClear}
            accessibilityLabel="Clear search"
            className="absolute right-2 top-2.5 w-7 h-7 items-center justify-center"
          >
            <MaterialCommunityIcons name="close-circle" size={16} color="#999" />
          </Pressable>
        ) : null}
      </View>
      <Pressable
        onPress={onOpenFilter}
        accessibilityRole="button"
        accessibilityLabel={`Filter${activeFilterCount > 0 ? `, ${activeFilterCount} active` : ''}`}
        className="w-10 h-10 rounded-xl bg-default/40 items-center justify-center relative"
      >
        <MaterialCommunityIcons name="tune-variant" size={18} color="#F0EEE6" />
        {activeFilterCount > 0 ? (
          <View className="absolute -top-1 -right-1 px-1.5 rounded-full bg-accent min-w-[16px] items-center">
            <Text className="font-inter font-bold text-[9px] text-accent-foreground">
              {activeFilterCount}
            </Text>
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}
