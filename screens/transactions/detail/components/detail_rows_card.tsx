import { Card } from 'heroui-native';
import React from 'react';

interface Props {
  children: React.ReactNode;
}

export function DetailRowsCard({ children }: Props): React.ReactElement {
  return <Card className="mx-4 mt-4 overflow-hidden">{children}</Card>;
}
