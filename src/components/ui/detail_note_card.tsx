import { Card } from 'heroui-native';
import React from 'react';
import type { ViewStyle } from 'react-native';

import { DETAIL_NOTE_MIN_HEIGHT } from '@/components/ui/detail_rows_card.geometry';
import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { LetterSpacing, Type, lineHeightFor } from '@/constants/theme';

interface Props {
  note: string | null;
  testID?: string;
}

interface DetailNoteCardFrameProps {
  testID?: string;
  children: React.ReactNode;
}

const NOTE_CARD_FRAME_STYLE: Readonly<ViewStyle> = Object.freeze({
  minHeight: DETAIL_NOTE_MIN_HEIGHT,
  boxShadow: 'none',
});

export function DetailNoteCardFrame({
  testID,
  children,
}: DetailNoteCardFrameProps): React.ReactElement {
  return (
    <Card
      testID={testID}
      className="border-separator mx-4 mt-4 rounded-2xl border px-4 py-3"
      style={NOTE_CARD_FRAME_STYLE}
    >
      {children}
    </Card>
  );
}

/** Canvas `.note-card`: the label in capitals over the note, which wraps whole. */
export function DetailNoteCard({
  note,
  testID = 'detail-note-card',
}: Props): React.ReactElement | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;

  return (
    <DetailNoteCardFrame testID={testID}>
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
    </DetailNoteCardFrame>
  );
}
