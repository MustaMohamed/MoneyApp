import React from 'react';

import { HeaderIconAction } from '@/components/ui/header_icon_action';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { CoreTokens } from '@/constants/theme_tokens';

export interface BackButtonProps {
  onPress: () => void;
}

export function BackButton({ onPress }: BackButtonProps) {
  return (
    <HeaderIconAction
      icon="chevron-left"
      iconSize={Size.iconBack}
      iconColor={CoreTokens.text2}
      accessibilityLabel={Strings.goBackAccessibility}
      onPress={onPress}
    />
  );
}
