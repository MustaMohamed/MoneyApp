import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Spacing } from '@/constants/theme';

import { ONBOARDING_SHELL_TRACKS } from './onboarding_shell.geometry';
import { OnboardingStatusTrack } from './onboarding_status_track';

export interface OnboardingFooterProps {
  footnote: string;
  message?: string;
  cta: ReactNode;
}

/** Fixed 52 slot (`ONBOARDING_SHELL_TRACKS.cta`) never resizes; the button inside stays 48. */
export function OnboardingFooter({ footnote, message, cta }: OnboardingFooterProps) {
  return (
    <View
      className="border-separator border-t"
      style={{ paddingTop: Spacing.sm, paddingHorizontal: Spacing.md, paddingBottom: Spacing.lg }}
    >
      <OnboardingStatusTrack footnote={footnote} message={message} />
      <View style={{ height: Spacing.sm }} />
      <View style={{ height: ONBOARDING_SHELL_TRACKS.cta, justifyContent: 'center' }}>{cta}</View>
    </View>
  );
}
