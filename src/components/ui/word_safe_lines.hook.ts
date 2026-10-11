import { useCallback, useState } from 'react';
import type { TextLayoutEvent } from 'react-native';

import { resolveLoneWordLines, resolveWordSafeLines } from '@/components/ui/text_scale.geometry';

export interface WordSafeLines {
  numberOfLines: number | undefined;
  onTextLayout: ((event: TextLayoutEvent) => void) | undefined;
}

/** Above font scale 1 the line cap drops to the line where a laid-out word runs on, so the text ends in `…` and splits no word. */
export function useWordSafeLines(
  text: string,
  lines: number | undefined,
  fontScale: number,
): WordSafeLines {
  const key = `${fontScale}:${lines}:${text}`;
  const [lowered, setLowered] = useState<{ key: string; cap: number } | undefined>(undefined);
  const cap = lowered?.key === key ? lowered.cap : resolveLoneWordLines(text, lines, fontScale);

  const handleTextLayout = useCallback(
    (event: TextLayoutEvent) => {
      const next = resolveWordSafeLines(
        event.nativeEvent.lines.map((line) => line.text),
        cap,
      );
      if (next !== undefined && (cap === undefined || next < cap)) setLowered({ key, cap: next });
    },
    [cap, key],
  );

  return fontScale <= 1
    ? { numberOfLines: lines, onTextLayout: undefined }
    : { numberOfLines: cap, onTextLayout: handleTextLayout };
}
