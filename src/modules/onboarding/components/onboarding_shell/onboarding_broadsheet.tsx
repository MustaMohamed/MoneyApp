import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { ms } from '@/utils/responsive';

/**
 * The Broadsheet composition's two shared elements — mockup.html:403 (`.b-
 * rule`) and :404-408 (`.b-ghost`). N1 (MA-010), N3 (MA-011) and N4 (MA-012)
 * all draw them, so they live in the shell folder rather than the welcome
 * screen this task rewrites (MA-010 decision D8).
 */
export function GoldRule() {
  return (
    <View className="bg-accent" style={{ width: ms(34), height: ms(3), borderRadius: ms(2) }} />
  );
}

export interface GhostNumeralProps {
  value: string;
}

/**
 * Canvas, not content — non-scrolling, allowed to bleed past the viewport's
 * top-right corner (MA-010 decision D9), hidden from assistive tech since it
 * carries no information a screen reader could use.
 */
export function GhostNumeral({ value }: GhostNumeralProps) {
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
}
