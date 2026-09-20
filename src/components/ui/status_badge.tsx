import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Type, lineHeightFor } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface StatusBadgeProps {
  label: string;
  /** Opaque fill; the caller composites it so the painted fill is the one it tested for contrast. */
  fill: string;
  foreground: string;
  icon?: IconName;
  size?: 'sm' | 'md';
}

const ICON_SIZE = { sm: 10, md: 12 } as const;
const LABEL_STYLE = {
  sm: { fontSize: Type.pillLabel, lineHeight: lineHeightFor(Type.pillLabel) },
  md: { fontSize: Type.micro, lineHeight: lineHeightFor(Type.micro) },
} as const;

export function StatusBadge({ label, fill, foreground, icon, size = 'sm' }: StatusBadgeProps) {
  return (
    <View
      style={{
        backgroundColor: fill,
        flexDirection: 'row',
        alignItems: 'center',
      }}
      className="gap-0.5 rounded-full px-1.5 py-0.5"
    >
      {icon != null ? (
        <MaterialCommunityIcons name={icon} size={ICON_SIZE[size]} color={foreground} />
      ) : null}
      <Typography className="font-inter" style={{ color: foreground, ...LABEL_STYLE[size] }}>
        {label}
      </Typography>
    </View>
  );
}
