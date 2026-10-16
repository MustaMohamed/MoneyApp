import { Card } from 'heroui-native';
import React from 'react';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { LetterSpacing, Type, lineHeightFor } from '@/constants/theme';

import { DETAIL_NOTE_MIN_HEIGHT } from './detail.geometry';

interface Props {
  note: string | null;
}

/** Canvas `.note-card`: the label in capitals over the note, which wraps whole. */
export function NoteCard({ note }: Props): React.ReactElement | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;

  return (
    <Card
      testID="detail-note-card"
      className="border-separator mx-4 mt-4 rounded-2xl border px-4 py-3"
      style={{ minHeight: DETAIL_NOTE_MIN_HEIGHT, boxShadow: 'none' }}
    >
      <Text
        className="font-inter-semibold text-muted uppercase"
        style={{
          fontSize: Type.overline,
          lineHeight: lineHeightFor(Type.overline),
          letterSpacing: LetterSpacing.eyebrow,
        }}
      >
        {Strings.detailNote}
      </Text>
      <Text
        className="font-inter text-foreground mt-1"
        style={{ fontSize: Type.body, lineHeight: lineHeightFor(Type.body) }}
      >
        {trimmed}
      </Text>
    </Card>
  );
}
