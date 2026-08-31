import React from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { AcctTokens } from '@/constants/theme_tokens';

import { resolveAmbientWashGeometry } from './onboarding_shell.geometry';

/** mockup.html:428-433 (`.aurora`); the shell renders it outside Screen's padded box. */
export const OnboardingAmbientWash = React.memo(function OnboardingAmbientWash() {
  const { width, height } = useWindowDimensions();
  const { gold, teal } = resolveAmbientWashGeometry(width, height);

  return (
    <Svg
      width={width}
      height={height}
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Defs>
        {/* mockup.html:428, "rgba(212,164,76,.15), transparent 60%" */}
        <RadialGradient
          id="ambient-wash-gold"
          gradientUnits="userSpaceOnUse"
          cx={gold.cx}
          cy={gold.cy}
          rx={gold.rx}
          ry={gold.ry}
        >
          <Stop offset="0" stopColor={Colors.dark.gold} stopOpacity={0.15} />
          <Stop offset="0.6" stopColor={Colors.dark.gold} stopOpacity={0} />
        </RadialGradient>
        {/* mockup.html:429, "rgba(45,125,110,.13), transparent 62%" */}
        <RadialGradient
          id="ambient-wash-teal"
          gradientUnits="userSpaceOnUse"
          cx={teal.cx}
          cy={teal.cy}
          rx={teal.rx}
          ry={teal.ry}
        >
          <Stop offset="0" stopColor={AcctTokens.nile.rich} stopOpacity={0.13} />
          <Stop offset="0.62" stopColor={AcctTokens.nile.rich} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* No base rect: the host View paints bg-background underneath both. */}
      <Rect x={0} y={0} width={width} height={height} fill="url(#ambient-wash-gold)" />
      <Rect x={0} y={0} width={width} height={height} fill="url(#ambient-wash-teal)" />
    </Svg>
  );
});
