import { Card, cn } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { resolveTransferCardHeight } from './detail.geometry';

interface TransferFlowCardFrameProps {
  className: string;
  testID?: string;
  children: React.ReactNode;
}

export function TransferFlowCardFrame({
  className,
  testID,
  children,
}: TransferFlowCardFrameProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <Card
      testID={testID}
      className={cn('mx-4 mt-4 rounded-2xl border p-3.5', className)}
      style={{ height: resolveTransferCardHeight(fontScale), boxShadow: 'none' }}
    >
      {children}
    </Card>
  );
}
