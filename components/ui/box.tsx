import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from 'heroui-native';

export interface BoxProps extends ViewProps {
  className?: string;
}

export function Box({ className, style, ...props }: BoxProps) {
  return <View className={cn(className)} style={style} {...props} />;
}
