import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Spacing, Type } from '@/constants/theme';

interface Props {
  label: string;
  contextLabel?: string | null;
}

export function DateHeader({ label, contextLabel }: Props): React.ReactElement {
  return (
    <View className="bg-background px-4 pt-3 pb-1.5">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
        <Text
          className="font-inter-semibold text-muted flex-1 tracking-wide uppercase"
          style={{ fontSize: Type.overline }}
          numberOfLines={1}
        >
          {label}
        </Text>
        {contextLabel ? (
          <Text
            className="font-inter-bold text-accent max-w-[55%] text-right"
            style={{ fontSize: Type.overline }}
            numberOfLines={1}
          >
            {contextLabel}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
