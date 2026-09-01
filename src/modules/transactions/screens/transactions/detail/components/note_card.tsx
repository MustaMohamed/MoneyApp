import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Size, Type, lineHeightFor } from '@/constants/theme';
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
          style={{ fontSize: Type.overline, lineHeight: lineHeightFor(Type.overline) }}
        >
          {Strings.detailNote}
        </Text>
      </View>
      <Text
        className="font-inter-medium text-foreground"
        style={{ fontSize: Type.meta, lineHeight: lineHeightFor(Type.meta) }}
      >
        {trimmed}
      </Text>
    </Card>
  );
}
