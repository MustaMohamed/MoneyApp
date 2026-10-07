import { PressableFeedback, Typography } from 'heroui-native';
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { resolveHeaderTextActionGeometry } from '@/components/ui/stack_header.geometry';

const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 };

export interface HeaderTextActionProps {
  label: string;
  onPress: () => void;
}

export function HeaderTextAction({ label, onPress }: HeaderTextActionProps) {
  const { fontScale } = useWindowDimensions();
  const geometry = resolveHeaderTextActionGeometry(fontScale);

  return (
    <PressableFeedback
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      className="bg-surface border-border items-center justify-center rounded-[8px] border px-1"
      style={{ minWidth: geometry.minWidth, height: geometry.height }}
    >
      <Typography
        className="font-sora-bold text-accent text-[11px]"
        allowFontScaling={geometry.label === undefined}
        style={geometry.label}
      >
        {label}
      </Typography>
    </PressableFeedback>
  );
}
