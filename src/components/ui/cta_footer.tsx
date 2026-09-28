import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Size, Spacing } from '@/constants/theme';

import { StatusTrack } from './status_track';

export interface CtaFooterProps {
  footnote: string;
  message?: string;
  cta: ReactNode;
}

/** The CTA slot equals HeroUI's own 48 and never resizes — the zero-shift contract on the button (spec.md § Known disagreements 6). */
export function CtaFooter({ footnote, message, cta }: CtaFooterProps) {
  return (
    <View
      className="border-separator border-t"
      style={{ paddingTop: Spacing.xxs, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs }}
    >
      <StatusTrack footnote={footnote} message={message} />
      <View style={{ height: Spacing.xxs }} />
      <View style={{ height: Size.onboardingCtaTrack, justifyContent: 'center' }}>{cta}</View>
    </View>
  );
}
