import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { StatusTrack } from '@/components/ui/status_track';
import { Spacing } from '@/constants/theme';

import { ONBOARDING_SHELL_TRACKS } from './onboarding_shell.geometry';

export interface OnboardingFooterProps {
  footnote: string;
  message?: string;
  cta: ReactNode;
}

/** The CTA slot equals HeroUI's own 48 and never resizes — the zero-shift contract on the button (spec.md § Known disagreements 6). */
export function OnboardingFooter({ footnote, message, cta }: OnboardingFooterProps) {
  return (
    <View
      className="border-separator border-t"
      style={{ paddingTop: Spacing.xxs, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs }}
    >
      <StatusTrack footnote={footnote} message={message} />
      <View style={{ height: Spacing.xxs }} />
      <View style={{ height: ONBOARDING_SHELL_TRACKS.cta, justifyContent: 'center' }}>{cta}</View>
    </View>
  );
}
