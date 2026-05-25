import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated from 'react-native-reanimated';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';

import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

type EnteringAnimation = React.ComponentProps<typeof Animated.View>['entering'];

/**
 * HeroGridTexture — faint 26px grid overlay shared by every hero. The SVG
 * stroke colour/opacity is not className-able, so it is an inline literal
 * (the §5/§6 SVG exception). Single pattern id app-wide: only one hero
 * renders per screen, so there is no id collision.
 */
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
  /**
   * Extend/override the frame style. The frame defaults to mx16/mt16/border/
   * rounded-16/overflow-hidden; pass e.g. `{ marginHorizontal: 0 }` when the
   * parent container already insets the hero.
   */
  style?: StyleProp<ViewStyle>;
  /** Reanimated entering animation (e.g. the commitment hero's `heroEntering`). */
  entering?: EnteringAnimation;
}

/**
 * Frame styled via `style` (not className): Uniwind does not reliably process
 * `className` on `Animated.View` (the commitment hero deliberately used inline
 * style for this reason). Literal 16s match the canonical dashboard hero's
 * `mx-4 mt-4 rounded-2xl` Tailwind values exactly.
 */
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
  glowColor = Colors.dark.gold,
  glowOpacity = 0.18,
  onPress,
  accessibilityLabel,
  style,
  entering,
}: HeroShellProps) {
  const card = (
    <Animated.View entering={entering} style={[frameStyle, style]}>
      <LinearGradient
        colors={[Colors.shared.heroGrad1, Colors.shared.heroGrad2, Colors.shared.heroGrad3]}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <HeroGridTexture />
      <View
        pointerEvents="none"
        style={{
          position: 'absolute',
          top: -ms(40),
          right: -ms(40),
          width: ms(160),
          height: ms(160),
          borderRadius: ms(80),
          backgroundColor: glowColor,
          opacity: glowOpacity,
        }}
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
