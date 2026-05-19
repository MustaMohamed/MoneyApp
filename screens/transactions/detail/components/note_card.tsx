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
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';

interface Props {
  note: string | null;
}

export function NoteCard({ note }: Props): React.ReactElement | null {
  const trimmed = note?.trim();
  if (!trimmed) return null;

  return (
    <View
      testID="detail-note-card"
      className="mx-4 mt-4 rounded-2xl bg-surface border border-separator p-4"
    >
      <View className="flex-row items-center gap-2 mb-2">
        <View className="w-7 h-7 rounded-md bg-foreground/5 items-center justify-center">
          <MaterialCommunityIcons name="text" size={14} color="#F0EEE6" />
        </View>
        <Text className="font-inter font-semibold text-[10.5px] uppercase tracking-wide text-foreground/55">
          {Strings.detailNote}
        </Text>
      </View>
      <Text className="font-inter text-[13px] text-foreground font-medium">{trimmed}</Text>
    </View>
  );
}
