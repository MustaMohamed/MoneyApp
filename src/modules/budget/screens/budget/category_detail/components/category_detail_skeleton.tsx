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
import { HeroShell } from '@/components/ui/hero_shell';
import { ScreenScroll } from '@/components/ui/screen';
import { ScaledBar } from '@/components/ui/skeleton_bar';
import { Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';

export function CategoryDetailSkeleton(): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const hero = resolveDetailHeroGeometry(fontScale);
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
              style={{ height: hero.overlineLineHeight, marginTop: DETAIL_HERO_OVERLINE_GAP }}
            />
            <SkeletonGroup.Item className="w-45 rounded-lg" style={{ height: hero.amountHeight }} />
            <SkeletonGroup.Item
              className="w-38 rounded-md"
              style={{ height: hero.captionLineHeight, marginTop: DETAIL_HERO_CAPTION_GAP }}
            />
          </View>
        </HeroShell>
        <View style={{ paddingHorizontal: Spacing.md }}>
          <ScaledBar height={lineHeightFor(Type.caption)} className="mt-5 mb-2 w-28 rounded-md" />
          <Card
            className="bg-surface border-separator rounded-lg border p-0"
            style={{ boxShadow: 'none' }}
          >
            <Card.Body className="p-4">
              <SkeletonGroup.Item
                className="w-full rounded-lg"
                style={{ height: Size.budgetMonthlyBarMaxHeight }}
              />
            </Card.Body>
          </Card>
        </View>
      </SkeletonGroup>
    </ScreenScroll>
  );
}
