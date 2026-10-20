import { Card, cn } from 'heroui-native';
import React from 'react';
import { useWindowDimensions, type ViewStyle } from 'react-native';

import { DETAIL_NOTE_MIN_HEIGHT, resolveTransferCardHeight } from './detail.geometry';

interface TransferFlowCardFrameProps {
  className: string;
  testID?: string;
  children: React.ReactNode;
}

interface NoteCardFrameProps {
  testID?: string;
  children: React.ReactNode;
}

const NOTE_CARD_FRAME_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: DETAIL_NOTE_MIN_HEIGHT,
  boxShadow: 'none',
});

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

export function NoteCardFrame({ testID, children }: NoteCardFrameProps): React.ReactElement {
  return (
    <Card
      testID={testID}
      className="border-separator mx-4 mt-4 rounded-2xl border px-4 py-3"
      style={NOTE_CARD_FRAME_STYLE}
    >
      {children}
    </Card>
  );
}
