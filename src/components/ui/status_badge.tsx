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
const XS_CHROME = { paddingLeft: 4, paddingRight: 6, gap: 3 } as const;
const ICON_SIZE = { xs: 11, sm: 10, md: 12 } as const;
const LABEL_STYLE = {
  xs: { fontSize: Type.compactBadge, lineHeight: lineHeightFor(Type.compactBadge) },
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
  const xs = size === 'xs';
  return (
    <View
      style={{
        backgroundColor: fill,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: xs ? STATUS_BADGE_XS_PADDING_VERTICAL : STATUS_BADGE_PADDING_VERTICAL,
        ...(xs ? XS_CHROME : undefined),
      }}
      className={xs ? 'rounded-full' : 'gap-0.5 rounded-full px-1.5'}
    >
      {icon != null ? (
        <MaterialCommunityIcons name={icon} size={ICON_SIZE[size]} color={foreground} />
      ) : null}
      <Typography
        allowFontScaling={!scaled}
        numberOfLines={scaled ? 1 : undefined}
        className={xs ? 'font-inter-bold' : 'font-inter'}
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
