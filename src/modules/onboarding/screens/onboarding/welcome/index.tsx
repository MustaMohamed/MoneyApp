import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LinearGradient } from 'expo-linear-gradient';
import { Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Button } from '@/components/ui/button';
import { ScreenScroll } from '@/components/ui/screen';
import { Strings } from '@/constants/strings';
import { Colors, Radius, Size, Spacing, Type, lineHeightFor } from '@/constants/theme';
import { OnboardingShell } from '@/modules/onboarding/components/onboarding_shell';
import { OnboardingAmbientWash } from '@/modules/onboarding/components/onboarding_shell/onboarding_ambient_wash';
import { GhostNumeral } from '@/modules/onboarding/components/onboarding_shell/onboarding_broadsheet';

import { CurrencyChoice } from './components/currency_choice';
import { WelcomeHeadline } from './components/welcome_headline';
import { useWelcomeAnim } from './welcome.anim';
import { N1_BODY_RULE_RADIUS, N1_BODY_RULE_WIDTH } from './welcome.geometry';
import { useWelcome } from './welcome.hook';

export default function WelcomeScreen() {
  const { state, setSelected, onContinue } = useWelcome();
  const { headlineEntering, bodyEntering, currencyEntering, trustEntering } = useWelcomeAnim();

  return (
    <OnboardingShell
      step={1}
      footnote={Strings.n1Footnote}
      statusMessage={state.statusMessage}
      background={<OnboardingAmbientWash />}
      cta={
        <Button
          variant="primary"
          label={Strings.n1Cta}
          loadingLabel={Strings.n1CtaBusy}
          isDisabled={state.busy}
          isLoading={state.busy}
          onPress={() => {
            // onContinue catches its own failure inside
            // runOnboardingTransition and resolves; void discards no
            // rejection.
            void onContinue();
          }}
        />
      }
    >
      <>
        <GhostNumeral value={Strings.n1GhostNumeral} />
        <ScreenScroll
          contentContainerStyle={{ paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}
        >
          <Animated.View entering={headlineEntering}>
            <WelcomeHeadline />
          </Animated.View>

          <Animated.View
            entering={bodyEntering}
            style={{
              flexDirection: 'row',
              alignItems: 'stretch',
              gap: Spacing.sm,
              marginTop: Spacing.sm,
            }}
          >
            <LinearGradient
              colors={[Colors.dark.border, Colors.shared.transparent]}
              start={{ x: 0, y: 0 }}
              end={{ x: 0, y: 1 }}
              style={{ width: N1_BODY_RULE_WIDTH, borderRadius: N1_BODY_RULE_RADIUS }}
            />
            <Typography
              className="text-foreground font-inter"
              style={{ flex: 1, fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
            >
              {Strings.n1Body}
            </Typography>
          </Animated.View>

          <Animated.View entering={currencyEntering} style={{ marginTop: Spacing.lg }}>
            <CurrencyChoice selected={state.selected} onSelect={setSelected} />
          </Animated.View>

          <Animated.View
            entering={trustEntering}
            className="border-separator bg-surface"
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: Spacing.sm,
              borderWidth: 1,
              borderRadius: Radius.md,
              padding: Spacing.sm,
              marginTop: Spacing.lg,
            }}
          >
            <View
              className="bg-accent/15"
              style={{
                width: Size.securityIconBox,
                height: Size.securityIconBox,
                borderRadius: Radius.sm,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <MaterialCommunityIcons
                name="lock-outline"
                size={Size.iconMd}
                color={Colors.dark.gold}
              />
            </View>
            <Typography
              className="text-foreground font-inter"
              style={{ flex: 1, fontSize: Type.caption, lineHeight: lineHeightFor(Type.caption) }}
            >
              {Strings.n1Trust}
            </Typography>
          </Animated.View>
        </ScreenScroll>
      </>
    </OnboardingShell>
  );
}
