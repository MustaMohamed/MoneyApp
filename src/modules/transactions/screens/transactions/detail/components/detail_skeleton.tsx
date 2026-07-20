import { Card, SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { Strings } from '@/constants/strings';

import { DETAIL_HERO_MIN_HEIGHT, DETAIL_ROW_HEIGHT } from './detail_geometry';

const ROWS = [0, 1, 2, 3];

export function TransactionDetailSkeleton(): React.ReactElement {
  return (
    <View testID="transaction-detail-skeleton" accessibilityLabel={Strings.loadingTransactionA11y}>
      <SkeletonGroup isLoading isSkeletonOnly>
        <View
          testID="transaction-detail-skeleton-hero"
          className="border-border mx-4 mt-4 items-center justify-center rounded-xl border px-4"
          style={{ minHeight: DETAIL_HERO_MIN_HEIGHT }}
        >
          <SkeletonGroup.Item className="h-5 w-20 rounded-full" />
          <SkeletonGroup.Item className="mt-4 h-9 w-48 rounded-lg" />
          <SkeletonGroup.Item className="mt-3 h-4 w-32 rounded-md" />
          <SkeletonGroup.Item className="mt-2 h-3 w-28 rounded-md" />
        </View>
        <Card
          testID="transaction-detail-skeleton-rows"
          className="border-separator mx-4 mt-4 overflow-hidden rounded-xl border p-0"
        >
          {ROWS.map((row) => (
            <View
              key={row}
              className={row < ROWS.length - 1 ? 'border-separator border-b px-4' : 'px-4'}
              style={{ height: DETAIL_ROW_HEIGHT, flexDirection: 'row', alignItems: 'center' }}
            >
              <SkeletonGroup.Item className="h-7 w-7 rounded-md" />
              <View className="ml-3 flex-1 gap-1.5">
                <SkeletonGroup.Item className="h-3 w-20 rounded-md" />
                <SkeletonGroup.Item className="h-4 w-36 rounded-md" />
              </View>
            </View>
          ))}
        </Card>
      </SkeletonGroup>
    </View>
  );
}
