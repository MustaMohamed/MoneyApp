import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';
import { PressableFeedback, Typography } from 'heroui-native';
import React from 'react';
import { View, useWindowDimensions } from 'react-native';

import { resolveStackHeaderGeometry } from '@/components/ui/stack_header.geometry';
import { Strings } from '@/constants/strings';
import { Radius, Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

export interface StackHeaderProps {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
}

export function StackHeader({ title, onBack, right }: StackHeaderProps) {
  const router = useRouter();
  const handleBack = onBack ?? (() => router.back());
  const { fontScale } = useWindowDimensions();
  const geometry = resolveStackHeaderGeometry(fontScale);

  return (
    <View
      style={{ flexDirection: 'row', alignItems: 'center', height: geometry.height }}
      className="border-separator justify-between border-b px-2"
    >
      <PressableFeedback
        onPress={handleBack}
        hitSlop={8}
        className="bg-surface border-border h-9 w-9 items-center justify-center border"
        style={{ borderRadius: Radius.sm }}
        accessibilityRole="button"
        accessibilityLabel={Strings.goBackAccessibility}
      >
        <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color={CoreTokens.text2} />
      </PressableFeedback>
      <Typography
        className="font-sora-semibold text-foreground flex-1 text-center"
        allowFontScaling={false}
        style={geometry.title}
        numberOfLines={1}
      >
        {title}
      </Typography>
      {right ?? <View className="w-9" />}
    </View>
  );
}
