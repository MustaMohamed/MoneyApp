import { PressableFeedback, useThemeColor } from 'heroui-native';
import React from 'react';

interface PressHighlightProps {
  radius: number;
}

/** HeroUI's tertiary Button highlight, drawn inside the button's own corners where its slop reaches past them. */
export function PressHighlight({ radius }: PressHighlightProps): React.ReactElement {
  const color = useThemeColor('default-hover');
  return (
    <PressableFeedback.Highlight
      style={{ borderRadius: radius }}
      animation={{ backgroundColor: { value: color }, opacity: { value: [0, 1] } }}
    />
  );
}
