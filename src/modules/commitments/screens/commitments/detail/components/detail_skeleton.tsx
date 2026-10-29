import { Card, SkeletonGroup } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

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
import type { CommitmentPayment } from '../../../../entities/commitment_payment.entity';
import { commitmentCycleShowsActions, resolveCommitmentDetailFactKinds } from '../detail.helpers';
import {
  CURRENT_CYCLE_ACTIONS_GAP,
  CURRENT_CYCLE_ACTION_GAP,
  CURRENT_CYCLE_CARD_FRAME_STYLE,
  CURRENT_CYCLE_ROW_GAP,
  resolveCurrentCycleCardGeometry,
} from './current_cycle_card.geometry';

const CYCLE_ACTION_BAR_STYLE = { flex: 1, height: Size.ctaFooterTrack, borderRadius: Radius.cta };

interface Props {
  commitmentHint: Commitment | undefined;
  cycleHint: Pick<CommitmentPayment, 'paid_date' | 'skipped_date' | 'transaction_id'> | undefined;
}

export function CommitmentDetailSkeleton({ commitmentHint, cycleHint }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const hero = resolveDetailHeroGeometry(fontScale);
  const rowHeight = resolveFactRowHeight(fontScale);
  const rowCount = resolveCommitmentDetailFactKinds(commitmentHint).length;
  const showsActions = commitmentCycleShowsActions(cycleHint);
  const cycle = resolveCurrentCycleCardGeometry(fontScale, showsActions);
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
        <Card
          testID="commitment-detail-skeleton-cycle"
          className="bg-surface border-accent/18 mx-4 mt-4"
          style={{ ...CURRENT_CYCLE_CARD_FRAME_STYLE, height: cycle.height }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', height: cycle.headerHeight }}>
            <ScaledBar height={lineHeightFor(Type.overline)} className="w-20 rounded-md" />
          </View>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              height: cycle.bodyHeight,
              marginTop: CURRENT_CYCLE_ROW_GAP,
            }}
          >
            <ScaledBar height={lineHeightFor(Type.subhead)} className="w-28 rounded-md" />
            <ScaledBar height={lineHeightFor(Type.caption)} className="w-16 rounded-md" />
          </View>
          {showsActions ? (
            <View
              style={{
                flexDirection: 'row',
                gap: CURRENT_CYCLE_ACTION_GAP,
                marginTop: CURRENT_CYCLE_ACTIONS_GAP,
              }}
            >
              <SkeletonGroup.Item style={CYCLE_ACTION_BAR_STYLE} />
              <SkeletonGroup.Item style={CYCLE_ACTION_BAR_STYLE} />
            </View>
          ) : null}
        </Card>
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
      </SkeletonGroup>
    </ScreenScroll>
  );
}
