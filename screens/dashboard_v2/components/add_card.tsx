import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

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
      className="bg-surface rounded-2xl border border-border overflow-hidden"
      style={{ width, marginLeft: ms(4), alignSelf: 'stretch' }}
      accessibilityRole="button"
      accessibilityLabel={Strings.emptyAccountsCta}
    >
      {/* Accent bar — mirrors AccountCard's account-color accent */}
      <View style={{ height: ms(4), width: '100%', backgroundColor: ACCENT }} />

      <View
        className="flex-1 items-center justify-center"
        style={{ gap: ms(10), padding: ms(14) }}
      >
        <View
          style={{
            width: ms(52),
            height: ms(52),
            borderRadius: ms(26),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ACCENT + '22',
          }}
        >
          <MaterialCommunityIcons name="plus" size={ms(30)} color={ACCENT} />
        </View>
        <Text
          variant="label"
          className="font-semibold"
          style={{ color: ACCENT }}
        >
          {Strings.emptyAccountsCta}
        </Text>
      </View>
    </Pressable>
  );
}
