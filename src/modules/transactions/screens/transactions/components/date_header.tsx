import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { Spacing, Type, lineHeightFor } from '@/constants/theme';

import { scaledFontSize } from './transactions_text.geometry';

interface Props {
  label: string;
}

export function DateHeader({ label }: Props): React.ReactElement {
  const fontSize = scaledFontSize(Type.overline, useWindowDimensions().fontScale);
  return (
    <View className="bg-background px-4 pt-3 pb-1.5">
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
        <Text
          className="font-inter-semibold text-muted flex-1 tracking-wide uppercase"
          style={{ fontSize, lineHeight: lineHeightFor(fontSize) }}
          numberOfLines={1}
          allowFontScaling={false}
        >
          {label}
        </Text>
      </View>
    </View>
  );
}
