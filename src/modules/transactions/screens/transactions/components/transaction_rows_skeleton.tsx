import { SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { Strings } from '@/constants/strings';
import { Radius, Size, Spacing, lineHeightFor } from '@/constants/theme';

import { DayCardRow } from './day_card_row';
import {
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_LINE_GAP,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
} from './transaction_row.helpers';
import { resolveDayHeaderGeometry } from './transactions_text.geometry';

const DEFAULT_ROWS = 5;

interface Props {
  rows?: number;
  /** Groups the rows into this many day cards, each under a header row; without it, bare rows. */
  dayCards?: number;
  /** Off where the loaded rows draw no account tile, the account detail's activity card. */
  showTile?: boolean;
}

interface RowProps {
  row: number;
  showSeparator: boolean;
  showTile: boolean;
}

function SkeletonRow({ row, showSeparator, showTile }: RowProps): React.ReactElement {
  return (
    <View
      testID="transaction-row-skeleton"
      className={showSeparator ? 'border-separator border-b px-4' : 'px-4'}
      style={{ height: TRANSACTION_ROW_HEIGHT, justifyContent: 'center' }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-3">
        {showTile ? (
          <SkeletonGroup.Item
            testID="transaction-row-skeleton-icon"
            style={{
              width: Size.accountTile,
              height: Size.accountTile,
              borderRadius: Radius.sm,
            }}
          />
        ) : null}
        <View style={{ flex: 1 }}>
          <SkeletonGroup.Item
            className={row % 2 === 0 ? 'w-32 rounded-md' : 'w-24 rounded-md'}
            style={{ height: lineHeightFor(TRANSACTION_ROW_TITLE_FONT_SIZE) }}
          />
          <SkeletonGroup.Item
            className="w-20 rounded-md"
            style={{
              height: lineHeightFor(TRANSACTION_ROW_CAPTION_FONT_SIZE),
              marginTop: TRANSACTION_ROW_LINE_GAP,
            }}
          />
        </View>
        <View testID="transaction-row-skeleton-value" style={{ alignItems: 'flex-end' }}>
          <SkeletonGroup.Item
            className={row % 2 === 0 ? 'w-20 rounded-md' : 'w-16 rounded-md'}
            style={{ height: lineHeightFor(TRANSACTION_ROW_AMOUNT_FONT_SIZE) }}
          />
          <SkeletonGroup.Item
            className="w-10 rounded-md"
            style={{
              height: lineHeightFor(TRANSACTION_ROW_CODE_FONT_SIZE),
              marginTop: TRANSACTION_ROW_LINE_GAP,
            }}
          />
        </View>
      </View>
    </View>
  );
}

export function TransactionRowsSkeleton({
  rows = DEFAULT_ROWS,
  dayCards,
  showTile = true,
}: Props): React.ReactElement {
  const { height: headerHeight, lineHeight: headerLineHeight } = resolveDayHeaderGeometry(
    useWindowDimensions().fontScale,
  );
  const rowIndexes = Array.from({ length: rows }, (_, index) => index);
  const cardIndexes = Array.from({ length: dayCards ?? 0 }, (_, index) => index);
  return (
    <View testID="transaction-row-skeletons" accessibilityLabel={Strings.loadingTransactionsA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        {dayCards === undefined
          ? rowIndexes.map((row) => (
              <SkeletonRow key={row} row={row} showSeparator showTile={showTile} />
            ))
          : cardIndexes.map((card) => (
              <View key={card}>
                <View
                  testID="transaction-day-skeleton-header"
                  style={{
                    height: headerHeight,
                    paddingHorizontal: Spacing.md,
                    paddingTop: Spacing.md,
                    paddingBottom: Spacing.xs,
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <SkeletonGroup.Item
                    className="w-24 rounded-md"
                    style={{ height: headerLineHeight }}
                  />
                  <SkeletonGroup.Item
                    className="w-20 rounded-md"
                    style={{ height: headerLineHeight }}
                  />
                </View>
                {rowIndexes.map((row) => {
                  const isLast = row === rows - 1;
                  return (
                    <DayCardRow key={row} isFirst={row === 0} isLast={isLast}>
                      <SkeletonRow row={row} showSeparator={!isLast} showTile={showTile} />
                    </DayCardRow>
                  );
                })}
              </View>
            ))}
      </SkeletonGroup>
    </View>
  );
}
