import React from 'react';
import { useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import { FontFamily, Type } from '@/constants/theme';
import { AcctTokens, GoldTokens } from '@/constants/theme_tokens';

import {
  resolveDisplayHeadlineA11y,
  resolveDisplayHeadlineGeometry,
} from './display_headline.geometry';

/** One id app-wide: only one display headline renders per screen, so ids cannot collide. */
const FILL_ID = 'display-headline-fill';

export interface DisplayHeadlineProps {
  /** One line. Callers break lines by rendering two elements. */
  children: string;
  style?: StyleProp<ViewStyle>;
  /** Omitted leaves scaling uncapped; see `DISPLAY_HEADLINE_MAX_FONT_SCALE`. */
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
          {/* Default `gradientUnits` spans the text's own box; do not pass x1/x2. */}
          <LinearGradient id={FILL_ID}>
            <Stop offset="0" stopColor={GoldTokens[400]} />
            <Stop offset="0.45" stopColor={GoldTokens[500]} />
            <Stop offset="1" stopColor={AcctTokens.nile.soft} />
          </LinearGradient>
        </Defs>
        {/* No `fontWeight`: >=550 picks Android's empty BOLD slot and yields Roboto. */}
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
