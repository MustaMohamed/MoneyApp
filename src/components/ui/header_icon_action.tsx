import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import React from 'react';

import { HeaderActionBox } from '@/components/ui/header_action_box';
import type { HeaderActionEdge } from '@/components/ui/stack_header.geometry';
import { Size } from '@/constants/theme';

export interface HeaderIconActionProps {
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  iconSize: number;
  iconColor: string;
  accessibilityLabel: string;
  onPress: () => void;
  edge?: HeaderActionEdge;
}

export function HeaderIconAction({
  icon,
  iconSize,
  iconColor,
  accessibilityLabel,
  onPress,
  edge = 'trailing',
}: HeaderIconActionProps) {
  return (
    <HeaderActionBox
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      edge={edge}
      style={{ width: Size.headerActionTrack, height: Size.headerActionTrack }}
    >
      <MaterialCommunityIcons name={icon} size={iconSize} color={iconColor} />
    </HeaderActionBox>
  );
}
