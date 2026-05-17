import React from 'react';
import { View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Text } from '@/components/ui/text';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

interface Props {
  icon: IconName;
  label: string;
  value: string;
  badge?: string;
  sublabel?: string;
  muted?: boolean;
  showDivider?: boolean;
}

export function DetailRow({
  icon,
  label,
  value,
  badge,
  sublabel,
  muted = false,
  showDivider = true,
}: Props): React.ReactElement {
  return (
    <View
      className={`px-4 py-3 flex-row items-center gap-3 ${showDivider ? 'border-b border-separator' : ''}`}
    >
      <View className="w-7 h-7 rounded-md bg-foreground/5 items-center justify-center">
        <MaterialCommunityIcons name={icon} size={14} color="#F0EEE6" />
      </View>
      <View className="flex-1 min-w-0">
        <Text className="font-inter font-semibold text-[10.5px] uppercase tracking-wide text-foreground/55">
          {label}
        </Text>
        <Text
          className={`font-inter text-[13px] mt-0.5 ${muted ? 'italic text-foreground/60' : 'font-medium'}`}
          numberOfLines={2}
        >
          {value}
        </Text>
        {sublabel ? (
          <Text className="font-inter text-[10.5px] text-foreground/55 mt-0.5">{sublabel}</Text>
        ) : null}
      </View>
      {badge ? (
        <View className="px-2 py-0.5 rounded-full bg-accent/15 border border-accent/30">
          <Text className="font-inter font-semibold text-[9.5px] text-accent">{badge}</Text>
        </View>
      ) : null}
    </View>
  );
}
