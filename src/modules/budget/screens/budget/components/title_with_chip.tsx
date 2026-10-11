import { Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { resolveRowStacking, scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { useWordSafeLines } from '@/components/ui/word_safe_lines.hook';
import { Spacing } from '@/constants/theme';

const TITLE_LINES = 2;
const STACKED_CHIP_STYLE = { alignSelf: 'flex-start', marginTop: Spacing.xxxs } as const;
const ROW_CHIP_STYLE = { flexShrink: 0 } as const;

interface TitleWithChipProps {
  name: string;
  /** A `Type` token. */
  titleFontSize: number;
  children: React.ReactElement;
}

/** A row's title beside its chip, and above font scale 1 the chip under a title that splits no word. */
export function TitleWithChip({ name, titleFontSize, children }: TitleWithChipProps) {
  const { fontScale } = useWindowDimensions();
  const stacked = resolveRowStacking(fontScale) === 'stacked';
  const { numberOfLines, onTextLayout } = useWordSafeLines(name, TITLE_LINES, fontScale);
  return (
    <View className={stacked ? undefined : 'flex-row items-start gap-1.5'}>
      <Typography
        numberOfLines={numberOfLines}
        onTextLayout={onTextLayout}
        allowFontScaling={false}
        style={scaledTextStyle(titleFontSize, fontScale)}
        className={
          stacked
            ? 'font-sora-semibold text-foreground'
            : 'font-sora-semibold text-foreground flex-1'
        }
      >
        {name}
      </Typography>
      <View style={stacked ? STACKED_CHIP_STYLE : ROW_CHIP_STYLE}>{children}</View>
    </View>
  );
}
