import { SkeletonGroup } from 'heroui-native';
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
import { HeroShell } from '@/components/ui/hero_shell';
import { ListCard } from '@/components/ui/list_card';
import { ScreenScroll } from '@/components/ui/screen';
import {
  SECTION_HEADER_MARGIN_BOTTOM,
  SECTION_HEADER_MARGIN_TOP,
} from '@/components/ui/section_header.geometry';
import { ScaledBar } from '@/components/ui/skeleton_bar';
import { Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

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
        </View>
      </SkeletonGroup>
    </ScreenScroll>
  );
}
