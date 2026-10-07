import { Card, SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { ScreenScroll } from '@/components/ui/screen';
import { resolveSkeletonBarHeight } from '@/components/ui/skeleton_bar.geometry';
import { Strings } from '@/constants/strings';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import {
  buildDetailSkeletonGeometry,
  DETAIL_ACTION_MIN_HEIGHT,
  DETAIL_HERO_MIN_HEIGHT,
  DETAIL_NOTE_MIN_HEIGHT,
  resolveTransferCardHeight,
  resolveTransferSkeletonCellHeight,
} from './detail.geometry';

interface Props {
  transaction?: Transaction | null;
}

function ScaledBar({
  height,
  className,
}: {
  height: number;
  className: string;
}): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <SkeletonGroup.Item
      className={className}
      style={{ height: resolveSkeletonBarHeight(height, fontScale) }}
    />
  );
}

export function TransferFlowSkeletonCard(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const cellHeight = resolveTransferSkeletonCellHeight(fontScale);
  return (
    <Card
      testID="transaction-detail-skeleton-transfer"
      className="border-separator mx-4 mt-4 rounded-2xl border p-3.5"
      style={{ height: resolveTransferCardHeight(fontScale), boxShadow: 'none' }}
    >
      <SkeletonGroup isLoading isSkeletonOnly>
        <View className="flex-row items-center justify-between">
          <SkeletonGroup.Item className="w-[42%] rounded-lg" style={{ height: cellHeight }} />
          <SkeletonGroup.Item className="h-5 w-5 rounded-md" />
          <SkeletonGroup.Item className="w-[42%] rounded-lg" style={{ height: cellHeight }} />
        </View>
      </SkeletonGroup>
    </Card>
  );
}

export function TransactionDetailSkeleton({ transaction }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  if (!transaction) {
    return (
      <ScreenScroll
        testID="transaction-detail-skeleton"
        accessibilityLabel={Strings.loadingTransactionA11y}
      >
        <SkeletonGroup isLoading isSkeletonOnly>
          <View
            testID="transaction-detail-neutral-loading"
            className="flex-1 items-center justify-center"
          >
            <SkeletonGroup.Item className="h-10 w-10 rounded-full" />
          </View>
        </SkeletonGroup>
      </ScreenScroll>
    );
  }

  const geometry = buildDetailSkeletonGeometry(transaction, fontScale);
  return (
    <ScreenScroll
      testID="transaction-detail-skeleton"
      accessibilityLabel={Strings.loadingTransactionA11y}
    >
      <SkeletonGroup isLoading isSkeletonOnly>
        <View
          testID="transaction-detail-skeleton-hero"
          className="border-border mx-4 mt-4 items-center justify-center rounded-xl border px-4 py-4"
          style={{ minHeight: DETAIL_HERO_MIN_HEIGHT }}
        >
          <ScaledBar height={20} className="w-20 rounded-full" />
          <ScaledBar height={36} className="mt-4 w-48 rounded-lg" />
          <ScaledBar height={16} className="mt-3 w-32 rounded-md" />
          <ScaledBar height={12} className="mt-2 w-28 rounded-md" />
        </View>
        {geometry.showTransfer ? <TransferFlowSkeletonCard /> : null}
        <Card
          testID="transaction-detail-skeleton-rows"
          className="border-separator mx-4 mt-4 overflow-hidden rounded-2xl border p-0"
          style={{ boxShadow: 'none' }}
        >
          {geometry.rowHeights.map((height, row) => (
            <View
              key={row}
              testID="transaction-detail-skeleton-row"
              className={
                row < geometry.rowHeights.length - 1 ? 'border-separator border-b px-4' : 'px-4'
              }
              style={{ height, flexDirection: 'row', alignItems: 'center' }}
            >
              <SkeletonGroup.Item className="h-7 w-7 rounded-md" />
              <View className="ml-3 flex-1 gap-1.5">
                <ScaledBar height={12} className="w-20 rounded-md" />
                <ScaledBar height={16} className="w-36 rounded-md" />
              </View>
            </View>
          ))}
        </Card>
        {geometry.showNote ? (
          <Card
            testID="transaction-detail-skeleton-note"
            className="border-separator mx-4 mt-4 rounded-2xl border p-4"
            style={{ minHeight: DETAIL_NOTE_MIN_HEIGHT, boxShadow: 'none' }}
          >
            <ScaledBar height={12} className="w-20 rounded-md" />
            <ScaledBar height={16} className="mt-3 w-full rounded-md" />
          </Card>
        ) : null}
        <View
          testID="transaction-detail-skeleton-actions"
          className="flex-row gap-2.5 px-4 pt-4 pb-6"
          style={{ minHeight: DETAIL_ACTION_MIN_HEIGHT }}
        >
          <ScaledBar height={52} className="flex-1 rounded-xl" />
          <ScaledBar height={52} className="flex-1 rounded-xl" />
        </View>
      </SkeletonGroup>
    </ScreenScroll>
  );
}
