import { ListGroup } from 'heroui-native';
import React from 'react';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props): React.ReactElement {
  return (
    <ListGroup
      variant="default"
      className="border-separator mx-4 mt-4 overflow-hidden rounded-2xl border p-0"
      style={{ elevation: 0, shadowOpacity: 0 }}
    >
      {children}
    </ListGroup>
  );
}
