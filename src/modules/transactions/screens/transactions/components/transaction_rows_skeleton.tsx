import { SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';

const ROWS = [0, 1, 2, 3, 4];

export function TransactionRowsSkeleton(): React.ReactElement {
  return (
    <View testID="transaction-row-skeletons" accessibilityLabel={Strings.loadingTransactionsA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        {ROWS.map((row) => (
          <View
            key={row}
            testID="transaction-row-skeleton"
            className="border-separator border-b px-4 py-3"
          >
            <View style={{ flexDirection: 'row', alignItems: 'flex-start' }} className="gap-3">
              <SkeletonGroup.Item className="mt-0.5 h-9 w-9 rounded-lg" />
              <View style={{ flex: 1 }} className="gap-1.5">
                <SkeletonGroup.Item
                  className={row % 2 === 0 ? 'h-4 w-32 rounded-md' : 'h-4 w-24 rounded-md'}
                />
                <SkeletonGroup.Item className="h-3 w-20 rounded-md" />
              </View>
              <View style={{ alignItems: 'flex-end' }} className="gap-1.5">
                <SkeletonGroup.Item
                  className={row % 2 === 0 ? 'h-4 w-24 rounded-md' : 'h-4 w-20 rounded-md'}
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
