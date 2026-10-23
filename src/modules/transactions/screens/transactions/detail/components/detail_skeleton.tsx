import { SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { HeroShell } from '@/components/ui/hero_shell';
import { ScreenScroll } from '@/components/ui/screen';
import { ScaledBar } from '@/components/ui/skeleton_bar';
import { Strings } from '@/constants/strings';
import { Radius, Size, Type, lineHeightFor } from '@/constants/theme';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

import { resolveDetailActionBarCount, type DetailActionSet } from '../detail.helpers';
import {
  buildDetailSkeletonGeometry,
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_CAPTION_GAP,
  DETAIL_HERO_OVERLINE_GAP,
  DETAIL_HERO_PADDING,
  DETAIL_HERO_SHELL_STYLE,
  DETAIL_HERO_TILE_GAP,
  resolveDetailHeroGeometry,
  resolveTransferSkeletonCellHeight,
} from './detail.geometry';
import { NoteCardFrame, TransferFlowCardFrame } from './detail_card_frames';

interface Props {
  transaction?: Transaction | null;
  actionSet: DetailActionSet;
}

export function TransferFlowSkeletonCard(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const cellHeight = resolveTransferSkeletonCellHeight(fontScale);
  return (
    <TransferFlowCardFrame
      testID="transaction-detail-skeleton-transfer"
      className="border-separator"
    >
      <SkeletonGroup isLoading isSkeletonOnly>
        <View className="flex-row items-center justify-between">
          <SkeletonGroup.Item className="w-[42%] rounded-lg" style={{ height: cellHeight }} />
          <SkeletonGroup.Item className="h-5 w-5 rounded-md" />
          <SkeletonGroup.Item className="w-[42%] rounded-lg" style={{ height: cellHeight }} />
        </View>
      </SkeletonGroup>
    </TransferFlowCardFrame>
  );
}

export function TransactionDetailSkeleton({ transaction, actionSet }: Props): React.ReactElement {
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
  const hero = resolveDetailHeroGeometry(fontScale);
  return (
    <ScreenScroll
      testID="transaction-detail-skeleton"
      accessibilityLabel={Strings.loadingTransactionA11y}
    >
      <SkeletonGroup isLoading isSkeletonOnly>
        <HeroShell glowOpacity={0} style={DETAIL_HERO_SHELL_STYLE}>
          <View
            testID="transaction-detail-skeleton-hero"
            style={{ padding: DETAIL_HERO_PADDING, height: hero.height }}
          >
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: DETAIL_HERO_TILE_GAP,
                height: hero.topHeight,
              }}
            >
              <SkeletonGroup.Item
                style={{
                  width: Size.detailHeroTile,
                  height: Size.detailHeroTile,
                  borderRadius: Radius.md,
                }}
              />
              <View style={{ flex: 1 }}>
                <SkeletonGroup.Item
                  className="w-35 rounded-md"
                  style={{ height: hero.titleLineHeight }}
                />
                <SkeletonGroup.Item
                  className="w-16 rounded-full"
                  style={{ height: hero.badgeHeight, marginTop: DETAIL_HERO_BADGE_GAP }}
                />
              </View>
            </View>
            <SkeletonGroup.Item
              className="w-15 rounded-md"
              style={{
                height: hero.overlineLineHeight,
                marginTop: DETAIL_HERO_OVERLINE_GAP,
              }}
            />
            <SkeletonGroup.Item className="w-45 rounded-lg" style={{ height: hero.amountHeight }} />
            <SkeletonGroup.Item
              className="w-38 rounded-md"
              style={{
                height: hero.captionLineHeight,
                marginTop: DETAIL_HERO_CAPTION_GAP,
              }}
            />
          </View>
        </HeroShell>
        {geometry.showTransfer ? <TransferFlowSkeletonCard /> : null}
        <DetailRowsCard testID="transaction-detail-skeleton-rows">
          {geometry.rowHeights.map((height, row) => (
            <View
              key={row}
              testID="transaction-detail-skeleton-row"
              className={
                row < geometry.rowHeights.length - 1 ? 'border-separator border-b px-4' : 'px-4'
              }
              style={{
                height,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <ScaledBar height={14} className="w-16 rounded-md" />
              <ScaledBar height={14} className="w-28 rounded-md" />
            </View>
          ))}
        </DetailRowsCard>
        {geometry.showNote ? (
          <NoteCardFrame testID="transaction-detail-skeleton-note">
            <ScaledBar height={lineHeightFor(Type.overline)} className="w-12 rounded-md" />
            <ScaledBar height={lineHeightFor(Type.body)} className="mt-1 w-full rounded-md" />
          </NoteCardFrame>
        ) : null}
        <View
          testID="transaction-detail-skeleton-actions"
          className="gap-2 px-4 pt-4 pb-6"
          style={{ flexDirection: 'row' }}
        >
          {Array.from({ length: resolveDetailActionBarCount(actionSet) }, (_, bar) => (
            <SkeletonGroup.Item
              key={bar}
              style={{ flex: 1, height: Size.ctaFooterTrack, borderRadius: Radius.cta }}
            />
          ))}
        </View>
      </SkeletonGroup>
    </ScreenScroll>
  );
}
