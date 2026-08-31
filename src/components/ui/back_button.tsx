import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';

import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

export interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <PressableFeedback
      onPress={onPress}
      className="bg-surface border-border h-9 w-9 items-center justify-center rounded-[8px] border"
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color={CoreTokens.text2} />
    </PressableFeedback>
  );
}
