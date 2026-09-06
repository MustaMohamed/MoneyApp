import React, { useId } from 'react';
import Svg, { Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';

export interface HeroGlowProps {
  size: number;
  offset: number;
}

/** A centred circle, accent@46% at the middle fading to transparent at its own edge, so no footprint shows (mockup `.tile.on::before`, mockup.html:516-520). */
export function HeroGlow({ size, offset }: HeroGlowProps) {
  const id = useId();
  return (
    <Svg
      pointerEvents="none"
      width={size}
      height={size}
      style={{ position: 'absolute', top: -offset, right: -offset }}
    >
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={Colors.dark.gold} stopOpacity={0.46} />
          <Stop offset="1" stopColor={Colors.dark.gold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx={size / 2} cy={size / 2} r={size / 2} fill={`url(#${id})`} />
    </Svg>
  );
}
