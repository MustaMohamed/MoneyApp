import { Spinner } from 'heroui-native';
import React from 'react';

import { DetailEditAction } from '@/components/ui/detail_edit_action';
import { StackHeader } from '@/components/ui/stack_header';
import { Strings } from '@/constants/strings';
import { Size } from '@/constants/theme';

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
          <DetailEditAction accessibilityLabel={Strings.detailEditAccessibility} onPress={onEdit} />
        ) : undefined
      }
    />
  );
}
