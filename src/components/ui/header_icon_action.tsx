import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';
import type { ViewStyle } from 'react-native';

import { HEADER_ACTION_HIT_SLOP } from '@/components/ui/stack_header.geometry';
import { Radius, Size } from '@/constants/theme';

export interface HeaderActionBoxProps {
  accessibilityLabel: string;
  onPress: () => void;
  style: ViewStyle;
  children: React.ReactNode;
}

export function HeaderActionBox({
  accessibilityLabel,
  onPress,
  style,
  children,
}: HeaderActionBoxProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      hitSlop={HEADER_ACTION_HIT_SLOP}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="bg-surface border-border items-center justify-center"
      style={{ borderRadius: Radius.sm, borderWidth: Size.hairline, ...style }}
    >
      {children}
    </PressableFeedback>
  );
}

export interface HeaderIconActionProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconSize: number;
  iconColor: string;
  accessibilityLabel: string;
  onPress: () => void;
}

export function HeaderIconAction({
  icon,
  iconSize,
  iconColor,
  accessibilityLabel,
  onPress,
}: HeaderIconActionProps) {
  return (
    <HeaderActionBox
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{ width: Size.headerActionTrack, height: Size.headerActionTrack }}
    >
      <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
    </HeaderActionBox>
  );
}
