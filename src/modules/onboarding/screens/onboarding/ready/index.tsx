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

// No early return and no loading branch: a failed completion is this same screen with a status.
export default function ReadyScreen() {
  const {
    state: { summary, completing, busy, statusMessage },
    handleComplete,
    onBack,
  } = useReady();
  const { introEntering, heroEntering, summaryEntering } = useReadyAnim();

  return (
    <OnboardingShell
      step={4}
      title={Strings.n4HeaderTitle}
      onBack={() => {
        // `onBack` catches its own failure and resolves, so `void` discards no rejection.
        void onBack();
      }}
      footnote={Strings.n4Footnote}
      statusMessage={statusMessage}
      cta={
        <Button
          variant="primary"
          flat
          label={Strings.n4Cta}
          onPress={() => {
            void handleComplete();
          }}
          // `busy` also rises on a back transition; the spinner is the completion write alone.
          isDisabled={completing || busy}
          isLoading={completing}
          loadingLabel={Strings.n4CtaBusy}
        />
      }
    >
      <ScreenScroll
        contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}
      >
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

        <HeroShell entering={heroEntering} style={N4_HERO_FRAME_STYLE}>
          <ReadyHeroCard summary={summary} />
        </HeroShell>

        <Animated.View entering={summaryEntering} style={{ marginTop: Spacing.md }}>
          <ReadySummaryRows
            accountCount={summary.accountCount}
            baseCurrency={summary.baseCurrency}
          />
        </Animated.View>
      </ScreenScroll>
    </OnboardingShell>
  );
}
