import { Typography } from 'heroui-native';
import React from 'react';
import { useWindowDimensions, View } from 'react-native';

import { DisplayHeadline } from '@/components/ui/display_headline';
import {
  DISPLAY_HEADLINE_MAX_FONT_SCALE,
  resolveDisplayHeadlineTextStyle,
} from '@/components/ui/display_headline.geometry';
import { Strings } from '@/constants/strings';
import { Spacing, Type } from '@/constants/theme';
import {
  Eyebrow,
  GoldRule,
} from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';

/**
 * Block 1 — eyebrow, gold rule, the two matched headline lines
 * (mockup.html:1036-1042). Line 1 is a plain RN `Text` drawn from the same
 * geometry resolver as line 2's SVG, with `allowFontScaling={false}`, so the
 * two lines scale linearly and identically (MA-010 decision D3) — the fix
 * for the 5.52dp native-vs-linear divergence MA-002 deferred.
 *
 * No `style` prop reaches `DisplayHeadline`, and no `gap`/margin sits
 * between the two lines (MA-010 decision D1): the component's own negative
 * `topInset` is what makes the SVG line occupy exactly one 1.05 line box
 * under line 1. Spacing above the headline is carried by this block's own
 * container, not by the headline component.
 */
export function WelcomeHeadline() {
  const { fontScale } = useWindowDimensions();
  const line1Style = resolveDisplayHeadlineTextStyle(
    Type.display,
    fontScale,
    DISPLAY_HEADLINE_MAX_FONT_SCALE,
  );

  return (
    <View>
      <Eyebrow label={Strings.n1Eyebrow} />
      <View style={{ marginTop: Spacing.xs }}>
        <GoldRule />
      </View>
      <View style={{ marginTop: Spacing.sm }}>
        <Typography
          allowFontScaling={false}
          className="text-foreground font-sora-bold"
          style={{
            fontSize: line1Style.fontSize,
            lineHeight: line1Style.lineHeight,
            letterSpacing: line1Style.letterSpacing,
          }}
        >
          {Strings.n1HeadlineLine1}
        </Typography>
        <DisplayHeadline maxFontScale={DISPLAY_HEADLINE_MAX_FONT_SCALE}>
          {Strings.n1HeadlineLine2}
        </DisplayHeadline>
      </View>
    </View>
  );
}
