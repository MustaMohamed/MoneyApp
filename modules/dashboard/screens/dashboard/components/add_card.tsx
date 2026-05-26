import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Card, PressableFeedback } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

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
    <PressableFeedback
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={Strings.emptyAccountsCta}
      style={{ width, marginLeft: ms(4), alignSelf: 'stretch' }}
    >
      <Card
        className="border-border overflow-hidden rounded-2xl border p-0"
        style={{ flex: 1, elevation: 0, shadowOpacity: 0 }}
      >
        {/* Accent bar — mirrors AccountCard's account-color accent */}
        <View style={{ height: ms(3), width: '100%', backgroundColor: ACCENT }} />

        <View
          className="flex-1 items-center justify-center"
          style={{ gap: ms(8), padding: ms(12) }}
        >
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
      </Card>
    </PressableFeedback>
  );
}
