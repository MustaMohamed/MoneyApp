import { SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';

import {
  TRANSACTION_ROW_HEIGHT,
  TRANSACTION_ROW_ICON_SIZE,
  TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT,
  TRANSACTION_ROW_VALUE_WIDTH,
} from './transaction_row.helpers';

const ROWS = [0, 1, 2, 3, 4];

export function TransactionRowsSkeleton(): React.ReactElement {
  return (
    <View testID="transaction-row-skeletons" accessibilityLabel={Strings.loadingTransactionsA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        <View className="px-4 pt-2 pb-1">
          <SkeletonGroup.Item className="h-3 w-24 rounded-md" />
        </View>
        {ROWS.map((row) => (
          <View
            key={row}
            testID="transaction-row-skeleton"
            className="border-separator border-b px-4 py-1.5"
            style={{ height: TRANSACTION_ROW_HEIGHT }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} className="gap-3">
              <SkeletonGroup.Item
                testID="transaction-row-skeleton-icon"
                className="mt-0.5 rounded-lg"
                style={{ width: TRANSACTION_ROW_ICON_SIZE, height: TRANSACTION_ROW_ICON_SIZE }}
              />
              <View style={{ flex: 1 }} className="gap-0.5">
                <SkeletonGroup.Item
                  className={row % 2 === 0 ? 'h-4 w-32 rounded-md' : 'h-4 w-24 rounded-md'}
                />
                <SkeletonGroup.Item className="h-3 w-20 rounded-md" />
                <SkeletonGroup.Item
                  testID="transaction-row-skeleton-note"
                  className="w-28 rounded-md"
                  style={{ height: TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT }}
                />
              </View>
              <View
                testID="transaction-row-skeleton-value"
                style={{ width: TRANSACTION_ROW_VALUE_WIDTH, alignItems: 'flex-end' }}
                className="gap-0.5"
              >
                <SkeletonGroup.Item
                  className={row % 2 === 0 ? 'h-4 w-24 rounded-md' : 'h-4 w-20 rounded-md'}
                />
                <SkeletonGroup.Item
                  testID="transaction-row-skeleton-secondary-amount"
                  className="w-16 rounded-md"
                  style={{ height: TRANSACTION_ROW_OPTIONAL_TRACK_HEIGHT }}
                />
                <SkeletonGroup.Item className="h-3 w-12 rounded-md" />
              </View>
            </View>
          </View>
        ))}
      </SkeletonGroup>
    </View>
  );
}
