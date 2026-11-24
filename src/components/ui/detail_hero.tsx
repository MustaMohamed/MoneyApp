import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import {
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_BADGE_ROW_GAP,
  DETAIL_HERO_BAR_CAPTION_GAP,
  DETAIL_HERO_BAR_GAP,
  DETAIL_HERO_BAR_HEIGHT,
  DETAIL_HERO_BAR_RADIUS,
  DETAIL_HERO_BAR_TICK_OVERHANG,
  DETAIL_HERO_BAR_TICK_RADIUS,
  DETAIL_HERO_BAR_TICK_WIDTH,
  DETAIL_HERO_CAPTION_GAP,
  DETAIL_HERO_CODE_GAP,
  DETAIL_HERO_CODE_OPACITY,
  DETAIL_HERO_OVERLINE_GAP,
  DETAIL_HERO_PADDING,
  DETAIL_HERO_SHELL_STYLE,
  DETAIL_HERO_TILE_GAP,
  resolveDetailHeroBarShare,
  resolveDetailHeroGeometry,
} from '@/components/ui/detail_hero.geometry';
import { HeroShell, type HeroShellProps } from '@/components/ui/hero_shell';
import { StatusBadge } from '@/components/ui/status_badge';
import { Strings } from '@/constants/strings';
import { Radius, Size, lineHeightFor } from '@/constants/theme';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface DetailHeroModel {
  title: string;
  badgeLabel: string;
  badgeIcon?: IconName;
  badgeFill: string;
  badgeForeground: string;
  tileColor: string;
  tileGlyph: IconName;
  tileGlyphColor: string;
  amountValue: string;
  amountCode?: string;
  amountColor: string;
  amountAccessibilityLabel: string;
  caption: string;
  overline?: string;
  hidesOverline?: boolean;
  tag?: DetailHeroBadge;
  bar?: DetailHeroBar;
}

export type DetailHeroBadge = Pick<
  DetailHeroModel,
  'badgeLabel' | 'badgeIcon' | 'badgeFill' | 'badgeForeground'
>;

export interface DetailHeroBar {
  share: number;
  color: string;
  tickShare?: number;
}

interface Props {
  hero: DetailHeroModel;
  testID: string;
  entering?: HeroShellProps['entering'];
}

function sharePercent(share: number): `${number}%` {
  return `${resolveDetailHeroBarShare(share) * 100}%`;
}

export function DetailHero({ hero, testID, entering }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const hidesOverline = hero.hidesOverline === true;
  const geometry = resolveDetailHeroGeometry(fontScale, {
    hidesOverline,
    bar: hero.bar !== undefined,
  });

  return (
    <HeroShell glowColor={hero.tileColor} style={DETAIL_HERO_SHELL_STYLE} entering={entering}>
      <View testID={testID} style={{ padding: DETAIL_HERO_PADDING, height: geometry.height }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: DETAIL_HERO_TILE_GAP,
            height: geometry.topHeight,
          }}
        >
          <View
            style={{
              width: Size.detailHeroTile,
              height: Size.detailHeroTile,
              borderRadius: Radius.md,
              backgroundColor: hero.tileColor,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <MaterialCommunityIcons
              name={hero.tileGlyph}
              size={Size.iconLg}
              color={hero.tileGlyphColor}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Typography
              allowFontScaling={false}
              numberOfLines={1}
              className="font-sora-semibold text-foreground"
              style={{
                fontSize: geometry.titleFontSize,
                lineHeight: lineHeightFor(geometry.titleFontSize),
              }}
            >
              {hero.title}
            </Typography>
            {/* A column child stretches by default, which would run the pill the full width. */}
            <View
              style={{
                flexDirection: 'row',
                alignSelf: 'flex-start',
                gap: DETAIL_HERO_BADGE_ROW_GAP,
                marginTop: DETAIL_HERO_BADGE_GAP,
              }}
            >
              {hero.tag === undefined ? undefined : (
                <StatusBadge
                  label={hero.tag.badgeLabel}
                  fill={hero.tag.badgeFill}
                  foreground={hero.tag.badgeForeground}
                  icon={hero.tag.badgeIcon}
                  size="tagMd"
                  fontScale={fontScale}
                />
              )}
              <StatusBadge
                label={hero.badgeLabel}
                fill={hero.badgeFill}
                foreground={hero.badgeForeground}
                icon={hero.badgeIcon}
                size="md"
                fontScale={fontScale}
              />
            </View>
          </View>
        </View>

        {hidesOverline ? undefined : (
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            className="font-inter text-foreground/70 tracking-wider uppercase"
            style={{
              marginTop: DETAIL_HERO_OVERLINE_GAP,
              fontSize: geometry.overlineFontSize,
              lineHeight: lineHeightFor(geometry.overlineFontSize),
            }}
          >
            {hero.overline ?? Strings.detailAmountOverline}
          </Typography>
        )}

        {/* A container `gap`, not a `marginLeft` on a nested Text: RN Android drops margins on inline text. */}
        <View
          accessible
          accessibilityLabel={hero.amountAccessibilityLabel}
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: DETAIL_HERO_CODE_GAP,
            height: geometry.amountHeight,
            marginTop: hidesOverline ? DETAIL_HERO_OVERLINE_GAP : undefined,
          }}
        >
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            className="font-sora-bold tabular-nums"
            style={{
              flexShrink: 1,
              color: hero.amountColor,
              fontSize: geometry.amountFontSize,
              lineHeight: lineHeightFor(geometry.amountFontSize),
            }}
          >
            {hero.amountValue}
          </Typography>
          {hero.amountCode === undefined ? undefined : (
            <Typography
              allowFontScaling={false}
              className="font-sora-semibold"
              style={{
                flexShrink: 0,
                color: hero.amountColor,
                opacity: DETAIL_HERO_CODE_OPACITY,
                fontSize: geometry.codeFontSize,
                lineHeight: lineHeightFor(geometry.codeFontSize),
              }}
            >
              {hero.amountCode}
            </Typography>
          )}
        </View>

        {hero.bar === undefined ? undefined : (
          // No overflow clip: the tick overhangs the track.
          <View
            className="bg-foreground/12"
            style={{
              marginTop: DETAIL_HERO_BAR_GAP,
              height: DETAIL_HERO_BAR_HEIGHT,
              borderRadius: DETAIL_HERO_BAR_RADIUS,
            }}
          >
            <View
              style={{
                width: sharePercent(hero.bar.share),
                height: DETAIL_HERO_BAR_HEIGHT,
                borderRadius: DETAIL_HERO_BAR_RADIUS,
                backgroundColor: hero.bar.color,
              }}
            />
            {hero.bar.tickShare === undefined ? undefined : (
              <View
                className="bg-foreground/80"
                style={{
                  position: 'absolute',
                  left: sharePercent(hero.bar.tickShare),
                  top: -DETAIL_HERO_BAR_TICK_OVERHANG,
                  width: DETAIL_HERO_BAR_TICK_WIDTH,
                  height: DETAIL_HERO_BAR_HEIGHT + 2 * DETAIL_HERO_BAR_TICK_OVERHANG,
                  borderRadius: DETAIL_HERO_BAR_TICK_RADIUS,
                }}
              />
            )}
          </View>
        )}

        <Typography
          allowFontScaling={false}
          numberOfLines={1}
          className="font-inter text-foreground/55"
          style={{
            marginTop:
              hero.bar === undefined ? DETAIL_HERO_CAPTION_GAP : DETAIL_HERO_BAR_CAPTION_GAP,
            fontSize: geometry.captionFontSize,
            lineHeight: lineHeightFor(geometry.captionFontSize),
          }}
        >
          {hero.caption}
        </Typography>
      </View>
    </HeroShell>
  );
}
