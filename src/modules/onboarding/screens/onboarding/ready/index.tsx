import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { HeroShell } from '@/components/ui/hero_shell';
import { ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { Spacing } from '@/constants/theme';
import { OnboardingShell } from '@/modules/onboarding/components/onboarding_shell';
import {
  Eyebrow,
  GoldRule,
} from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';

import { ReadyHeroCard } from './components/ready_hero_card';
import { ReadySummaryRows } from './components/ready_summary_rows';
import { useReadyAnim } from './ready.anim';
import { N4_BODY_TEXT_STYLE, N4_HEADLINE_TEXT_STYLE, N4_HERO_FRAME_STYLE } from './ready.geometry';
import { useReady } from './ready.hook';

/**
 * N4 Ready — mockup § F, frames F1-F9.
 *
 * No `GhostNumeral`: mockup.html:2835-2836 rules that N4 draws the rule and the
 * eyebrow without it, "because by then the number is the biggest thing on
 * screen".
 *
 * There is no early return anywhere in this component and no loading branch:
 * the summary is derived at render from store state, so the failed-completion
 * state (F9) is the same screen with a message in the shell's status track —
 * the hero does not blank, skeleton or recompute, and the same CTA retries.
 */
export default function ReadyScreen() {
  const {
    state: { summary, baseCurrency, completing, statusMessage },
    handleComplete,
    onBack,
  } = useReady();
  const { introEntering, heroEntering, summaryEntering } = useReadyAnim();

  return (
    <OnboardingShell
      step={4}
      title={Strings.n4HeaderTitle}
      onBack={() => {
        // onBack catches its own failure inside runOnboardingTransition and
        // resolves; void discards no rejection.
        void onBack();
      }}
      footnote={Strings.n4Footnote}
      statusMessage={statusMessage}
      cta={
        // Not one of the three rise blocks — mockup.html:2325/2332/2342 mark
        // exactly three, and the footer is a fixed track (MA-010 D11).
        <Button
          variant="primary"
          label={Strings.n4Cta}
          onPress={() => {
            void handleComplete();
          }}
          isDisabled={completing}
          isLoading={completing}
          loadingLabel={Strings.n4CtaBusy}
        />
      }
    >
      <ScreenScroll
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}
      >
        {/* Block 1 — eyebrow, gold rule, headline, body. */}
        <Animated.View entering={introEntering}>
          <Eyebrow label={Strings.n4Eyebrow} />

          <View style={{ marginTop: Spacing.xs }}>
            <GoldRule />
          </View>

          <Typography
            className="text-foreground font-sora-bold"
            style={[N4_HEADLINE_TEXT_STYLE, { marginTop: Spacing.xs }]}
          >
            {Strings.n4Headline}
          </Typography>

          <Typography
            className="text-content-secondary font-inter"
            style={[N4_BODY_TEXT_STYLE, { marginTop: Spacing.xs }]}
          >
            {Strings.n4Body}
          </Typography>
        </Animated.View>

        {/* Block 2 — the hero card, on the shared gradient/grid/glow shell. */}
        <HeroShell entering={heroEntering} style={N4_HERO_FRAME_STYLE}>
          <ReadyHeroCard summary={summary} baseCurrency={baseCurrency} />
        </HeroShell>

        {/* Block 3 — the three-row confirmation group. */}
        <Animated.View entering={summaryEntering} style={{ marginTop: Spacing.md }}>
          <ReadySummaryRows accountCount={summary.accountCount} baseCurrency={baseCurrency} />
        </Animated.View>
      </ScreenScroll>
    </OnboardingShell>
  );
}
