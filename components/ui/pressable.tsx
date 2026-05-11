import React from 'react';
import {
  Pressable as RNPressable,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { cn } from 'heroui-native';

const HIT_SLOP = { top: 12, bottom: 12, left: 12, right: 12 } as const;

export interface PressableUIProps extends PressableProps {
  className?: string;
  style?: StyleProp<ViewStyle>;
}

export function Pressable({
  className,
  hitSlop = HIT_SLOP,
  style,
  children,
  ...props
}: PressableUIProps) {
  return (
    <RNPressable
      className={cn(className)}
      hitSlop={hitSlop}
      style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }, style as ViewStyle]}
      {...props}
    >
      {children}
    </RNPressable>
  );
}
