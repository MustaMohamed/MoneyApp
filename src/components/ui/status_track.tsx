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
} from './status_track.geometry';

export interface StatusTrackProps {
  /** Idle copy; without it the idle track is one empty line. */
  footnote?: string;
  /** When set, replaces the footnote in the identical box. */
  message?: string;
  testID?: string;
}

/** Idle hugs one line; a message or footnote wraps to every line it needs, growing the footer upward — the CTA below never moves. */
export function StatusTrack({ footnote, message, testID }: StatusTrackProps) {
  const model = resolveStatusTrack(footnote, message);

  return (
    <View
      testID={testID}
      collapsable={false}
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
        {model.glyph === 'alert' ? (
          <MaterialCommunityIcons
            name="alert-circle-outline"
            size={STATUS_GLYPH_BOX}
            color={Colors.dark.negative}
          />
        ) : null}
        {model.glyph === 'dot' ? (
          <View
            className="bg-content-secondary"
            style={{
              width: STATUS_IDLE_DOT,
              height: STATUS_IDLE_DOT,
              borderRadius: STATUS_IDLE_DOT / 2,
            }}
          />
        ) : null}
      </View>
      <Typography
        // oxlint-disable-next-line moneyapp/font-size-pairs-line-height -- STATUS_TRACK_LINE_HEIGHT is Math.floor(Size.statusTrack / 2) (src/components/ui/status_track.geometry.ts:5), the track's one-line box at any device scale; lineHeightFor's 1.3 ratio would not equal it.
        style={{ fontSize: Type.caption, lineHeight: STATUS_TRACK_LINE_HEIGHT, flex: 1 }}
        className={cn(model.tone === 'error' ? 'text-danger' : 'text-content-secondary')}
      >
        {model.text}
      </Typography>
    </View>
  );
}
