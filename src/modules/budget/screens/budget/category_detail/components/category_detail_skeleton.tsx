import { SkeletonGroup, cn } from 'heroui-native';
import { View, useWindowDimensions } from 'react-native';

import {
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_BAR_GAP,
  DETAIL_HERO_BAR_HEIGHT,
  DETAIL_HERO_BAR_RADIUS,
  DETAIL_HERO_PADDING,
  DETAIL_HERO_SHELL_STYLE,
  DETAIL_HERO_TILE_GAP,
  resolveDetailHeroGeometry,
} from '@/components/ui/detail_hero.geometry';
import { DETAIL_ROWS_CARD_MARGIN_TOP } from '@/components/ui/detail_rows_card.geometry';
import { HeroShell } from '@/components/ui/hero_shell';
import { ListCard } from '@/components/ui/list_card';
import { ScreenScroll } from '@/components/ui/screen';
import {
  SECTION_HEADER_MARGIN_BOTTOM,
  SECTION_HEADER_MARGIN_TOP,
} from '@/components/ui/section_header.geometry';
import { ScaledBar } from '@/components/ui/skeleton_bar';
import { Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

const SKELETON_BUDGET_ROWS = [0, 1, 2];

const BUDGETS_CARD_STYLE = {
  borderRadius: Radius.detailCard,
  marginTop: DETAIL_ROWS_CARD_MARGIN_TOP,
};

const BUDGET_ROW_STYLE = {
  flexDirection: 'row' as const,
  alignItems: 'center' as const,
  gap: Spacing.sm,
  minHeight: Size.budgetDetailRowMinHeight,
};

const BUDGET_RING_STYLE = { width: Size.budgetDetailRing, height: Size.budgetDetailRing };

export function CategoryDetailSkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const hero = resolveDetailHeroGeometry(fontScale, { bar: true });
  return (
    <ScreenScroll testID="budget-category-detail-skeleton">
      <SkeletonGroup isLoading isSkeletonOnly>
        <HeroShell glowOpacity={0} style={DETAIL_HERO_SHELL_STYLE}>
          <View
            testID="budget-category-detail-skeleton-hero"
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
              style={{ height: hero.overlineLineHeight, marginTop: hero.overlineMarginTop }}
            />
            <SkeletonGroup.Item className="w-45 rounded-lg" style={{ height: hero.amountHeight }} />
            <SkeletonGroup.Item
              className="w-full"
              style={{
                height: DETAIL_HERO_BAR_HEIGHT,
                marginTop: DETAIL_HERO_BAR_GAP,
                borderRadius: DETAIL_HERO_BAR_RADIUS,
              }}
            />
            <SkeletonGroup.Item
              className="w-38 rounded-md"
              style={{ height: hero.captionLineHeight, marginTop: hero.captionGap }}
            />
          </View>
        </HeroShell>
        <View style={{ paddingHorizontal: Spacing.md }}>
          <View
            style={{
              marginTop: SECTION_HEADER_MARGIN_TOP,
              marginBottom: SECTION_HEADER_MARGIN_BOTTOM,
            }}
          >
            <ScaledBar height={lineHeightFor(Type.caption)} className="w-28 rounded-md" />
          </View>
          <ListCard>
            <View style={{ padding: Spacing.md }}>
              <SkeletonGroup.Item
                className="w-full rounded-lg"
                style={{ height: Size.budgetMonthlyBarMaxHeight }}
              />
            </View>
          </ListCard>
          <View
            style={{
              marginTop: SECTION_HEADER_MARGIN_TOP,
              marginBottom: SECTION_HEADER_MARGIN_BOTTOM,
            }}
          >
            <ScaledBar height={lineHeightFor(Type.caption)} className="w-28 rounded-md" />
          </View>
          <ListCard style={BUDGETS_CARD_STYLE}>
            {SKELETON_BUDGET_ROWS.map((index) => (
              <View
                key={index}
                testID="budget-category-detail-skeleton-budget-row"
                style={BUDGET_ROW_STYLE}
                className={cn('px-4 py-2.5', index > 0 && 'border-separator border-t')}
              >
                <SkeletonGroup.Item className="rounded-full" style={BUDGET_RING_STYLE} />
                <View style={{ flex: 1 }}>
                  <ScaledBar height={lineHeightFor(Type.bodyStrong)} className="w-30 rounded-md" />
                  <ScaledBar
                    height={lineHeightFor(Type.micro)}
                    className="mt-0.5 w-22.5 rounded-md"
                  />
                </View>
                <View className="items-end">
                  <ScaledBar height={lineHeightFor(Type.bodyStrong)} className="w-16 rounded-md" />
                  <ScaledBar
                    height={lineHeightFor(Type.micro)}
                    className="mt-0.5 w-8.5 rounded-md"
                  />
                </View>
              </View>
            ))}
          </ListCard>
        </View>
      </SkeletonGroup>
    </ScreenScroll>
  );
}
