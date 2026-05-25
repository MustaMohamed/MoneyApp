import { Card } from 'heroui-native';
import React from 'react';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props): React.ReactElement {
  return (
    <Card className="border-separator mx-4 mt-4 overflow-hidden rounded-2xl border p-0 shadow-none">
      {children}
    </Card>
  );
}
