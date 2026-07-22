import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { PressableFeedback } from 'heroui-native';
import React from 'react';

import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { Radius, Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';

interface DetailHeaderProps {
  editable: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function DetailHeader({ editable, onBack, onEdit }: DetailHeaderProps) {
  return (
    <StackHeader
      title={Strings.detailHeader}
      onBack={onBack}
      right={
        editable ? (
          <PressableFeedback
            onPress={onEdit}
            hitSlop={8}
            accessibilityRole="button"
            accessibilityLabel={Strings.detailEditAccessibility}
            className="bg-surface border-border h-9 w-9 items-center justify-center border"
            style={{ borderRadius: Radius.sm }}
          >
            <MaterialCommunityIcons
              name="pencil-outline"
              size={Size.iconSm}
              color={GoldTokens[500]}
            />
          </PressableFeedback>
        ) : undefined
      }
    />
  );
}
