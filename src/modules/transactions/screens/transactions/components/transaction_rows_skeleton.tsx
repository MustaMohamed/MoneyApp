import { SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Size, lineHeightFor } from '@/constants/theme';

import {
  TRANSACTION_ROW_AMOUNT_FONT_SIZE,
  TRANSACTION_ROW_CAPTION_FONT_SIZE,
  TRANSACTION_ROW_CODE_FONT_SIZE,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_LINE_GAP,
  TRANSACTION_ROW_TITLE_FONT_SIZE,
} from './transaction_row.helpers';

const DEFAULT_ROWS = 5;

interface Props {
  rows?: number;
  showDateHeader?: boolean;
}

export function TransactionRowsSkeleton({
  rows = DEFAULT_ROWS,
  showDateHeader = true,
}: Props): React.ReactElement {
  const rowIndexes = Array.from({ length: rows }, (_, index) => index);
  return (
    <View testID="transaction-row-skeletons" accessibilityLabel={Strings.loadingTransactionsA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        {showDateHeader ? (
          <View className="px-4 pt-2 pb-1">
            <SkeletonGroup.Item className="h-3 w-24 rounded-md" />
          </View>
        ) : null}
        {rowIndexes.map((row) => (
          <View
            key={row}
            testID="transaction-row-skeleton"
            className="border-separator border-b px-4"
            style={{ height: TRANSACTION_ROW_HEIGHT, justifyContent: 'center' }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }} className="gap-3">
              <SkeletonGroup.Item
                testID="transaction-row-skeleton-icon"
                className="rounded-lg"
                style={{ width: Size.accountTile, height: Size.accountTile }}
              />
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
        ))}
      </SkeletonGroup>
    </View>
  );
}
