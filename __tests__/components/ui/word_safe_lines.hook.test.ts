import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent, TextLayoutEvent } from 'react-native';

import { useWordSafeLines } from '@/components/ui/word_safe_lines.hook';

interface WordSafeLinesProps {
  text: string;
  lines: number | undefined;
  fontScale: number;
}

const LONG_WORD_NAME = 'Entertainment subscriptions';
const SPLIT_LAYOUT = ['Entertainm', 'ent subscri'];
const CAPPED_TEXT = 'Entertain…';
// Android reports a capped line as its drawn text padded with U+FEFF to the length of the source text.
const CAPPED_LAYOUT = [CAPPED_TEXT + '\uFEFF'.repeat(LONG_WORD_NAME.length - CAPPED_TEXT.length)];

function textLayoutEvent(lines: readonly string[]): TextLayoutEvent {
  return { nativeEvent: { lines: lines.map((text) => ({ text })) } } as unknown as TextLayoutEvent;
}

function layoutEvent(width: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { width } } } as unknown as LayoutChangeEvent;
}

async function mountWordSafeLines(initialProps: WordSafeLinesProps) {
  const hook = await renderHook(
    ({ text, lines, fontScale }: WordSafeLinesProps) => useWordSafeLines(text, lines, fontScale),
    { initialProps },
  );
  return {
    hook,
    layOut: (lines: readonly string[]) =>
      act(() => hook.result.current.onTextLayout?.(textLayoutEvent(lines))),
    resize: (width: number) => act(() => hook.result.current.onLayout?.(layoutEvent(width))),
  };
}

describe('useWordSafeLines', () => {
  it('MA-171: at font scale 1 returns the cap of the caller and no layout handler', async () => {
    const { hook } = await mountWordSafeLines({ text: LONG_WORD_NAME, lines: 2, fontScale: 1 });

    expect(hook.result.current.numberOfLines).toBe(2);
    expect(hook.result.current.onTextLayout).toBeUndefined();
    expect(hook.result.current.onLayout).toBeUndefined();
  });

  it('MA-171: at font scale 2 a lone word starts on one line with a layout handler', async () => {
    const { hook } = await mountWordSafeLines({ text: 'Housing', lines: 2, fontScale: 2 });

    expect(hook.result.current.numberOfLines).toBe(1);
    expect(hook.result.current.onTextLayout).toEqual(expect.any(Function));
  });

  it.each([
    { text: LONG_WORD_NAME, lines: 2, laidOut: SPLIT_LAYOUT, lowered: 1 },
    {
      text: 'Food & Entertainment',
      lines: 3,
      laidOut: ['Food & ', 'Entertainm', 'ent'],
      lowered: 2,
    },
  ])(
    'MA-171: at font scale 2 a layout that splits a word lowers the cap from $lines to line $lowered',
    async ({ text, lines, laidOut, lowered }) => {
      const { hook, layOut } = await mountWordSafeLines({ text, lines, fontScale: 2 });
      expect(hook.result.current.numberOfLines).toBe(lines);

      await layOut(laidOut);

      expect(hook.result.current.numberOfLines).toBe(lowered);
    },
  );

  it('MA-171: the capped line Android reports after the cut leaves the lowered cap', async () => {
    const { hook, layOut } = await mountWordSafeLines({
      text: LONG_WORD_NAME,
      lines: 2,
      fontScale: 2,
    });
    await layOut(SPLIT_LAYOUT);

    await layOut(CAPPED_LAYOUT);

    expect(hook.result.current.numberOfLines).toBe(1);
  });

  it('MA-171: a new text starts again from the cap of the caller', async () => {
    const { hook, layOut } = await mountWordSafeLines({
      text: LONG_WORD_NAME,
      lines: 2,
      fontScale: 2,
    });
    await layOut(SPLIT_LAYOUT);
    expect(hook.result.current.numberOfLines).toBe(1);

    await hook.rerender({ text: 'Food & Dining', lines: 2, fontScale: 2 });

    expect(hook.result.current.numberOfLines).toBe(2);
  });

  it('MA-171: a wider text box starts again from the cap of the caller, and the same width leaves the lowered cap', async () => {
    const { hook, layOut, resize } = await mountWordSafeLines({
      text: LONG_WORD_NAME,
      lines: 2,
      fontScale: 2,
    });
    await resize(173);
    await layOut(SPLIT_LAYOUT);
    expect(hook.result.current.numberOfLines).toBe(1);

    await resize(173);
    expect(hook.result.current.numberOfLines).toBe(1);

    await resize(260);
    expect(hook.result.current.numberOfLines).toBe(2);
  });

  it('MA-171: a layout whose lines belong to another text leaves the cap of the caller', async () => {
    const { hook, layOut } = await mountWordSafeLines({
      text: 'Food & Dining',
      lines: 2,
      fontScale: 2,
    });

    await layOut(SPLIT_LAYOUT);

    expect(hook.result.current.numberOfLines).toBe(2);
  });

  it('MA-171: a narrower box reported after the layout that lowered the cap leaves the lowered cap', async () => {
    const { hook, resize } = await mountWordSafeLines({
      text: LONG_WORD_NAME,
      lines: 2,
      fontScale: 2,
    });
    await resize(260);
    expect(hook.result.current.numberOfLines).toBe(2);

    await act(() => {
      hook.result.current.onTextLayout?.(textLayoutEvent(SPLIT_LAYOUT));
      hook.result.current.onLayout?.(layoutEvent(173));
    });

    expect(hook.result.current.numberOfLines).toBe(1);
  });

  it('MA-171: a narrower box reported in a later pass than the layout that lowered the cap leaves the lowered cap', async () => {
    const { hook, layOut, resize } = await mountWordSafeLines({
      text: LONG_WORD_NAME,
      lines: 2,
      fontScale: 2,
    });
    await resize(260);
    await layOut(SPLIT_LAYOUT);
    expect(hook.result.current.numberOfLines).toBe(1);

    await resize(173);

    expect(hook.result.current.numberOfLines).toBe(1);
  });

  it('MA-171: a new text lowered by the layout of the pass that widens its box leaves the lowered cap', async () => {
    const { hook, resize } = await mountWordSafeLines({
      text: 'Food & Dining',
      lines: 2,
      fontScale: 2,
    });
    await resize(173);
    await hook.rerender({ text: LONG_WORD_NAME, lines: 2, fontScale: 2 });

    await act(() => {
      hook.result.current.onTextLayout?.(textLayoutEvent(SPLIT_LAYOUT));
      hook.result.current.onLayout?.(layoutEvent(260));
    });

    expect(hook.result.current.numberOfLines).toBe(1);
  });

  it('MA-171: a cap lowered in a pass that reports no box starts again from the cap of the caller when a later pass widens the box', async () => {
    const { hook, layOut, resize } = await mountWordSafeLines({
      text: LONG_WORD_NAME,
      lines: 2,
      fontScale: 2,
    });
    await resize(173);
    await layOut(SPLIT_LAYOUT);
    expect(hook.result.current.numberOfLines).toBe(1);

    await resize(260);

    expect(hook.result.current.numberOfLines).toBe(2);
  });
});
