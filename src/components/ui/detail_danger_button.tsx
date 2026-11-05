import React from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';

interface DetailDangerButtonProps {
  icon: NonNullable<ButtonProps['icon']>;
  label: string;
  onPress: () => void;
}

export function DetailDangerButton({
  icon,
  label,
  onPress,
}: DetailDangerButtonProps): React.ReactElement {
  return (
    <Button variant="secondary" flat tone="danger" icon={icon} label={label} onPress={onPress} />
  );
}
