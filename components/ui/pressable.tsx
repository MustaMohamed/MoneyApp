import React from 'react';
import { Pressable as RNPressable, type PressableProps } from 'react-native';
import { cn } from '@/utils/cn';

interface PressableComponentProps extends PressableProps {
  className?: string;
}

export const Pressable = React.forwardRef<
  React.ElementRef<typeof RNPressable>,
  PressableComponentProps
>(({ className, style, ...props }, ref) => (
  <RNPressable
    ref={ref}
    hitSlop={44}
    style={({ pressed }) => [
      { opacity: pressed ? 0.75 : 1 },
      typeof style === 'function' ? style({ pressed }) : style,
    ]}
    className={cn(className)}
    {...props}
  />
));
Pressable.displayName = 'Pressable';
