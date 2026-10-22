import type React from 'react';
import { View } from 'react-native';

import { type DayCardTone, resolveDayCardSliceStyle } from './day_card_row.helpers';

interface Props {
  isFirst: boolean;
  isLast: boolean;
  tone?: DayCardTone;
  children: React.ReactNode;
}

const TONE_CLASS: Record<DayCardTone, string> = {
  default: 'bg-surface border-separator',
  danger: 'bg-surface border-danger/35',
};

// A plain View: ListCard and ListGroup wrap a whole day in one cell (ADR 2026-09-28 §9).
export function DayCardRow({
  isFirst,
  isLast,
  tone = 'default',
  children,
}: Props): React.ReactElement {
  return (
    <View
      testID="day-card-row"
      className={TONE_CLASS[tone]}
      style={resolveDayCardSliceStyle(isFirst, isLast)}
    >
      {children}
    </View>
  );
}
