import { Card, SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions, type ViewStyle } from 'react-native';

import { resolveDetailRowHeight } from '@/components/ui/detail_row.geometry';
import { DetailRowsCard } from '@/components/ui/detail_rows_card';
import { HeroShell } from '@/components/ui/hero_shell';
import { ScreenScroll } from '@/components/ui/screen';
import { ScaledBar } from '@/components/ui/skeleton_bar';
import { Strings } from '@/constants/strings';
import { Radius, Size, Type, lineHeightFor } from '@/constants/theme';

import {
  COMMITMENT_DETAIL_SKELETON_BADGE_GAP,
  COMMITMENT_DETAIL_SKELETON_CAPTION_GAP,
  COMMITMENT_DETAIL_SKELETON_HERO_PADDING,
  COMMITMENT_DETAIL_SKELETON_OVERLINE_GAP,
  COMMITMENT_DETAIL_SKELETON_SHELL_STYLE,
  COMMITMENT_DETAIL_SKELETON_TILE_GAP,
  resolveCommitmentDetailSkeletonHero,
} from './detail_skeleton.geometry';

const DETAIL_ROW_COUNT = 6;
const CYCLE_BUTTON_COUNT = 2;

const CYCLE_CARD_FRAME_STYLE: Readonly<ViewStyle> = Object.freeze({
  borderRadius: Radius.detailCard,
  boxShadow: 'none',
});

export function CommitmentDetailSkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const hero = resolveCommitmentDetailSkeletonHero(fontScale);
  const rowHeight = resolveDetailRowHeight(fontScale);
  return (
    <ScreenScroll
      testID="commitment-detail-skeleton"
      accessibilityLabel={Strings.commitmentsDetailLoadingA11y}
    >
      <SkeletonGroup isLoading isSkeletonOnly>
        <HeroShell glowOpacity={0} style={COMMITMENT_DETAIL_SKELETON_SHELL_STYLE}>
          <View style={{ padding: COMMITMENT_DETAIL_SKELETON_HERO_PADDING }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: COMMITMENT_DETAIL_SKELETON_TILE_GAP,
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
                    marginTop: COMMITMENT_DETAIL_SKELETON_BADGE_GAP,
                  }}
                />
              </View>
            </View>
            <SkeletonGroup.Item
              className="w-15 rounded-md"
              style={{
                height: hero.overlineLineHeight,
                marginTop: COMMITMENT_DETAIL_SKELETON_OVERLINE_GAP,
              }}
            />
            <SkeletonGroup.Item className="w-45 rounded-lg" style={{ height: hero.amountHeight }} />
            <SkeletonGroup.Item
              className="w-38 rounded-md"
              style={{
                height: hero.captionLineHeight,
                marginTop: COMMITMENT_DETAIL_SKELETON_CAPTION_GAP,
              }}
            />
          </View>
        </HeroShell>
        <Card
          testID="commitment-detail-skeleton-cycle"
          className="border-separator mx-4 mt-4 gap-3 border px-4 py-3"
          style={CYCLE_CARD_FRAME_STYLE}
        >
          <ScaledBar height={lineHeightFor(Type.overline)} className="w-20 rounded-md" />
          <View
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}
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
        <DetailRowsCard testID="commitment-detail-skeleton-rows">
          {Array.from({ length: DETAIL_ROW_COUNT }, (_, row) => (
            <View
              key={row}
              className={row < DETAIL_ROW_COUNT - 1 ? 'border-separator border-b px-4' : 'px-4'}
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
      </SkeletonGroup>
    </ScreenScroll>
  );
}
