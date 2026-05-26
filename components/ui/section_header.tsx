import React from 'react';
import { View } from 'react-native';

import { Text } from 'heroui-native';
import { Colors } from '@/constants/theme';

export interface SectionHeaderProps {
  title: string;
  count?: number;
}

export function SectionHeader({ title, count }: SectionHeaderProps) {
  return (
    <View
      className="mx-4 mb-2 mt-4 flex-row items-center justify-between"
      style={{ flexDirection: 'row' }}
    >
      <Text className="font-inter text-[12px] text-muted font-semibold uppercase tracking-wide">
        {title}
      </Text>
      {count !== undefined && count > 0 ? (
        <View
          className="rounded-full px-2 py-0.5"
          style={{
            backgroundColor: `${Colors.shared.cairoGold}22`,
          }}
        >
          <Text className="font-sora text-[12px] font-bold" style={{ color: Colors.shared.cairoGold }}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
