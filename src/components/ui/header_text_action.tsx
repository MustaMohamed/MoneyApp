import { Typography } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { HeaderActionBox } from '@/components/ui/header_action_box';
import { resolveHeaderTextActionGeometry } from '@/components/ui/stack_header.geometry';
import { Spacing } from '@/constants/theme';

export interface HeaderTextActionProps {
  label: string;
  onPress: () => void;
}

export function HeaderTextAction({ label, onPress }: HeaderTextActionProps) {
  const { fontScale } = useWindowDimensions();
  const geometry = resolveHeaderTextActionGeometry(fontScale);

  return (
    <HeaderActionBox
      accessibilityLabel={label}
      onPress={onPress}
      edge="trailing"
      style={{
        minWidth: geometry.minWidth,
        height: geometry.height,
        paddingHorizontal: Spacing.xxs,
      }}
    >
      <Typography
        className="font-sora-bold text-accent"
        allowFontScaling={geometry.allowFontScaling}
        style={geometry.label}
      >
        {label}
      </Typography>
    </HeaderActionBox>
  );
}
