import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

import {
  HERO_GLOW_DEFAULT_COLOR,
  HERO_GLOW_DEFAULT_OPACITY,
  HERO_GRADIENT_COLORS,
  HERO_GRADIENT_END,
  HERO_GRADIENT_START,
  heroGlowStyle,
} from './hero_gradient';

type EnteringAnimation = React.ComponentProps<typeof Animated.View>['entering'];

/** Stroke colour and opacity take no `className`; one hero per screen, so the id is unique. */
export function HeroGridTexture() {
  return (
    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <Pattern id="hero-shell-grid" width="26" height="26" patternUnits="userSpaceOnUse">
          <Path d="M 26 0 L 0 0 0 26" fill="none" stroke="#FFFFFF" strokeWidth="1" opacity="0.03" />
        </Pattern>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#hero-shell-grid)" />
    </Svg>
  );
}

export interface HeroShellProps {
  children: React.ReactNode;
  /** Corner-glow tint. Default: brand gold (matches the dashboard hero). */
  glowColor?: string;
  /** Corner-glow opacity. Default 0.18 (dashboard). */
  glowOpacity?: number;
  /** When set, the shell is a button (Pressable). */
  onPress?: () => void;
  accessibilityLabel?: string;
  /** Frame override, e.g. `{ marginHorizontal: 0 }` when the parent already insets the hero. */
  style?: StyleProp<ViewStyle>;
  /** Reanimated entering animation (e.g. the commitment hero's `heroEntering`). */
  entering?: EnteringAnimation;
}

// Uniwind mishandles `className` on `Animated.View`; the 16s mirror `mx-4 mt-4 rounded-2xl`.
const frameStyle: ViewStyle = {
  marginHorizontal: 16,
  marginTop: 16,
  borderWidth: 1,
  borderColor: Colors.dark.border,
  borderRadius: 16,
  overflow: 'hidden',
  borderCurve: 'continuous',
};

export function HeroShell({
  children,
  glowColor = HERO_GLOW_DEFAULT_COLOR,
  glowOpacity = HERO_GLOW_DEFAULT_OPACITY,
  onPress,
  accessibilityLabel,
  style,
  entering,
}: HeroShellProps) {
  const card = (
    <Animated.View entering={entering} style={[frameStyle, style]}>
      <LinearGradient
        colors={HERO_GRADIENT_COLORS}
        start={HERO_GRADIENT_START}
        end={HERO_GRADIENT_END}
        style={StyleSheet.absoluteFill}
      />
      <HeroGridTexture />
      <View
        pointerEvents="none"
        style={heroGlowStyle({
          size: ms(160),
          offset: ms(40),
          color: glowColor,
          opacity: glowOpacity,
        })}
      />
      {children}
    </Animated.View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
      >
        {card}
      </Pressable>
    );
  }
  return card;
}
