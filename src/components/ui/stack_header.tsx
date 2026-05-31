import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { PressableFeedback, Text } from 'heroui-native';
import React from 'react';
import { View } from 'react-native';

import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

export interface StackHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function StackHeader({ title, onBack, right }: StackHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', height: Size.headerHeight }}
      className="border-separator justify-between border-b px-2"
    >
      <PressableFeedback
        onPress={handleBack}
        hitSlop={8}
        className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border"
        accessibilityRole="button"
        accessibilityLabel="Go back"
      >
        <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color={CoreTokens.text2} />
      </PressableFeedback>
      <Text
        className="font-sora text-foreground flex-1 text-center text-[18px] font-semibold"
        numberOfLines={1}
      >
        {title}
      </Text>
      {right ?? <View className="w-9" />}
    </View>
  );
}
