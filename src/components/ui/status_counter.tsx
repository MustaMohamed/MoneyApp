import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { Text } from '@/components/ui/text';
import { scaledTextStyle } from '@/components/ui/text_scale.geometry';
import { Size, Spacing, Type } from '@/constants/theme';

export interface StatusCounterProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
  /** A string carries the dash while the figures are unavailable. */
  value: number | string;
  maxFontScale?: number;
  accessibilityLabel?: string;
}

/** A commitment status count beside its icon, on the Home Commitments card and the Commitments hero. */
export function StatusCounter({
  icon,
  color,
  value,
  maxFontScale,
  accessibilityLabel,
}: StatusCounterProps): React.ReactElement {
  const { fontScale } = useWindowDimensions();
  return (
    <View
      accessible={accessibilityLabel !== undefined}
      accessibilityLabel={accessibilityLabel}
      style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xxs }}
    >
      <MaterialCommunityIcons name={icon} size={Size.statusCounterIcon} color={color} />
      <Text
        allowFontScaling={false}
        className="font-sora-semibold"
        style={{ ...scaledTextStyle(Type.micro, fontScale, maxFontScale), color }}
      >
        {value}
      </Text>
    </View>
  );
}
