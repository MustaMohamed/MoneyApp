import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Type, lineHeightFor } from '@/constants/theme';
import { ms } from '@/utils/responsive';

/** mockup.html:403, `.b-rule`. */
export const GoldRule = React.memo(function GoldRule() {
  return (
    <View className="bg-accent" style={{ width: ms(34), height: ms(3), borderRadius: ms(2) }} />
  );
});

/** mockup.html:387, `.t-over { letter-spacing: 0.14em }`. */
export const BROADSHEET_EYEBROW_TRACKING_EM = 0.14;

/** mockup.html:411, `.b-headline { letter-spacing: -0.01em }`. */
export const BROADSHEET_HEADLINE_TRACKING_EM = -0.01;

export interface EyebrowProps {
  label: string;
}

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

/** mockup.html:404-408, `.b-ghost`; negative offsets bleed past the top-right corner. */
export const GhostNumeral = React.memo(function GhostNumeral({ value }: GhostNumeralProps) {
  return (
    <Typography
      className="text-foreground font-sora-extrabold"
      style={{
        position: 'absolute',
        top: -ms(30),
        right: -ms(16),
        // oxlint-disable-next-line moneyapp/font-size-pairs-line-height -- 1:1 lineHeight is deliberate: lineHeightFor's 1.3 ratio would add vertical space that breaks the "bleed past the top-right corner" positioning documented above.
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
