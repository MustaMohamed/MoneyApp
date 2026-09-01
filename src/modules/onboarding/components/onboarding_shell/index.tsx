import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';

import { Screen } from '@/components/ui/screen';
import { Colors } from '@/constants/theme';

import { OnboardingFooter } from './onboarding_footer';
import { OnboardingHeader } from './onboarding_header';
import { OnboardingProgressRail } from './onboarding_progress_rail';
import { useKeyboardLiftAnim } from './onboarding_shell.anim';
import type { OnboardingStepIndex } from './onboarding_shell.geometry';

export interface OnboardingShellProps {
  step: OnboardingStepIndex;
  /** Omit for the N1 brand header. */
  title?: string;
  onBack?: () => void;
  /** Idle copy; the status track is never empty. */
  footnote: string;
  /** When set, replaces the footnote in the identical box. */
  statusMessage?: string;
  cta: ReactNode;
  children: ReactNode;
  /** N1's ambient wash, rendered as a sibling behind `Screen`, not inside it. */
  background?: ReactNode;
}

/** `Screen` applies safe-area insets as padding, so a wash inside would start below it. */
export function OnboardingShell({
  step,
  title,
  onBack,
  footnote,
  statusMessage,
  cta,
  children,
  background,
}: OnboardingShellProps) {
  const keyboardLift = useKeyboardLiftAnim();

  return (
    <View style={{ flex: 1 }} className="bg-background">
      {background}
      <Screen style={{ backgroundColor: Colors.shared.transparent }}>
        <OnboardingHeader title={title} onBack={onBack} />
        <OnboardingProgressRail step={step} />
        <View style={{ flex: 1 }}>{children}</View>
        <Animated.View style={keyboardLift}>
          <OnboardingFooter footnote={footnote} message={statusMessage} cta={cta} />
        </Animated.View>
      </Screen>
    </View>
  );
}
