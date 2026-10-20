import React from 'react';
import type { ViewStyle } from 'react-native';

import { ListCard } from '@/components/ui/list_card';
import { Radius } from '@/constants/theme';

interface Props {
  children: React.ReactNode;
  testID?: string;
}

const DETAIL_ROWS_CARD_CORNER: Readonly<ViewStyle> = Object.freeze({
  borderRadius: Radius.detailCard,
});

export function DetailRowsCard({ children, testID }: Props): React.ReactElement {
  return (
    <ListCard testID={testID} className="mx-4 mt-4" style={DETAIL_ROWS_CARD_CORNER}>
      {children}
    </ListCard>
  );
}
