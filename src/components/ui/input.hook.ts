import { useCallback, useState } from 'react';
import type { BlurEvent, FocusEvent, LayoutChangeEvent, TextInputProps } from 'react-native';

import {
  type InputRestTextInsets,
  type InputValueAtRest,
  resolveInputRestTextInsets,
} from '@/components/ui/input.geometry';

export interface InputValueAtRestOptions {
  valueAtRest: InputValueAtRest | undefined;
  value: string | undefined;
  fontScale: number;
  onFocus: TextInputProps['onFocus'];
  onBlur: TextInputProps['onBlur'];
}

export interface InputValueAtRestBinding {
  shown: InputValueAtRest | undefined;
  insets: InputRestTextInsets;
  onFocus: TextInputProps['onFocus'];
  onBlur: TextInputProps['onBlur'];
  onSuffixLayout: ((event: LayoutChangeEvent) => void) | undefined;
}

/** Above font scale 1 a field with a value and no focus shows it at rest as `valueAtRest` asks; with none the caller's handlers pass through untouched. */
export function useInputValueAtRest({
  valueAtRest,
  value,
  fontScale,
  onFocus,
  onBlur,
}: InputValueAtRestOptions): InputValueAtRestBinding {
  const [focused, setFocused] = useState(false);
  const [suffixWidth, setSuffixWidth] = useState<number | undefined>(undefined);

  const handleFocus = useCallback(
    (event: FocusEvent) => {
      setFocused(true);
      onFocus?.(event);
    },
    [onFocus],
  );

  const handleBlur = useCallback(
    (event: BlurEvent) => {
      setFocused(false);
      onBlur?.(event);
    },
    [onBlur],
  );

  const handleSuffixLayout = useCallback((event: LayoutChangeEvent) => {
    setSuffixWidth(event.nativeEvent.layout.width);
  }, []);

  const atRest = fontScale > 1 && !focused && value !== undefined && value !== '';
  const overlays = valueAtRest === 'fit' || valueAtRest === 'ellipsis';
  return {
    shown: atRest ? valueAtRest : undefined,
    insets: resolveInputRestTextInsets(suffixWidth),
    onFocus: valueAtRest === undefined ? onFocus : handleFocus,
    onBlur: valueAtRest === undefined ? onBlur : handleBlur,
    onSuffixLayout: overlays ? handleSuffixLayout : undefined,
  };
}
