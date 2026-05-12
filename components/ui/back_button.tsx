/**
 * BackButton — canonical 36×36 boxy back-button matching the N2 (onboarding_v2) style.
 *
 * Props:
 *   onPress — navigation callback, required.
 *
 * Visual: w-9 h-9 rounded-[8px] bg-surface border border-border, chevron-left icon.
 */
import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Pressable } from '@/components/ui/pressable';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

export interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      className="w-9 h-9 rounded-[8px] bg-surface border border-border items-center justify-center"
      accessibilityRole="button"
      accessibilityLabel="Go back"
    >
      <MaterialCommunityIcons name="chevron-left" size={Size.iconBack} color={CoreTokens.text2} />
    </Pressable>
  );
}
