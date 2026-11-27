import React from 'react';

import { ListCard } from '@/components/ui/list_card';

import { DETAIL_ROWS_CARD_STYLE } from './detail_rows_card.geometry';

interface Props {
  children: React.ReactNode;
  testID?: string;
}

export function DetailRowsCard({ children, testID }: Props): React.ReactElement {
  return (
    <ListCard testID={testID} className="mx-4" style={DETAIL_ROWS_CARD_STYLE}>
      {children}
    </ListCard>
  );
}
