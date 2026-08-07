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

/**
 * Status track above the primary action. The CTA slot is
 * ONBOARDING_SHELL_TRACKS.cta (52) while the button drawn inside it stays
 * HeroUI's own 48 — see spec.md § "Known design/codebase disagreements" item
 * 6. The footer reserves the slot and centres the button in it, which is what
 * actually keeps the zero-shift contract: the slot never resizes.
 */
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
