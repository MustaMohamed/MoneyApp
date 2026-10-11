import React from 'react';
import { useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { useWordSafeLines } from '@/components/ui/word_safe_lines.hook';
import { Type } from '@/constants/theme';

/** The header's title: whole words on as many lines as it takes, and a word wider than its line ends in `…` where it starts. */
export function CategoryDetailTitle({ name }: { name: string }) {
  const { fontScale } = useWindowDimensions();
  const { numberOfLines, onTextLayout, onLayout } = useWordSafeLines(name, undefined, fontScale);
  return (
    <Text
      className="font-sora-bold text-foreground"
      style={[{ flex: 1 }, scaledTextStyle(Type.title, fontScale)]}
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      onTextLayout={onTextLayout}
      onLayout={onLayout}
    >
      {name}
    </Text>
  );
}
