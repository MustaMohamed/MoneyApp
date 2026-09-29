import React, { type ReactNode } from 'react';
import { View } from 'react-native';

import { Size, Spacing } from '@/constants/theme';

import { StatusTrack } from './status_track';

export interface CtaFooterProps {
  footnote: string;
  message?: string;
  cta: ReactNode;
}

/** The CTA slot is fixed at HeroUI's own button height, 48, so no state of the button shifts the footer. */
export function CtaFooter({ footnote, message, cta }: CtaFooterProps) {
  return (
    <View
      className="border-separator border-t"
      style={{ paddingTop: Spacing.xxs, paddingHorizontal: Spacing.md, paddingBottom: Spacing.xs }}
    >
      <StatusTrack footnote={footnote} message={message} />
      <View style={{ height: Spacing.xxs }} />
      <View style={{ height: Size.ctaFooterTrack, justifyContent: 'center' }}>{cta}</View>
    </View>
  );
}
