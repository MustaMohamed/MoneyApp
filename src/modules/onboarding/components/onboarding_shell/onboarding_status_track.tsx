import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { cn, Typography } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Colors, Spacing, Type } from '@/constants/theme';

import {
  ONBOARDING_SHELL_TRACKS,
  resolveStatusTrack,
  STATUS_GLYPH_BOX,
  STATUS_IDLE_DOT,
  STATUS_TRACK_LINE_HEIGHT,
} from './onboarding_shell.geometry';

export interface OnboardingStatusTrackProps {
  /** Idle copy. Required — the track is never empty. */
  footnote: string;
  /** When set, replaces the footnote in the identical box. */
  message?: string;
}

/**
 * Always mounted, never empty. Idle carries the screen's footnote; a failure
 * replaces that footnote in the identical box. overflow: hidden + numberOfLines
 * are what makes the box unmoveable — at large OS font scales the second line
 * clips rather than growing the footer, which is the fixed-track reading of
 * spec.md § "The zero-shift contract" (the "grows into the viewport" sentence
 * governs the field message rail, MA-009's, not this track).
 */
export function OnboardingStatusTrack({ footnote, message }: OnboardingStatusTrackProps) {
  const model = resolveStatusTrack(footnote, message);

  return (
    <View
      style={{
        height: ONBOARDING_SHELL_TRACKS.statusTrack,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: Spacing.xs,
        overflow: 'hidden',
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
