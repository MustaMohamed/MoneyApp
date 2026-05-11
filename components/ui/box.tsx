import React from 'react';
import { View, type ViewProps } from 'react-native';
import { cn } from '@/utils/cn';

interface BoxProps extends ViewProps {
  className?: string;
}

export const Box = React.forwardRef<View, BoxProps>(({ className, ...props }, ref) => (
  <View ref={ref} className={cn(className)} {...props} />
));
Box.displayName = 'Box';
