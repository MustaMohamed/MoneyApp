import { Card, SkeletonGroup } from 'heroui-native';
import { View } from 'react-native';

import { ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import {
  buildDetailSkeletonGeometry,
  DETAIL_ACTION_MIN_HEIGHT,
  DETAIL_HERO_MIN_HEIGHT,
  DETAIL_NOTE_MIN_HEIGHT,
  DETAIL_ROW_HEIGHT,
  DETAIL_TRANSFER_MIN_HEIGHT,
} from './detail_geometry';

interface Props {
  transaction?: Transaction | null;
}

export function TransactionDetailSkeleton({ transaction }: Props): React.ReactElement {
  const geometry = buildDetailSkeletonGeometry(transaction);
  const rows = Array.from({ length: geometry.rowCount }, (_, index) => index);
  return (
    <ScreenScroll
      testID="transaction-detail-skeleton"
      accessibilityLabel={Strings.loadingTransactionA11y}
    >
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
        {geometry.showTransfer ? (
          <Card
            testID="transaction-detail-skeleton-transfer"
            className="border-separator mx-4 mt-4 rounded-2xl border p-3.5"
            style={{ minHeight: DETAIL_TRANSFER_MIN_HEIGHT, elevation: 0, shadowOpacity: 0 }}
          >
            <View className="flex-row items-center justify-between">
              <SkeletonGroup.Item className="h-20 w-[42%] rounded-lg" />
              <SkeletonGroup.Item className="h-5 w-5 rounded-md" />
              <SkeletonGroup.Item className="h-20 w-[42%] rounded-lg" />
            </View>
          </Card>
        ) : null}
        <Card
          testID="transaction-detail-skeleton-rows"
          className="border-separator mx-4 mt-4 overflow-hidden rounded-2xl border p-0"
        >
          {rows.map((row) => (
            <View
              key={row}
              testID="transaction-detail-skeleton-row"
              className={row < rows.length - 1 ? 'border-separator border-b px-4' : 'px-4'}
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
        {geometry.showNote ? (
          <Card
            testID="transaction-detail-skeleton-note"
            className="border-separator mx-4 mt-4 rounded-2xl border p-4"
            style={{ minHeight: DETAIL_NOTE_MIN_HEIGHT, elevation: 0, shadowOpacity: 0 }}
          >
            <SkeletonGroup.Item className="h-3 w-20 rounded-md" />
            <SkeletonGroup.Item className="mt-3 h-4 w-full rounded-md" />
          </Card>
        ) : null}
        <View
          testID="transaction-detail-skeleton-actions"
          className="flex-row gap-2.5 px-4 pt-4 pb-6"
          style={{ minHeight: DETAIL_ACTION_MIN_HEIGHT }}
        >
          <SkeletonGroup.Item className="h-13 flex-1 rounded-xl" />
          <SkeletonGroup.Item className="h-13 flex-1 rounded-xl" />
        </View>
      </SkeletonGroup>
    </ScreenScroll>
  );
}
