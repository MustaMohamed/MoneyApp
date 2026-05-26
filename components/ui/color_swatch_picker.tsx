import { PressableFeedback } from 'heroui-native';
import React from 'react';

import { Box } from '@/components/ui/box';

interface ColorSwatchPickerProps {
  colors: readonly string[];
  value: string;
  onChange: (color: string) => void;
}

export function ColorSwatchPicker({ colors, value, onChange }: ColorSwatchPickerProps) {
  return (
    <Box style={{ flexDirection: 'row', flexWrap: 'wrap' }} className="gap-2">
      {colors.map((color) => (
        <PressableFeedback key={color} onPress={() => onChange(color)} className="p-0.5">
          <Box
            className={
              value === color
                ? 'border-gold-500 h-8 w-8 scale-110 rounded-full border-2'
                : 'h-8 w-8 rounded-full'
            }
            style={{ backgroundColor: color }}
          />
        </PressableFeedback>
      ))}
    </Box>
  );
}
