import React from 'react';

import { HeaderIconAction } from '@/components/ui/header_icon_action';
import { Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';

interface DetailEditActionProps {
  accessibilityLabel: string;
  onPress: () => void;
}

export function DetailEditAction({
  accessibilityLabel,
  onPress,
}: DetailEditActionProps): React.ReactElement {
  return (
    <HeaderIconAction
      icon="pencil-outline"
      iconSize={Size.iconSm}
      iconColor={GoldTokens[500]}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
    />
  );
}
