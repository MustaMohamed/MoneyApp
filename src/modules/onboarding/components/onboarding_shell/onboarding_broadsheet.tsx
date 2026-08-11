import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/**
 * The Broadsheet composition's two shared elements — mockup.html:403 (`.b-
 * rule`) and :404-408 (`.b-ghost`). N1 (MA-010), N3 (MA-011) and N4 (MA-012)
 * all draw them, so they live in the shell folder rather than the welcome
 * screen this task rewrites (MA-010 decision D8).
 */
export const GoldRule = React.memo(function GoldRule() {
  return (
    <View className="bg-accent" style={{ width: ms(34), height: ms(3), borderRadius: ms(2) }} />
  );
});

/** mockup.html:387, `.t-over { letter-spacing: 0.14em }`. */
export const BROADSHEET_EYEBROW_TRACKING_EM = 0.14;

export interface EyebrowProps {
  label: string;
}

/**
 * The third Broadsheet element, and the one D8 left behind in the welcome
 * folder. `.t-over` opens the same `t-over → b-rule → b-headline` sequence on
 * B1-B4 and again on F1-F9, so MA-012 draws it too — it belongs beside the
 * rule and the numeral, not beside one consumer of them.
 */
export const Eyebrow = React.memo(function Eyebrow({ label }: EyebrowProps) {
  return (
    <Typography
      className="text-accent font-inter-semibold"
      style={{
        fontSize: Type.overline,
        lineHeight: lineHeightFor(Type.overline),
        letterSpacing: Type.overline * BROADSHEET_EYEBROW_TRACKING_EM,
        textTransform: 'uppercase',
      }}
    >
      {label}
    </Typography>
  );
});

export interface GhostNumeralProps {
  value: string;
}

/**
 * Canvas, not content — non-scrolling, allowed to bleed past the viewport's
 * top-right corner (MA-010 decision D9), hidden from assistive tech since it
 * carries no information a screen reader could use.
 */
export const GhostNumeral = React.memo(function GhostNumeral({ value }: GhostNumeralProps) {
  return (
    <Typography
      className="text-foreground font-sora-extrabold"
      style={{
        position: 'absolute',
        top: -ms(30),
        right: -ms(16),
        fontSize: ms(168),
        lineHeight: ms(168),
        letterSpacing: -ms(6),
        opacity: 0.05,
      }}
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      {value}
    </Typography>
  );
});
