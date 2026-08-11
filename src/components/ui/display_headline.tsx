import React from 'react';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import { FontFamily, Type } from '@/constants/theme';
import { AcctTokens, GoldTokens } from '@/constants/theme_tokens';

import {
  resolveDisplayHeadlineA11y,
  resolveDisplayHeadlineGeometry,
} from './display_headline.geometry';

/**
 * One id app-wide, the same call `hero_shell.tsx:22` makes for its grid pattern:
 * only one display headline renders per screen, so there is no collision.
 */
const FILL_ID = 'display-headline-fill';

export interface DisplayHeadlineProps {
  /** One line. Callers break lines by rendering two elements, per the mockup. */
  children: string;
  style?: StyleProp<ViewStyle>;
  /** See DISPLAY_HEADLINE_MAX_FONT_SCALE (MA-010 decision D2). Omitted keeps
   * today's uncapped behaviour. */
  maxFontScale?: number;
}

export function DisplayHeadline({ children, style, maxFontScale }: DisplayHeadlineProps) {
  const { fontScale } = useWindowDimensions();
  const g = resolveDisplayHeadlineGeometry(Type.display, fontScale, maxFontScale);
  const a11y = resolveDisplayHeadlineA11y(children);

  return (
    <View style={[{ height: g.boxHeight, marginTop: g.topInset }, style]} {...a11y.container}>
      <Svg width="100%" height={g.boxHeight} {...a11y.graphic}>
        <Defs>
          {/* Mockup § B `#grad-headline`: gold held through "Finally", turning
              teal on "clear.". gradientUnits defaults to objectBoundingBox, so
              the ramp spans the text's own box — do not pass x1/x2. */}
          <LinearGradient id={FILL_ID}>
            <Stop offset="0" stopColor={GoldTokens[400]} />
            <Stop offset="0.45" stopColor={GoldTokens[500]} />
            <Stop offset="1" stopColor={AcctTokens.nile.soft} />
          </LinearGradient>
        </Defs>
        {/* No fontWeight, ever. The family name already carries the weight.
            Passing one (700, or the string "bold") trips absoluteFontWeight>=550
            at TSpanView.java:1128, which asks ReactFontManager for the BOLD
            style slot at :1177 — but expo-font only ever fills the NORMAL slot
            (FontLoaderModule.kt:59), so the lookup misses and Android silently
            hands back Roboto. Green CI, wrong typeface, on the app's first
            screen. Omitting the prop leaves absoluteFontWeight at its 400
            default (FontData.java:119-120) and the NORMAL slot hits. */}
        <SvgText
          x={0}
          y={g.baselineY}
          fontFamily={FontFamily.soraBold}
          fontSize={g.fontSize}
          letterSpacing={g.letterSpacing}
          fill={`url(#${FILL_ID})`}
        >
          {children}
        </SvgText>
      </Svg>
    </View>
  );
}
