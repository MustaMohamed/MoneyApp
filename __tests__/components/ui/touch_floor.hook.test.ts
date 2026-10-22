import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';

import { useTouchFloorGridHitSlop } from '@/components/ui/touch_floor.hook';

const GAP = 6;
const EDGE = { top: 0, bottom: 12 };
const PILL_HEIGHT = 29.33;

function layoutEvent(y: number, height: number): LayoutChangeEvent {
  return { nativeEvent: { layout: { x: 0, y, width: 80, height } } } as LayoutChangeEvent;
}

describe('useTouchFloorGridHitSlop', () => {
  it('MA-236: before any layout every item takes half the gap on every side, with a layout handler', async () => {
    const hook = await renderHook(() => useTouchFloorGridHitSlop(GAP, EDGE));
    const half = { top: GAP / 2, bottom: GAP / 2, left: GAP / 2, right: GAP / 2 };

    expect(hook.result.current.item('first').hitSlop).toEqual(half);
    expect(hook.result.current.item('second').hitSlop).toEqual(half);
    expect(hook.result.current.item('first').onLayout).toEqual(expect.any(Function));
  });

  it('MA-236: after two rows lay out, the top row takes the edge room above and the bottom row the edge room below', async () => {
    const hook = await renderHook(() => useTouchFloorGridHitSlop(GAP, EDGE));

    await act(() => hook.result.current.item('first').onLayout(layoutEvent(0, PILL_HEIGHT)));
    await act(() => hook.result.current.item('second').onLayout(layoutEvent(35, PILL_HEIGHT)));

    const first = hook.result.current.item('first').hitSlop;
    const second = hook.result.current.item('second').hitSlop;
    expect(first.top).toBe(EDGE.top);
    expect(first.bottom).toBe(GAP / 2);
    expect(second.top).toBe(GAP / 2);
    expect(second.bottom).toBe(EDGE.bottom);
  });

  it('MA-236: when the bottom row leaves the mounted keys, the top row takes the bottom edge room', async () => {
    const hook = await renderHook(
      ({ keys }: { keys: string[] }) => useTouchFloorGridHitSlop(GAP, EDGE, undefined, keys),
      { initialProps: { keys: ['first', 'second'] } },
    );

    await act(() => hook.result.current.item('first').onLayout(layoutEvent(0, PILL_HEIGHT)));
    await act(() => hook.result.current.item('second').onLayout(layoutEvent(35, PILL_HEIGHT)));
    expect(hook.result.current.item('first').hitSlop.bottom).toBe(GAP / 2);

    await hook.rerender({ keys: ['first'] });

    expect(hook.result.current.item('first').hitSlop.bottom).toBe(EDGE.bottom);
  });
});
