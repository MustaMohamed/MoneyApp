import { PressableFeedback } from 'heroui-native';
import React from 'react';
import type { ViewStyle } from 'react-native';

import {
  HEADER_ACTION_HIT_SLOP,
  type HeaderActionEdge,
} from '@/components/ui/stack_header.geometry';
import { HIT_SLOP_UNCLIPPED_STYLE, Radius, Size } from '@/constants/theme';

export interface HeaderActionBoxProps {
  accessibilityLabel: string;
  onPress: () => void;
  edge: HeaderActionEdge;
  style: Pick<ViewStyle, 'width' | 'height' | 'minWidth' | 'paddingHorizontal'>;
  children: React.ReactNode;
}

export function HeaderActionBox({
  accessibilityLabel,
  onPress,
  edge,
  style,
  children,
}: HeaderActionBoxProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      hitSlop={HEADER_ACTION_HIT_SLOP[edge]}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      className="bg-surface border-border items-center justify-center"
      style={{
        ...style,
        ...HIT_SLOP_UNCLIPPED_STYLE,
        borderRadius: Radius.sm,
        borderWidth: Size.hairline,
      }}
    >
      {children}
    </PressableFeedback>
  );
}
