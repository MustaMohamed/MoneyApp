import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { HeroShell } from '@/components/ui/hero_shell';
import { StatusBadge } from '@/components/ui/status_badge';
import { Strings } from '@/constants/strings';
import { Radius, Size, lineHeightFor } from '@/constants/theme';

import type { TransactionDetailHero } from '../detail.helpers';
import {
  DETAIL_HERO_BADGE_GAP,
  DETAIL_HERO_CAPTION_GAP,
  DETAIL_HERO_CODE_GAP,
  DETAIL_HERO_CODE_OPACITY,
  DETAIL_HERO_OVERLINE_GAP,
  DETAIL_HERO_PADDING,
  DETAIL_HERO_SHELL_STYLE,
  DETAIL_HERO_TILE_GAP,
  resolveDetailHeroGeometry,
} from './detail.geometry';

interface Props {
  hero: TransactionDetailHero;
}

export function DetailHero({ hero }: Props): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  const geometry = resolveDetailHeroGeometry(fontScale);

  return (
    <HeroShell glowColor={hero.tileColor} style={DETAIL_HERO_SHELL_STYLE}>
      <View
        testID="transaction-detail-hero"
        style={{ padding: DETAIL_HERO_PADDING, height: geometry.height }}
      >
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
            <View style={{ alignSelf: 'flex-start', marginTop: DETAIL_HERO_BADGE_GAP }}>
              <StatusBadge
                label={hero.typeLabel}
                fill={hero.badgeFill}
                foreground={hero.badgeForeground}
                icon={hero.typeIcon}
                size="md"
                fontScale={fontScale}
              />
            </View>
          </View>
        </View>

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
          {Strings.detailAmountOverline}
        </Typography>

        {/* A container `gap`, not a `marginLeft` on a nested Text: RN Android drops margins on inline text. */}
        <View
          accessible
          accessibilityLabel={hero.amountAccessibilityLabel}
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: DETAIL_HERO_CODE_GAP,
            height: geometry.amountHeight,
          }}
        >
          <Typography
            allowFontScaling={false}
            numberOfLines={1}
            adjustsFontSizeToFit
            className="font-sora-bold tabular-nums"
            style={{
              flexShrink: 1,
              color: hero.typeColor,
              fontSize: geometry.amountFontSize,
              lineHeight: lineHeightFor(geometry.amountFontSize),
            }}
          >
            {hero.amountValue}
          </Typography>
          <Typography
            allowFontScaling={false}
            className="font-sora-semibold"
            style={{
              flexShrink: 0,
              color: hero.typeColor,
              opacity: DETAIL_HERO_CODE_OPACITY,
              fontSize: geometry.codeFontSize,
              lineHeight: lineHeightFor(geometry.codeFontSize),
            }}
          >
            {hero.amountCode}
          </Typography>
        </View>

        <Typography
          allowFontScaling={false}
          numberOfLines={1}
          className="font-inter text-foreground/55"
          style={{
            marginTop: DETAIL_HERO_CAPTION_GAP,
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
