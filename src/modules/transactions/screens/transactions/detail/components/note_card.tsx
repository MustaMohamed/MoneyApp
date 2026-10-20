import React from 'react';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { LetterSpacing, Type, lineHeightFor } from '@/constants/theme';

import { NoteCardFrame } from './detail_card_frames';

interface Props {
  note: string | null;
}

/** Canvas `.note-card`: the label in capitals over the note, which wraps whole. */
export function NoteCard({ note }: Props): React.ReactElement | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;

  return (
    <NoteCardFrame testID="detail-note-card">
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
    </NoteCardFrame>
  );
}
