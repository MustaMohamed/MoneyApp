import React from 'react';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export interface HeroGlowProps {
  size: number;
  offset: number;
}

/** The corner glow as the mockup draws it — accent@46% radially fading to transparent at 70% (`.tile.on::before`, mockup.html:516-520); the flat `heroGlowStyle` disc's hard edge reads as a disc at tile scale. */
export function HeroGlow({ size, offset }: HeroGlowProps) {
  return (
    <Svg
      pointerEvents="none"
      width={size}
      height={size}
      style={{ position: 'absolute', top: -offset, right: -offset }}
    >
      <Defs>
        <RadialGradient id="heroGlow" cx="34%" cy="34%" r="70%">
          <Stop offset="0" stopColor={Colors.dark.gold} stopOpacity={0.46} />
          <Stop offset="1" stopColor={Colors.dark.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect x={0} y={0} width={size} height={size} fill="url(#heroGlow)" />
    </Svg>
  );
}
