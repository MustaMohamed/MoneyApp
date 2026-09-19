import { act, renderHook } from '@testing-library/react-native';
import type { LayoutChangeEvent } from 'react-native';

// Reanimated's mock lacks `useReducedMotion`, RNGH has no jest mock; jest.mock factories need `mock*` names.
const mockUseReducedMotion = jest.fn<boolean, []>();
const mockWithTiming = jest.fn((value: number, _config?: unknown) => value);
let mockInHop = false;
const mockScheduleOnRN = jest.fn((fn: (...args: unknown[]) => unknown, ...args: unknown[]) => {
  mockInHop = true;
  try {
    return fn(...args);
  } finally {
    mockInHop = false;
  }
});

type MockShared = {
  value: number;
  get: () => number;
  set: (next: number | ((prev: number) => number)) => void;
};

type MockPan = {
  calls: { name: string; args: unknown[] }[];
  handlers: Partial<Record<string, (...args: unknown[]) => unknown>>;
};

jest.mock('react-native-reanimated', () => {
  const { useRef } = jest.requireActual<typeof import('react')>('react');
  return {
    // Stable across renders like the real one, so a write between renders is read on the next.
    useSharedValue: (initial: number) => {
      const ref = useRef<MockShared | null>(null);
      if (ref.current === null) {
        const shared: MockShared = {
          value: initial,
          get: () => shared.value,
          set: (next) => {
            shared.value = typeof next === 'function' ? next(shared.value) : next;
          },
        };
        ref.current = shared;
      }
      return ref.current;
    },
    useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
    useReducedMotion: () => mockUseReducedMotion(),
    withTiming: (value: number, config?: unknown) => mockWithTiming(value, config),
  };
});

jest.mock('react-native-worklets', () => ({
  scheduleOnRN: (fn: (...args: unknown[]) => unknown, ...args: unknown[]) =>
    mockScheduleOnRN(fn, ...args),
}));

jest.mock('react-native-gesture-handler', () => {
  const chainMethods = [
    'activateAfterLongPress',
    'enabled',
    'shouldCancelWhenOutside',
    'minDistance',
    'activeOffsetY',
    'failOffsetX',
    'hitSlop',
    'runOnJS',
    'withTestId',
    'simultaneousWithExternalGesture',
    'requireExternalGestureToFail',
    'blocksExternalGesture',
  ];
  const callbackMethods = [
    'onBegin',
    'onStart',
    'onUpdate',
    'onChange',
    'onEnd',
    'onFinalize',
    'onTouchesDown',
    'onTouchesMove',
    'onTouchesUp',
    'onTouchesCancelled',
  ];
  return {
    Gesture: {
      Pan: () => {
        const pan: MockPan & Record<string, unknown> = { calls: [], handlers: {} };
        for (const name of chainMethods) {
          pan[name] = (...args: unknown[]) => {
            pan.calls.push({ name, args });
            return pan;
          };
        }
        for (const name of callbackMethods) {
          pan[name] = (callback: (...args: unknown[]) => unknown) => {
            pan.calls.push({ name, args: [callback] });
            pan.handlers[name] = callback;
            return pan;
          };
        }
        return pan;
      },
    },
  };
});

import {
  LIFT_DURATION_MS,
  type ListDrag,
  SHIFT_DURATION_MS,
  useAccountsListDragAnim,
  useLiftGesture,
  useRowShiftStyle,
} from '@/modules/accounts/screens/accounts/list/accounts_list.anim';

const CELL = 65;
const COUNT = 5;
const ROW_ID = 'account-b';
const REST = { opacity: 1, transform: [{ translateY: 0 }] };

type ScreenProps = {
  isLifted: boolean;
  index: number;
  enabled: boolean;
  onLift: jest.Mock;
  onRelease: jest.Mock;
};

function useScreen(props: ScreenProps) {
  const { drag, slotStyle, liftedStyle } = useAccountsListDragAnim({ isLifted: props.isLifted });
  const lift = useLiftGesture({
    drag,
    id: ROW_ID,
    index: props.index,
    count: COUNT,
    enabled: props.enabled,
    onLift: props.onLift,
    onRelease: props.onRelease,
  });
  const rows = [
    useRowShiftStyle({ drag, index: 0, isLifted: props.isLifted }),
    useRowShiftStyle({ drag, index: 1, isLifted: props.isLifted }),
    useRowShiftStyle({ drag, index: 2, isLifted: props.isLifted }),
    useRowShiftStyle({ drag, index: 3, isLifted: props.isLifted }),
    useRowShiftStyle({ drag, index: 4, isLifted: props.isLifted }),
  ];
  return { drag, slotStyle, liftedStyle, lift, rows };
}

async function renderScreen(overrides: Partial<ScreenProps> = {}) {
  const props: ScreenProps = {
    isLifted: false,
    index: 1,
    enabled: true,
    // Each call returns whether it ran inside the scheduleOnRN hop.
    onLift: jest.fn(() => mockInHop),
    onRelease: jest.fn(() => mockInHop),
    ...overrides,
  };
  const view = await renderHook(useScreen, { initialProps: props });
  return {
    ...view,
    props,
    setLifted: (isLifted: boolean) => view.rerender({ ...props, isLifted }),
    pan: () => view.result.current.lift.gesture as unknown as MockPan,
  };
}

type Screen = Awaited<ReturnType<typeof renderScreen>>;

function handler(screen: Screen, name: string) {
  const callback = screen.pan().handlers[name];
  if (!callback) throw new Error(`the pan has no ${name} callback`);
  return callback;
}

function argsOf(screen: Screen, name: string) {
  return screen
    .pan()
    .calls.filter((call) => call.name === name)
    .map((call) => call.args);
}

const layoutOf = (height: number) =>
  ({ nativeEvent: { layout: { x: 0, y: 0, width: 320, height } } }) as LayoutChangeEvent;

async function dragBy(screen: Screen, translationY: number) {
  await act(() => {
    screen.result.current.lift.onLayout(layoutOf(CELL));
  });
  await act(() => {
    handler(screen, 'onStart')({ translationY: 0 });
  });
  await act(() => {
    handler(screen, 'onUpdate')({ translationY });
  });
}

async function finalize(screen: Screen, success: boolean) {
  await act(() => {
    handler(screen, 'onFinalize')({ translationY: 0 }, success);
  });
}

function valuesOf(drag: ListDrag) {
  return {
    liftedIndex: drag.liftedIndex.value,
    targetIndex: drag.targetIndex.value,
    translationY: drag.translationY.value,
  };
}

async function liftedAt(screen: Screen, from: number, to: number) {
  const { drag } = screen.result.current;
  drag.cellHeight.value = CELL;
  drag.liftedIndex.value = from;
  drag.targetIndex.value = to;
  drag.translationY.value = (to - from) * CELL;
  await screen.setLifted(true);
}

beforeEach(() => {
  mockUseReducedMotion.mockReset();
  mockUseReducedMotion.mockReturnValue(false);
  mockWithTiming.mockClear();
  mockScheduleOnRN.mockClear();
});

describe('useAccountsListDragAnim: the slot and the lifted copy (B6)', () => {
  it('puts the slot on the target cell and the copy under the finger at scale 1.02', async () => {
    const screen = await renderScreen();
    await dragBy(screen, 130);
    await screen.setLifted(true);

    expect(screen.result.current.slotStyle).toEqual({
      height: 65,
      opacity: 1,
      transform: [{ translateY: 195 }],
    });
    expect(screen.result.current.liftedStyle).toEqual({
      opacity: 1,
      transform: [{ translateY: 195 }, { scale: 1.02 }],
    });
    expect(mockWithTiming).toHaveBeenCalledWith(
      1.02,
      expect.objectContaining({ duration: LIFT_DURATION_MS }),
    );
  });

  it('lands the same slot and copy with no timing under reduced motion', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const screen = await renderScreen();
    await dragBy(screen, 130);
    await screen.setLifted(true);

    expect(screen.result.current.slotStyle).toEqual({
      height: 65,
      opacity: 1,
      transform: [{ translateY: 195 }],
    });
    expect(screen.result.current.liftedStyle).toEqual({
      opacity: 1,
      transform: [{ translateY: 195 }, { scale: 1.02 }],
    });
    expect(mockWithTiming).not.toHaveBeenCalled();
  });

  it('starts with no lift and resets the drag only when the lift clears', async () => {
    const screen = await renderScreen();
    const { drag } = screen.result.current;
    expect(valuesOf(drag)).toEqual({ liftedIndex: -1, targetIndex: -1, translationY: 0 });

    drag.liftedIndex.value = 1;
    drag.targetIndex.value = 3;
    drag.translationY.value = 130;
    await screen.setLifted(true);
    expect(valuesOf(drag)).toEqual({ liftedIndex: 1, targetIndex: 3, translationY: 130 });

    await screen.setLifted(false);
    expect(valuesOf(drag)).toEqual({ liftedIndex: -1, targetIndex: -1, translationY: 0 });
  });

  it('paints everything at rest, untimed, in the commit that clears the lift', async () => {
    const screen = await renderScreen();
    await liftedAt(screen, 1, 3);
    mockWithTiming.mockClear();

    await screen.setLifted(false);

    expect(screen.result.current.rows).toEqual([REST, REST, REST, REST, REST]);
    expect(screen.result.current.liftedStyle).toEqual({
      opacity: 0,
      transform: [{ translateY: 0 }, { scale: 1 }],
    });
    expect(screen.result.current.slotStyle).toMatchObject({
      opacity: 0,
      transform: [{ translateY: 0 }],
    });
    expect(mockWithTiming).not.toHaveBeenCalled();
  });
});

describe('useLiftGesture: the grip pan', () => {
  it('activates after a 500 ms long-press and keeps tracking outside the grip', async () => {
    const screen = await renderScreen();

    expect(argsOf(screen, 'activateAfterLongPress')).toEqual([[500]]);
    expect(argsOf(screen, 'enabled')).toEqual([[true]]);
    expect(argsOf(screen, 'shouldCancelWhenOutside')).toEqual([[false]]);
  });

  it('is disabled when the row cannot lift', async () => {
    const screen = await renderScreen({ enabled: false });

    expect(argsOf(screen, 'enabled')).toEqual([[false]]);
  });

  it('lifts once on start and releases once on a drop, parking the copy in the slot', async () => {
    const screen = await renderScreen();
    await dragBy(screen, 100);

    expect(screen.props.onLift).toHaveBeenCalledTimes(1);
    expect(screen.props.onLift).toHaveBeenCalledWith(ROW_ID);
    expect(screen.props.onRelease).not.toHaveBeenCalled();
    expect(screen.result.current.drag.cellHeight.value).toBe(CELL);

    await screen.setLifted(true);
    await finalize(screen, true);

    expect(screen.props.onLift).toHaveBeenCalledTimes(1);
    expect(screen.props.onRelease).toHaveBeenCalledTimes(1);
    expect(screen.props.onRelease).toHaveBeenCalledWith(ROW_ID, 1, 3);
    expect(valuesOf(screen.result.current.drag)).toEqual({
      liftedIndex: 1,
      targetIndex: 3,
      translationY: 130,
    });
  });

  it('crosses to the JS thread through scheduleOnRN for both the lift and the release', async () => {
    const screen = await renderScreen();
    await dragBy(screen, 130);
    await screen.setLifted(true);
    await finalize(screen, true);

    expect(screen.props.onLift.mock.results).toEqual([{ type: 'return', value: true }]);
    expect(screen.props.onRelease.mock.results).toEqual([{ type: 'return', value: true }]);
  });

  it('puts the row back where it started on a cancelled gesture', async () => {
    const screen = await renderScreen();
    await dragBy(screen, 100);
    await screen.setLifted(true);
    await finalize(screen, false);

    expect(screen.props.onRelease).toHaveBeenCalledTimes(1);
    expect(screen.props.onRelease).toHaveBeenCalledWith(ROW_ID, 1, 1);
    expect(valuesOf(screen.result.current.drag)).toEqual({
      liftedIndex: 1,
      targetIndex: 1,
      translationY: 0,
    });
  });

  it('keeps the target on the first row when dragged above it and on the last when dragged below', async () => {
    const screen = await renderScreen();
    await dragBy(screen, -400);
    expect(screen.result.current.drag.targetIndex.value).toBe(0);

    await act(() => {
      handler(screen, 'onUpdate')({ translationY: 1000 });
    });
    expect(screen.result.current.drag.targetIndex.value).toBe(COUNT - 1);

    await screen.setLifted(true);
    expect(screen.result.current.slotStyle).toMatchObject({
      transform: [{ translateY: (COUNT - 1) * CELL }],
    });
  });

  it('releases a grip that never lifted without touching the lift of another row', async () => {
    const screen = await renderScreen();
    await act(() => {
      screen.result.current.lift.onLayout(layoutOf(CELL));
    });
    await liftedAt(screen, 0, 2);
    await finalize(screen, false);

    expect(screen.props.onLift).not.toHaveBeenCalled();
    expect(screen.props.onRelease).toHaveBeenCalledTimes(1);
    expect(screen.props.onRelease).toHaveBeenCalledWith(ROW_ID, 1, 1);
    expect(valuesOf(screen.result.current.drag)).toEqual({
      liftedIndex: 0,
      targetIndex: 2,
      translationY: 130,
    });
  });

  it('releases a tap on the grip without writing the drag', async () => {
    const screen = await renderScreen();
    await finalize(screen, false);

    expect(screen.props.onLift).not.toHaveBeenCalled();
    expect(screen.props.onRelease).toHaveBeenCalledWith(ROW_ID, 1, 1);
    expect(valuesOf(screen.result.current.drag)).toEqual({
      liftedIndex: -1,
      targetIndex: -1,
      translationY: 0,
    });
  });
});

describe('useRowShiftStyle: rows make room for the lifted one', () => {
  it('shifts the rows between a downward lift and its target up one cell and hides the lifted row', async () => {
    const screen = await renderScreen();
    await liftedAt(screen, 1, 3);

    expect(screen.result.current.rows).toEqual([
      REST,
      { opacity: 0, transform: [{ translateY: 0 }] },
      { opacity: 1, transform: [{ translateY: -CELL }] },
      { opacity: 1, transform: [{ translateY: -CELL }] },
      REST,
    ]);
    expect(mockWithTiming).toHaveBeenCalledWith(
      -CELL,
      expect.objectContaining({ duration: SHIFT_DURATION_MS }),
    );
  });

  it('shifts the rows between an upward lift and its target down one cell', async () => {
    const screen = await renderScreen();
    await liftedAt(screen, 3, 1);

    expect(screen.result.current.rows).toEqual([
      REST,
      { opacity: 1, transform: [{ translateY: CELL }] },
      { opacity: 1, transform: [{ translateY: CELL }] },
      { opacity: 0, transform: [{ translateY: 0 }] },
      REST,
    ]);
  });

  it('lands the same shift with no timing under reduced motion', async () => {
    mockUseReducedMotion.mockReturnValue(true);
    const screen = await renderScreen();
    await liftedAt(screen, 1, 3);

    expect(screen.result.current.rows).toEqual([
      REST,
      { opacity: 0, transform: [{ translateY: 0 }] },
      { opacity: 1, transform: [{ translateY: -CELL }] },
      { opacity: 1, transform: [{ translateY: -CELL }] },
      REST,
    ]);
    expect(mockWithTiming).not.toHaveBeenCalled();
  });
});
