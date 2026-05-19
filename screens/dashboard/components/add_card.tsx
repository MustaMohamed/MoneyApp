import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface AddCardProps {
  width: number;
  onPress: () => void;
}

const ACCENT = Colors.shared.cairoGold;

export function AddCard({ width, onPress }: AddCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="bg-surface border-border overflow-hidden rounded-2xl border"
      style={{ width, marginLeft: ms(4), alignSelf: 'stretch' }}
      accessibilityRole="button"
      accessibilityLabel={Strings.emptyAccountsCta}
    >
      {/* Accent bar — mirrors AccountCard's account-color accent */}
      <View style={{ height: ms(3), width: '100%', backgroundColor: ACCENT }} />

      <View className="flex-1 items-center justify-center" style={{ gap: ms(8), padding: ms(12) }}>
        <View
          style={{
            width: ms(44),
            height: ms(44),
            borderRadius: ms(22),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ACCENT + '22',
          }}
        >
          <MaterialCommunityIcons name="plus" size={ms(25)} color={ACCENT} />
        </View>
        <Text variant="caption" className="font-semibold" style={{ color: ACCENT }}>
          {Strings.emptyAccountsCta}
        </Text>
      </View>
    </Pressable>
  );
}
