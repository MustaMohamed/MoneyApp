import { ListGroup } from 'heroui-native';
import type { ReactNode } from 'react';

import { Radius, Size } from '@/constants/theme';

export interface ListCardProps {
  children: ReactNode;
}

/** `ListGroup` is Surface-based: no border, and only `boxShadow` kills `--surface-shadow`. */
export function ListCard({ children }: ListCardProps) {
  return (
    <ListGroup
      className="border-separator p-0"
      style={{ borderWidth: Size.hairline, borderRadius: Radius.lg, boxShadow: 'none' }}
    >
      {children}
    </ListGroup>
  );
}
