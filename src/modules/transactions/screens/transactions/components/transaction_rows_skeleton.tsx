import { SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';
import { Type, lineHeightFor } from '@/constants/theme';

import {
  TRANSACTION_ROW_CONTEXT_GAP,
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_ICON_SIZE,
  TRANSACTION_ROW_NOTE_TRACK_HEIGHT,
  TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT,
  TRANSACTION_ROW_VALUE_WIDTH,
  TRANSACTION_ROW_VERTICAL_PADDING,
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
            style={{
              height: TRANSACTION_ROW_HEIGHT,
              paddingVertical: TRANSACTION_ROW_VERTICAL_PADDING,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} className="gap-3">
              <SkeletonGroup.Item
                testID="transaction-row-skeleton-icon"
                className="mt-0.5 rounded-lg"
                style={{ width: TRANSACTION_ROW_ICON_SIZE, height: TRANSACTION_ROW_ICON_SIZE }}
              />
              <View style={{ flex: 1 }}>
                <SkeletonGroup.Item
                  className={row % 2 === 0 ? 'w-32 rounded-md' : 'w-24 rounded-md'}
                  style={{ height: lineHeightFor(Type.meta) }}
                />
                <SkeletonGroup.Item
                  className="w-20 rounded-md"
                  style={{
                    height: lineHeightFor(Type.overline),
                    marginTop: TRANSACTION_ROW_CONTEXT_GAP,
                  }}
                />
                <SkeletonGroup.Item
                  testID="transaction-row-skeleton-note"
                  className="w-28 rounded-md"
                  style={{ height: TRANSACTION_ROW_NOTE_TRACK_HEIGHT }}
                />
              </View>
              <View
                testID="transaction-row-skeleton-value"
                style={{ width: TRANSACTION_ROW_VALUE_WIDTH, alignItems: 'flex-end' }}
              >
                <SkeletonGroup.Item
                  className={row % 2 === 0 ? 'w-24 rounded-md' : 'w-20 rounded-md'}
                  style={{ height: lineHeightFor(Type.body) }}
                />
                <SkeletonGroup.Item
                  testID="transaction-row-skeleton-secondary-amount"
                  className="w-16 rounded-md"
                  style={{ height: TRANSACTION_ROW_SECONDARY_AMOUNT_TRACK_HEIGHT }}
                />
                <SkeletonGroup.Item
                  className="w-12 rounded-md"
                  style={{ height: lineHeightFor(Type.overline) }}
                />
              </View>
            </View>
          </View>
        ))}
      </SkeletonGroup>
    </View>
  );
}
