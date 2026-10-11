import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { useWordSafeLines } from '@/components/ui/word_safe_lines.hook';
import { Colors, FontFamily, Type } from '@/constants/theme';

/** The header's title: whole words on as many lines as it takes, and a word wider than its line ends in `…` where it starts. */
export function CategoryDetailTitle({ name }: { name: string }) {
  const { fontScale } = useWindowDimensions();
  const { numberOfLines, onTextLayout } = useWordSafeLines(name, undefined, fontScale);
  return (
    <Text
      style={[styles.title, scaledTextStyle(Type.title, fontScale)]}
      allowFontScaling={false}
      numberOfLines={numberOfLines}
      onTextLayout={onTextLayout}
    >
      {name}
    </Text>
  );
}

const styles = StyleSheet.create({
  title: { flex: 1, fontFamily: FontFamily.soraBold, color: Colors.dark.text1 },
});
