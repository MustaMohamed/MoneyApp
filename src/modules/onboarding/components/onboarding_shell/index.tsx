import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Screen } from '@/components/ui/screen';

import { OnboardingFooter } from './onboarding_footer';
import { OnboardingHeader } from './onboarding_header';
import { OnboardingProgressRail } from './onboarding_progress_rail';
import type { OnboardingStepIndex } from './onboarding_shell.geometry';

export interface OnboardingShellProps {
  step: OnboardingStepIndex;
  /** Omit for the N1 brand header. */
  title?: string;
  onBack?: () => void;
  /** Idle copy. Required — the track is never empty. */
  footnote: string;
  /** When set, replaces the footnote in the identical box. */
  statusMessage?: string;
  cta: ReactNode;
  children: ReactNode;
}

/**
 * The shared chrome for all four onboarding routes: a fixed-height header, a
 * fixed-height progress rail, a flexible content viewport, and a footer built
 * from a permanently mounted status track above the primary action.
 *
 * `cta` is a node rather than a prop bundle so each route keeps the
 * Animated.View it wraps its button in today, and later motion work can
 * change that wrapper without touching the shell.
 */
export function OnboardingShell({
  step,
  title,
  onBack,
  footnote,
  statusMessage,
  cta,
  children,
}: OnboardingShellProps) {
  return (
    <Screen>
      <OnboardingHeader title={title} onBack={onBack} />
      <OnboardingProgressRail step={step} />
      <View style={{ flex: 1 }}>{children}</View>
      <OnboardingFooter footnote={footnote} message={statusMessage} cta={cta} />
    </Screen>
  );
}
