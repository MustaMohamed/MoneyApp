import React from 'react';

import { Button } from '@/components/ui/button';
import { Strings } from '@/constants/strings';

interface DetailEditButtonProps {
  onPress: () => void;
}

export function DetailEditButton({ onPress }: DetailEditButtonProps): React.ReactElement {
  return (
    <Button
      variant="secondary"
      flat
      icon="pencil-outline"
      label={Strings.detailEditButton}
      onPress={onPress}
    />
  );
}
