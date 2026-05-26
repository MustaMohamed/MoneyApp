import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface StatusBadgeProps {
  label: string;
  color: string;
  icon?: IconName;
  size?: 'sm' | 'md';
}

const ICON_SIZE = { sm: 10, md: 12 } as const;
const LABEL_CLASS = { sm: 'font-inter text-[10px]', md: 'font-inter text-[11px]' } as const;

export function StatusBadge({ label, color, icon, size = 'sm' }: StatusBadgeProps) {
  return (
    <View
      style={{ backgroundColor: `${color}22`, flexDirection: 'row', alignItems: 'center' }}
      className="gap-0.5 rounded-full px-1.5 py-0.5"
    >
      {icon != null ? (
        <MaterialCommunityIcons name={icon} size={ICON_SIZE[size]} color={color} />
      ) : null}
      <Text className={LABEL_CLASS[size]} style={{ color }}>
        {label}
      </Text>
    </View>
  );
}
