import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback, Text } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

type IconName = React.ComponentProps<typeof MaterialCommunityIcons>['name'];

export interface TabHeaderAction {
  icon: IconName;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface TabHeaderProps {
  title: string;
  subtitle?: React.ReactNode;
  actions?: TabHeaderAction[];
}

export function TabHeader({ title, subtitle, actions }: TabHeaderProps) {
  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', minHeight: Size.headerHeight }}
      className="border-separator border-b px-4 py-2"
    >
      <View style={{ flex: 1 }}>
        <Text className="font-sora text-foreground text-[22px] font-bold">{title}</Text>
        {subtitle != null ? (
          <View className="mt-0.5">
            {typeof subtitle === 'string' ? (
              <Text className="font-inter text-muted text-[13px]">{subtitle}</Text>
            ) : (
              subtitle
            )}
          </View>
        ) : null}
      </View>
      {actions && actions.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: 4 }}>
          {actions.map((action) => (
            <PressableFeedback
              key={action.accessibilityLabel}
              onPress={action.onPress}
              hitSlop={8}
              className="h-9 w-9 items-center justify-center rounded-full"
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
            >
              <MaterialCommunityIcons
                name={action.icon}
                size={Size.iconMd}
                color={CoreTokens.text2}
              />
            </PressableFeedback>
          ))}
        </View>
      ) : null}
    </View>
  );
}
