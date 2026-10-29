import { Card, SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';

import {
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_CAPTION_GAP,
  DETAIL_HERO_OVERLINE_GAP,
  DETAIL_HERO_PADDING,
  DETAIL_HERO_SHELL_STYLE,
  DETAIL_HERO_TILE_GAP,
  resolveDetailHeroGeometry,
} from '@/components/ui/detail_hero.geometry';
import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { resolveFactRowHeight } from '@/components/ui/fact_row.geometry';
import { HeroShell } from '@/components/ui/hero_shell';
import { ScreenScroll } from '@/components/ui/screen';
import { ScaledBar } from '@/components/ui/skeleton_bar';
import { Strings } from '@/constants/strings';
import { Radius, Size, Type, lineHeightFor } from '@/constants/theme';

import type { Commitment } from '../../../../entities/commitment.entity';
import {
  type CommitmentDetailSkeletonCards,
  resolveCommitmentDetailFactKinds,
} from '../detail.helpers';

const CYCLE_BUTTON_COUNT = 2;

const CYCLE_CARD_FRAME_STYLE: Readonly<ViewStyle> = Object.freeze({
  borderRadius: Radius.detailCard,
  boxShadow: 'none',
});

interface Props {
  commitmentHint: Commitment | undefined;
  cards: CommitmentDetailSkeletonCards;
}

export function CommitmentDetailSkeleton({ commitmentHint, cards }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const hero = resolveDetailHeroGeometry(fontScale);
  const rowHeight = resolveFactRowHeight(fontScale);
  const rowCount =
    cards.factRows && commitmentHint !== undefined
      ? resolveCommitmentDetailFactKinds(commitmentHint).length
      : 0;
  return (
    <ScreenScroll
      testID="commitment-detail-skeleton"
      accessibilityLabel={Strings.commitmentsDetailLoadingA11y}
    >
      <SkeletonGroup isLoading isSkeletonOnly>
        <HeroShell glowOpacity={0} style={DETAIL_HERO_SHELL_STYLE}>
          <View style={{ padding: DETAIL_HERO_PADDING, height: hero.height }}>
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
                  style={{
                    height: hero.badgeHeight,
                    marginTop: DETAIL_HERO_BADGE_GAP,
                  }}
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
        {cards.cycleCard ? (
          <Card
            testID="commitment-detail-skeleton-cycle"
            className="border-separator mx-4 mt-4 gap-3 border px-4 py-3"
            style={CYCLE_CARD_FRAME_STYLE}
          >
            <ScaledBar height={lineHeightFor(Type.overline)} className="w-20 rounded-md" />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <ScaledBar height={lineHeightFor(Type.subhead)} className="w-28 rounded-md" />
              <ScaledBar height={lineHeightFor(Type.caption)} className="w-16 rounded-md" />
            </View>
            <View className="gap-2" style={{ flexDirection: 'row' }}>
              {Array.from({ length: CYCLE_BUTTON_COUNT }, (_, bar) => (
                <SkeletonGroup.Item
                  key={bar}
                  style={{ flex: 1, height: Size.ctaFooterTrack, borderRadius: Radius.cta }}
                />
              ))}
            </View>
          </Card>
        ) : null}
        {rowCount > 0 ? (
          <DetailRowsCard testID="commitment-detail-skeleton-rows">
            {Array.from({ length: rowCount }, (_, row) => (
              <View
                key={row}
                className={row < rowCount - 1 ? 'border-separator border-b px-4' : 'px-4'}
                style={{
                  height: rowHeight,
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <ScaledBar height={lineHeightFor(Type.overline)} className="w-16 rounded-md" />
                <ScaledBar height={lineHeightFor(Type.meta)} className="w-28 rounded-md" />
              </View>
            ))}
          </DetailRowsCard>
        ) : null}
      </SkeletonGroup>
    </ScreenScroll>
  );
}
