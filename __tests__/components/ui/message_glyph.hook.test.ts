import { act, renderHook } from '@testing-library/react-native';
import type { TextLayoutEvent } from 'react-native';

import { useMessageGlyphShift } from '@/components/ui/message_glyph.hook';

interface MessageGlyphProps {
  lineHeightAtOne: number;
  fontScale: number;
}

const LINE_HEIGHT_AT_ONE = 20;

function textLayoutEvent(lineHeights: readonly number[]): TextLayoutEvent {
  return {
    nativeEvent: { lines: lineHeights.map((height) => ({ height })) },
  } as unknown as TextLayoutEvent;
}

async function mountMessageGlyph(fontScale: number) {
  const hook = await renderHook(
    ({ lineHeightAtOne, fontScale: scale }: MessageGlyphProps) =>
      useMessageGlyphShift(lineHeightAtOne, scale),
    { initialProps: { lineHeightAtOne: LINE_HEIGHT_AT_ONE, fontScale } },
  );
  return {
    hook,
    layOut: (lineHeights: readonly number[]) =>
      act(() => hook.result.current.onTextLayout(textLayoutEvent(lineHeights))),
  };
}

describe('useMessageGlyphShift', () => {
  it('MA-184: at font scale 2 reads no shift before any layout, with a layout handler', async () => {
    const { hook } = await mountMessageGlyph(2);

    expect(hook.result.current.shift).toBe(0);
    expect(hook.result.current.onTextLayout).toEqual(expect.any(Function));
  });

  it('MA-184: at font scale 2 a first line drawn 34.29 high shifts the glyph by 7.145', async () => {
    const { hook, layOut } = await mountMessageGlyph(2);

    await layOut([34.29, 34.29]);

    expect(hook.result.current.shift).toBeCloseTo(7.145, 6);
  });

  it('MA-184: at font scale 1 a first line drawn 20.19 high leaves no shift', async () => {
    const { hook, layOut } = await mountMessageGlyph(1);

    await layOut([20.19]);

    expect(hook.result.current.shift).toBe(0);
  });

  it('MA-184: a layout with no lines leaves no shift', async () => {
    const { hook, layOut } = await mountMessageGlyph(2);

    await layOut([]);

    expect(hook.result.current.shift).toBe(0);
  });

  it('MA-184: a rerender at another font scale reads no shift until the next layout', async () => {
    const { hook, layOut } = await mountMessageGlyph(2);
    await layOut([34.29]);
    expect(hook.result.current.shift).toBeCloseTo(7.145, 6);

    await hook.rerender({ lineHeightAtOne: LINE_HEIGHT_AT_ONE, fontScale: 1.5 });
    expect(hook.result.current.shift).toBe(0);

    await layOut([28]);
    expect(hook.result.current.shift).toBeCloseTo(4, 6);
  });
});
