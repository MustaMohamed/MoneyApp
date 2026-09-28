import type React from 'react';
import { View } from 'react-native';

import { resolveDayCardSliceStyle } from './day_card_row.helpers';

interface Props {
  isFirst: boolean;
  isLast: boolean;
  children: React.ReactNode;
}

// A plain View: ListCard and ListGroup wrap a whole day in one cell (ADR 2026-09-28 §9).
export function DayCardRow({ isFirst, isLast, children }: Props): React.ReactElement {
  return (
    <View
      testID="day-card-row"
      className="bg-surface border-separator"
      style={resolveDayCardSliceStyle(isFirst, isLast)}
    >
      {children}
    </View>
  );
}
