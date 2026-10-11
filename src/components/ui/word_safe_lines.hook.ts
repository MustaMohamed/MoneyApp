import { useCallback, useRef, useState } from 'react';
import type { LayoutChangeEvent, TextLayoutEvent } from 'react-native';

import { resolveLoneWordLines, resolveWordSafeLines } from '@/components/ui/text_scale.geometry';

export interface WordSafeLines {
  numberOfLines: number | undefined;
  onTextLayout: ((event: TextLayoutEvent) => void) | undefined;
  onLayout: ((event: LayoutChangeEvent) => void) | undefined;
}

/** Above font scale 1 the line cap drops to the line where a laid-out word runs on, so the text ends in `…` and splits no word; a wider box starts again from the caller's cap. */
export function useWordSafeLines(
  text: string,
  lines: number | undefined,
  fontScale: number,
): WordSafeLines {
  const key = `${fontScale}:${lines}:${text}`;
  const [lowered, setLowered] = useState<{ key: string; cap: number } | undefined>(undefined);
  const widthRef = useRef<number | undefined>(undefined);
  const cap = lowered?.key === key ? lowered.cap : resolveLoneWordLines(text, lines, fontScale);

  const handleTextLayout = useCallback(
    (event: TextLayoutEvent) => {
      const laidOutLines = event.nativeEvent.lines.map((line) => line.text);
      // An event still queued for the previous text carries lines the current text does not start with.
      if (laidOutLines.length > 1 && !text.startsWith(laidOutLines[0])) return;
      const next = resolveWordSafeLines(laidOutLines, cap);
      if (next !== undefined && (cap === undefined || next < cap)) setLowered({ key, cap: next });
    },
    [cap, key, text],
  );

  const handleLayout = useCallback((event: LayoutChangeEvent) => {
    const previousWidth = widthRef.current;
    widthRef.current = event.nativeEvent.layout.width;
    // A narrower box keeps the cap: its own text layout lowers it, and that event comes before this one.
    if (previousWidth !== undefined && widthRef.current > previousWidth) setLowered(undefined);
  }, []);

  return fontScale <= 1
    ? { numberOfLines: lines, onTextLayout: undefined, onLayout: undefined }
    : { numberOfLines: cap, onTextLayout: handleTextLayout, onLayout: handleLayout };
}
