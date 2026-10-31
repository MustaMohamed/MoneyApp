import { SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { DayCardRow } from '@/components/ui/day_card_row';
import {
  DAY_HEADER_NET_PLACEHOLDER_WIDTH,
  DAY_HEADER_ROOT_STYLE,
  resolveDayHeaderGeometry,
} from '@/components/ui/day_header.geometry';

export const SKELETON_DAY_CARDS = 2;
export const SKELETON_ROWS_PER_CARD = 3;

interface DayCardsSkeletonProps {
  dayCards: number;
  rows: number;
  renderRow: (row: number, showSeparator: boolean) => React.ReactElement;
}

/** Draws inside the caller's `SkeletonGroup`. */
export function DayCardsSkeleton({
  dayCards,
  rows,
  renderRow,
}: DayCardsSkeletonProps): React.ReactElement {
  const { height, lineHeight } = resolveDayHeaderGeometry(useWindowDimensions().fontScale);
  const cardIndexes = Array.from({ length: dayCards }, (_, index) => index);
  const rowIndexes = Array.from({ length: rows }, (_, index) => index);
  return (
    <>
      {cardIndexes.map((card) => (
        <View key={card}>
          <View
            testID="day-card-skeleton-header"
            style={[DAY_HEADER_ROOT_STYLE, { height, justifyContent: 'space-between' }]}
          >
            <SkeletonGroup.Item className="w-24 rounded-md" style={{ height: lineHeight }} />
            <SkeletonGroup.Item
              className="rounded-md"
              style={{ width: DAY_HEADER_NET_PLACEHOLDER_WIDTH, height: lineHeight }}
            />
          </View>
          {rowIndexes.map((row) => {
            const isLast = row === rows - 1;
            return (
              <DayCardRow key={row} isFirst={row === 0} isLast={isLast}>
                {renderRow(row, !isLast)}
              </DayCardRow>
            );
          })}
        </View>
      ))}
    </>
  );
}
