import { ListGroup, cn } from 'heroui-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Radius, Size } from '@/constants/theme';

export interface ListCardProps {
  children: ReactNode;
  /** Per-caller placement classes only; absent renders exactly what every caller rendered before. */
  className?: string;
  /** Per-caller placement, or a corner other than `Radius.lg`; the caller's `borderRadius` wins. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** `ListGroup` is Surface-based: no border, and only `boxShadow` kills `--surface-shadow`. */
export function ListCard({ children, className, style, testID }: ListCardProps) {
  return (
    <ListGroup
      testID={testID}
      className={cn('border-separator p-0', className)}
      style={[{ borderWidth: Size.hairline, borderRadius: Radius.lg, boxShadow: 'none' }, style]}
    >
      {children}
    </ListGroup>
  );
}
