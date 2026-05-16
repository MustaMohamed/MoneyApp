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
      <View style={{ height: ms(3), width: '100%', backgroundColor: ACCENT }} />

      <View
        className="flex-1 items-center justify-center p-2"
        style={{ gap: ms(6) }}
      >
        <View
          style={{
            width: ms(36),
            height: ms(36),
            borderRadius: ms(18),
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: ACCENT + '22',
          }}
        >
          <MaterialCommunityIcons name="plus" size={ms(22)} color={ACCENT} />
        </View>
        <Text
          variant="caption"
          className="font-semibold"
          style={{ color: ACCENT }}
        >
          {Strings.emptyAccountsCta}
        </Text>
      </View>
    </Pressable>
  );
}
