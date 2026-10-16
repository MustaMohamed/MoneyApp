import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { CtaFooter } from '@/components/ui/cta_footer';
import { useKeyboardLiftAnim } from '@/components/ui/keyboard_lift.anim';
import { Screen } from '@/components/ui/screen';
import { Colors } from '@/constants/theme';

import { OnboardingHeader, type OnboardingHeaderProps } from './onboarding_header';
import { OnboardingProgressRail } from './onboarding_progress_rail';
import type { OnboardingStepIndex } from './onboarding_shell.geometry';

interface OnboardingShellBaseProps {
  step: OnboardingStepIndex;
  /** Idle copy; the status track is never empty. */
  footnote: string;
  /** When set, replaces the footnote in the identical box. */
  statusMessage?: string;
  cta: ReactNode;
  children: ReactNode;
  /** N1's ambient wash, rendered as a sibling behind `Screen`, not inside it. */
  background?: ReactNode;
}

export type OnboardingShellProps = OnboardingShellBaseProps & OnboardingHeaderProps;

/** `Screen` applies safe-area insets as padding, so a wash inside would start below it. */
export function OnboardingShell(props: OnboardingShellProps) {
  const { step, footnote, statusMessage, cta, children, background } = props;
  const keyboardLift = useKeyboardLiftAnim();

  return (
    <View style={{ flex: 1 }} className="bg-background">
      {background}
      <Screen style={{ backgroundColor: Colors.shared.transparent }}>
        {props.title !== undefined ? (
          <OnboardingHeader title={props.title} onBack={props.onBack} />
        ) : (
          <OnboardingHeader />
        )}
        <OnboardingProgressRail step={step} />
        <View style={{ flex: 1 }}>{children}</View>
        <Animated.View style={keyboardLift}>
          <CtaFooter footnote={footnote} message={statusMessage} cta={cta} />
        </Animated.View>
      </Screen>
    </View>
  );
}
