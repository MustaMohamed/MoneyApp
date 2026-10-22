import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Type, lineHeightFor } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface StatusBadgeProps {
  label: string;
  /** Opaque fill; the caller composites it so the painted fill is the one it tested for contrast. */
  fill: string;
  foreground: string;
  icon?: IconName;
  size?: 'xs' | 'sm' | 'md';
  /** Given, the label draws at this app scale on one line; omitted, the OS scales it. */
  fontScale?: number;
}

// Raw, never ms(): the detail hero's geometry adds it above and below the label.
export const STATUS_BADGE_PADDING_VERTICAL = 2;
// Raw, as above: A1 `.stag`, the commitment row's tag; its geometry adds it around the label.
export const STATUS_BADGE_XS_PADDING_VERTICAL = 1;
export const STATUS_BADGE_XS_LABEL_FONT_SIZE = Type.compactBadge;
const PADDING_VERTICAL = {
  xs: STATUS_BADGE_XS_PADDING_VERTICAL,
  sm: STATUS_BADGE_PADDING_VERTICAL,
  md: STATUS_BADGE_PADDING_VERTICAL,
} as const;
const ROOT_CLASS = {
  xs: 'gap-0.75 rounded-full pl-1 pr-1.5',
  sm: 'gap-0.5 rounded-full px-1.5',
  md: 'gap-0.5 rounded-full px-1.5',
} as const;
const LABEL_CLASS = { xs: 'font-inter-bold', sm: 'font-inter', md: 'font-inter' } as const;
const ICON_SIZE = { xs: 11, sm: 10, md: 12 } as const;
const LABEL_STYLE = {
  xs: {
    fontSize: STATUS_BADGE_XS_LABEL_FONT_SIZE,
    lineHeight: lineHeightFor(STATUS_BADGE_XS_LABEL_FONT_SIZE),
  },
  sm: { fontSize: Type.pillLabel, lineHeight: lineHeightFor(Type.pillLabel) },
  md: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) },
} as const;

export function StatusBadge({
  label,
  fill,
  foreground,
  icon,
  size = 'sm',
  fontScale,
}: StatusBadgeProps) {
  const scaled = fontScale !== undefined;
  return (
    <View
      style={{
        backgroundColor: fill,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: PADDING_VERTICAL[size],
      }}
      className={ROOT_CLASS[size]}
    >
      {icon != null ? (
        <MaterialCommunityIcons name={icon} size={ICON_SIZE[size]} color={foreground} />
      ) : null}
      <Typography
        allowFontScaling={!scaled}
        numberOfLines={scaled ? 1 : undefined}
        className={LABEL_CLASS[size]}
        style={{
          color: foreground,
          ...(scaled
            ? { ...scaledTextStyle(LABEL_STYLE[size].fontSize, fontScale), flexShrink: 1 }
            : LABEL_STYLE[size]),
        }}
      >
        {label}
      </Typography>
    </View>
  );
}
