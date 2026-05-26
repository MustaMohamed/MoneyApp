import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
/**
 * BackButton — canonical 36×36 boxy back-button matching the N2 (onboarding) style.
 *
 * Props:
 *   onPress — navigation callback, required.
 *
 * Visual: w-9 h-9 rounded-[8px] bg-surface border border-border, chevron-left icon.
 */
import React from 'react';

import { PressableFeedback } from 'heroui-native';
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
