import { act, renderHook } from '@testing-library/react-native';
import type { BlurEvent, FocusEvent, LayoutChangeEvent } from 'react-native';

import {
  INPUT_BORDER_WIDTH,
  INPUT_PADDING_INLINE,
  INPUT_REST_SELECTION,
  type InputValueAtRest,
} from '@/components/ui/input.geometry';
import { useInputValueAtRest } from '@/components/ui/input.hook';

interface ValueAtRestProps {
  valueAtRest: InputValueAtRest | undefined;
  value: string | undefined;
  fontScale: number;
}

const LIMIT = '300,000.00';
const FOCUS_EVENT = { nativeEvent: { target: 1 } } as unknown as FocusEvent;
const BLUR_EVENT = { nativeEvent: { target: 1 } } as unknown as BlurEvent;

function layoutEvent(width: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { x: 0, y: 0, width, height: 48 } } } as LayoutChangeEvent;
}

function defined<T>(handler: T | undefined, name: string): T {
  if (handler === undefined) throw new Error(`the binding has no ${name}`);
  return handler;
}

async function mountValueAtRest(initialProps: ValueAtRestProps) {
  const onFocus = jest.fn<void, [FocusEvent]>();
  const onBlur = jest.fn<void, [BlurEvent]>();
  const hook = await renderHook(
    ({ valueAtRest, value, fontScale }: ValueAtRestProps) =>
      useInputValueAtRest({ valueAtRest, value, fontScale, onFocus, onBlur }),
    { initialProps },
  );
  return { hook, onFocus, onBlur };
}

describe('useInputValueAtRest', () => {
  it("MA-179: with no valueAtRest returns the caller's own handlers and shows nothing at font scale 2", async () => {
    const { hook, onFocus, onBlur } = await mountValueAtRest({
      valueAtRest: undefined,
      value: LIMIT,
      fontScale: 2,
    });

    expect(hook.result.current.shown).toBeUndefined();
    expect(hook.result.current.onFocus).toBe(onFocus);
    expect(hook.result.current.onBlur).toBe(onBlur);
    expect(hook.result.current.onSuffixLayout).toBeUndefined();
  });

  it("MA-179: 'fit' at font scale 2 shows at rest, hides while focused, shows again after the blur, and passes each event to the caller", async () => {
    const { hook, onFocus, onBlur } = await mountValueAtRest({
      valueAtRest: 'fit',
      value: LIMIT,
      fontScale: 2,
    });
    expect(hook.result.current.shown).toBe('fit');

    await act(() => defined(hook.result.current.onFocus, 'onFocus')(FOCUS_EVENT));
    expect(hook.result.current.shown).toBeUndefined();

    await act(() => defined(hook.result.current.onBlur, 'onBlur')(BLUR_EVENT));
    expect(hook.result.current.shown).toBe('fit');

    expect(onFocus).toHaveBeenCalledTimes(1);
    expect(onFocus).toHaveBeenCalledWith(FOCUS_EVENT);
    expect(onBlur).toHaveBeenCalledTimes(1);
    expect(onBlur).toHaveBeenCalledWith(BLUR_EVENT);
  });

  it("MA-179: 'fit' at font scale 2 puts the hidden text's caret at its start at rest, frees it while focused and puts it back after the blur", async () => {
    const { hook } = await mountValueAtRest({ valueAtRest: 'fit', value: LIMIT, fontScale: 2 });
    expect(hook.result.current.restSelection).toEqual(INPUT_REST_SELECTION);

    await act(() => defined(hook.result.current.onFocus, 'onFocus')(FOCUS_EVENT));
    expect(hook.result.current.restSelection).toBeUndefined();

    await act(() => defined(hook.result.current.onBlur, 'onBlur')(BLUR_EVENT));
    expect(hook.result.current.restSelection).toEqual(INPUT_REST_SELECTION);
  });

  it('MA-179: with no valueAtRest the caret is left to the caller at font scale 2', async () => {
    const { hook } = await mountValueAtRest({ valueAtRest: undefined, value: LIMIT, fontScale: 2 });
    expect(hook.result.current.restSelection).toBeUndefined();
  });

  it.each([
    { case: 'at font scale 1', value: LIMIT, fontScale: 1 },
    { case: 'with an empty value', value: '', fontScale: 2 },
  ])("MA-179: 'fit' $case shows nothing", async ({ value, fontScale }) => {
    const { hook } = await mountValueAtRest({ valueAtRest: 'fit', value, fontScale });

    expect(hook.result.current.shown).toBeUndefined();
  });

  it("MA-179: 'start' at font scale 2 shows 'start' and takes no suffix layout", async () => {
    const { hook } = await mountValueAtRest({
      valueAtRest: 'start',
      value: 'Everyday Spending Smart Wallet',
      fontScale: 2,
    });

    expect(hook.result.current.shown).toBe('start');
    expect(hook.result.current.onSuffixLayout).toBeUndefined();
  });

  it("MA-179: the suffix's measured width of 64 ends the value at 64 inside the input's border, at the field padding before any layout", async () => {
    const { hook } = await mountValueAtRest({ valueAtRest: 'fit', value: LIMIT, fontScale: 2 });
    expect(hook.result.current.restTextEnd).toBe(INPUT_PADDING_INLINE + INPUT_BORDER_WIDTH);

    await act(() => defined(hook.result.current.onSuffixLayout, 'onSuffixLayout')(layoutEvent(64)));

    expect(hook.result.current.restTextEnd).toBe(64 + INPUT_BORDER_WIDTH);
  });
});
