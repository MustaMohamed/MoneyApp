import { Spinner } from 'heroui-native';
import React from 'react';

import { HeaderIconAction } from '@/components/ui/header_icon_action';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';
import { GoldTokens } from '@/constants/theme_tokens';

interface DetailHeaderProps {
  editable: boolean;
  refreshing: boolean;
  onBack: () => void;
  onEdit: () => void;
}

export function DetailHeader({ editable, refreshing, onBack, onEdit }: DetailHeaderProps) {
  return (
    <StackHeader
      title={Strings.detailHeader}
      onBack={onBack}
      right={
        refreshing ? (
          <Spinner
            size="sm"
            accessibilityLabel={Strings.detailRefreshingAccessibility}
            style={{ width: Size.headerActionTrack, height: Size.headerActionTrack }}
          />
        ) : editable ? (
          <HeaderIconAction
            icon="pencil-outline"
            iconSize={Size.iconSm}
            iconColor={GoldTokens[500]}
            accessibilityLabel={Strings.detailEditAccessibility}
            onPress={onEdit}
          />
        ) : undefined
      }
    />
  );
}
