import { SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { DayCardsSkeleton } from '@/components/ui/day_cards_skeleton';
import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Strings } from '@/constants/strings';
import { Radius, Size, lineHeightFor } from '@/constants/theme';

import { RowCaptionSkeleton } from './row_caption';
import {
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_LINE_GAP,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
  resolveTransactionRowHeight,
} from './transaction_row.helpers';

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
  const { fontScale } = useWindowDimensions();
  const lineBar = (fontSize: number): number =>
    resolveSkeletonBarHeight(lineHeightFor(fontSize), fontScale);
  return (
    <View
      testID="transaction-row-skeleton"
      className={showSeparator ? 'border-separator border-b px-4' : 'px-4'}
      style={{ height: resolveTransactionRowHeight(fontScale), justifyContent: 'center' }}
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
            style={{ height: lineBar(TRANSACTION_ROW_TITLE_FONT_SIZE) }}
          />
          <RowCaptionSkeleton />
        </View>
        <View testID="transaction-row-skeleton-value" style={{ alignItems: 'flex-end' }}>
          <SkeletonGroup.Item
            className={row % 2 === 0 ? 'w-20 rounded-md' : 'w-16 rounded-md'}
            style={{ height: lineBar(TRANSACTION_ROW_AMOUNT_FONT_SIZE) }}
          />
          <SkeletonGroup.Item
            className="w-10 rounded-md"
            style={{
              height: lineBar(TRANSACTION_ROW_CODE_FONT_SIZE),
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
  const rowIndexes = Array.from({ length: rows }, (_, index) => index);
  return (
    <View testID="transaction-row-skeletons" accessibilityLabel={Strings.loadingTransactionsA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        {dayCards === undefined ? (
          rowIndexes.map((row) => (
            <SkeletonRow key={row} row={row} showSeparator showTile={showTile} />
          ))
        ) : (
          <DayCardsSkeleton
            dayCards={dayCards}
            rows={rows}
            renderRow={(row, showSeparator) => (
              <SkeletonRow row={row} showSeparator={showSeparator} showTile={showTile} />
            )}
          />
        )}
      </SkeletonGroup>
    </View>
  );
}
