import { ListGroup } from 'heroui-native';
import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

import { Radius, Size } from '@/constants/theme';

export interface ListCardProps {
  children: ReactNode;
  /** Per-caller placement only; absent renders exactly what every caller rendered before. */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

/** `ListGroup` is Surface-based: no border, and only `boxShadow` kills `--surface-shadow`. */
export function ListCard({ children, style, testID }: ListCardProps) {
  return (
    <ListGroup
      testID={testID}
      className="border-separator p-0"
      style={[{ borderWidth: Size.hairline, borderRadius: Radius.lg, boxShadow: 'none' }, style]}
    >
      {children}
    </ListGroup>
  );
}
