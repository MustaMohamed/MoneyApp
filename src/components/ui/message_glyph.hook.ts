import { useCallback, useState } from 'react';
import type { TextLayoutEvent } from 'react-native';

import { resolveMessageGlyphShift } from '@/components/ui/text_scale.geometry';

export interface MessageGlyphShift {
  shift: number;
  onTextLayout: (event: TextLayoutEvent) => void;
}

interface MeasuredFirstLine {
  height: number;
  fontScale: number;
}

/** A message glyph's shift from the drawn first line, since Android scales `lineHeight` nonlinearly; a line measured at another font scale counts as unmeasured. */
export function useMessageGlyphShift(
  lineHeightAtOne: number,
  fontScale: number,
): MessageGlyphShift {
  const [measured, setMeasured] = useState<MeasuredFirstLine | undefined>(undefined);
  const firstLineHeight = measured?.fontScale === fontScale ? measured.height : undefined;

  const handleTextLayout = useCallback(
    (event: TextLayoutEvent) => {
      const { lines } = event.nativeEvent;
      if (lines.length === 0) return;
      const firstLine = lines[0];
      setMeasured((previous) =>
        previous?.height === firstLine.height && previous.fontScale === fontScale
          ? previous
          : { height: firstLine.height, fontScale },
      );
    },
    [fontScale],
  );

  return {
    shift: resolveMessageGlyphShift(lineHeightAtOne, firstLineHeight, fontScale),
    onTextLayout: handleTextLayout,
  };
}
