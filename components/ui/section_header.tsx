import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

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
      <Text variant="hint" className="text-muted text-xs font-semibold uppercase tracking-wide">
        {title}
      </Text>
      {count !== undefined && count > 0 ? (
        <View
          className="rounded-full"
          style={{
            paddingHorizontal: ms(8),
            paddingVertical: ms(2),
            backgroundColor: `${Colors.shared.cairoGold}22`,
          }}
        >
          <Text className="text-xs font-bold" style={{ color: Colors.shared.cairoGold }}>
            {count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
