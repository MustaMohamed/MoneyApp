import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { cn, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/theme';

import {
  resolveStatusTrack,
  STATUS_GLYPH_BOX,
  STATUS_IDLE_DOT,
  STATUS_TRACK_LINE_HEIGHT,
} from './onboarding_shell.geometry';

export interface OnboardingStatusTrackProps {
  /** Idle copy; the track is never empty. */
  footnote: string;
  /** When set, replaces the footnote in the identical box. */
  message?: string;
}

/** Idle hugs one footnote line; an error may wrap to two, growing the footer upward — the CTA below never moves. */
export function OnboardingStatusTrack({ footnote, message }: OnboardingStatusTrackProps) {
  const model = resolveStatusTrack(footnote, message);

  return (
    <View
      style={{
        minHeight: STATUS_TRACK_LINE_HEIGHT,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.xs,
      }}
      {...model.a11y}
    >
      <View
        style={{
          width: STATUS_GLYPH_BOX,
          height: STATUS_TRACK_LINE_HEIGHT,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {model.tone === 'error' ? (
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={STATUS_GLYPH_BOX}
            color={Colors.dark.negative}
          />
        ) : (
          <View
            className="bg-content-secondary"
            style={{
              width: STATUS_IDLE_DOT,
              height: STATUS_IDLE_DOT,
              borderRadius: STATUS_IDLE_DOT / 2,
            }}
          />
        )}
      </View>
      <Typography
        numberOfLines={2}
        style={{ fontSize: Type.caption, lineHeight: STATUS_TRACK_LINE_HEIGHT, flex: 1 }}
        className={cn(model.tone === 'error' ? 'text-danger' : 'text-content-secondary')}
      >
        {model.text}
      </Typography>
    </View>
  );
}
