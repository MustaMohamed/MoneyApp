import React from 'react';
import type { ViewStyle } from 'react-native';

import { ListCard } from '@/components/ui/list_card';
import { Radius } from '@/constants/theme';

import { DETAIL_ROWS_CARD_MARGIN_TOP } from './detail_rows_card.geometry';

interface Props {
  children: React.ReactNode;
  testID?: string;
}

const DETAIL_ROWS_CARD_STYLE: Readonly<ViewStyle> = Object.freeze({
  borderRadius: Radius.detailCard,
  marginTop: DETAIL_ROWS_CARD_MARGIN_TOP,
});

export function DetailRowsCard({ children, testID }: Props): React.ReactElement {
  return (
    <ListCard testID={testID} className="mx-4" style={DETAIL_ROWS_CARD_STYLE}>
      {children}
    </ListCard>
  );
}
