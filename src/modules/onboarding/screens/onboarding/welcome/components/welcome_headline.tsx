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

// Line 1 uses line 2's geometry resolver with font scaling off, so the two lines stay matched.
// No gap or margin between the lines: `DisplayHeadline`'s negative `topInset` owns the spacing.
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
