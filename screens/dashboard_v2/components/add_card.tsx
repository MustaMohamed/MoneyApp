import React from 'react';
import { Pressable, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Strings } from '@/constants/strings';
import { Colors } from '@/constants/theme';
import { ms } from '@/utils/responsive';

interface AddCardProps {
  onPress: () => void;
}

export function AddCard({ onPress }: AddCardProps) {
  return (
    <Pressable
      onPress={onPress}
      className="border border-dashed border-separator rounded-2xl items-center justify-center"
      style={{
        width: ms(72),
        height: ms(72),
        marginRight: ms(8),
      }}
      accessibilityRole="button"
      accessibilityLabel={Strings.emptyAccountsCta}
    >
      <View className="items-center justify-center" style={{ gap: ms(2) }}>
        <MaterialCommunityIcons name="plus" size={ms(20)} color={Colors.shared.cairoGold} />
      </View>
    </Pressable>
  );
}
