import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

import { HeaderActionBox } from '@/components/ui/header_action_box';
import { Size } from '@/constants/theme';

export interface HeaderIconActionProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconSize: number;
  iconColor: string;
  accessibilityLabel: string;
  onPress: () => void;
}

export function HeaderIconAction({
  icon,
  iconSize,
  iconColor,
  accessibilityLabel,
  onPress,
}: HeaderIconActionProps) {
  return (
    <HeaderActionBox
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={{ width: Size.headerActionTrack, height: Size.headerActionTrack }}
    >
      <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
    </HeaderActionBox>
  );
}
