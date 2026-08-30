/**
 * NoteCard — dedicated full-width section for the transaction note on the
 * detail screen.
 *
 * Lifted out of the DetailRowsCard so a long note isn't constrained to the
 * narrow two-line DetailRow layout used by Category / Account / Date /
 * Exchange-Rate. The note now gets the entire card width and as many lines
 * as it needs to render in full — matching the §7 list-row treatment where
 * the note was similarly moved out of the cramped middle column to a
 * full-width row below.
 *
 * When the transaction has no note, the card is omitted entirely (returns
 * null). No "Add a note" placeholder — the Edit sheet is the right place
 * to add one; a placeholder card here would just be visual noise.
 */
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

import { DETAIL_NOTE_MIN_HEIGHT } from './detail_geometry';

interface Props {
  note: string | null;
}

export function NoteCard({ note }: Props): React.ReactElement | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;

  return (
    <Card
      testID="detail-note-card"
      className="border-separator mx-4 mt-4 rounded-2xl border p-4"
      style={{ minHeight: DETAIL_NOTE_MIN_HEIGHT, boxShadow: 'none' }}
    >
      <View className="mb-2 flex-row items-center gap-2">
        <View className="bg-foreground/5 h-7 w-7 items-center justify-center rounded-md">
          <MaterialCommunityIcons
            name="text"
            size={Size.filterSegmentIcon}
            color={CoreTokens.text1}
          />
        </View>
        <Text
          className="font-inter-semibold text-foreground/55 tracking-wide uppercase"
          style={{ fontSize: Type.overline }}
        >
          {Strings.detailNote}
        </Text>
      </View>
      <Text className="font-inter-medium text-foreground" style={{ fontSize: Type.meta }}>
        {trimmed}
      </Text>
    </Card>
  );
}
