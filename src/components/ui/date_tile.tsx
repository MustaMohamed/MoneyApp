import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { LetterSpacing, Radius, Size, Type, lineHeightFor } from '@/constants/theme';
import type { DateTileParts } from '@/utils/format_date';

const DATE_TILE_MONTH_OPACITY = 0.85;

export interface DateTileProps extends DateTileParts {
  fill: string;
  ink: string;
}

/** No HeroUI primitive draws a two-line date square: `Avatar` holds one fallback text and `Chip` is a one-line pill. */
export function DateTile({ month, day, fill, ink }: DateTileProps): React.ReactElement {
  return (
    // The caller's date badge speaks the dates.
    <View
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={{
        width: Size.detailHeroTile,
        height: Size.detailHeroTile,
        borderRadius: Radius.md,
        backgroundColor: fill,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Typography
        allowFontScaling={false}
        numberOfLines={1}
        className="font-sora-bold"
        style={{
          color: ink,
          opacity: DATE_TILE_MONTH_OPACITY,
          letterSpacing: LetterSpacing.eyebrow,
          fontSize: Type.pillLabel,
          lineHeight: lineHeightFor(Type.pillLabel),
        }}
      >
        {month}
      </Typography>
      <Typography
        allowFontScaling={false}
        numberOfLines={1}
        className="font-sora-bold tabular-nums"
        style={{
          color: ink,
          fontSize: Type.dateTileDay,
          lineHeight: lineHeightFor(Type.dateTileDay),
        }}
      >
        {day}
      </Typography>
    </View>
  );
}
