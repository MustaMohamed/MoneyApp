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

type MockShared<T> = {
  value: T;
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
};

function mockSharedOf<T>(initial: T): MockShared<T> {
  const shared: MockShared<T> = {
    value: initial,
    get: () => shared.value,
    set: (next) => {
      shared.value = typeof next === 'function' ? (next as (prev: T) => T)(shared.value) : next;
    },
  };
  return shared;
}

type MockAnimatedRef = (() => unknown) & { current: unknown };

type MockMeasured = {
  x: number;
  y: number;
  width: number;
  height: number;
  pageX: number;
  pageY: number;
};

type MockFrameInfo = {
  timestamp: number;
  timeSincePreviousFrame: number | null;
  timeSinceFirstFrame: number;
};

type MockFrameHandle = {
  setActive: (active: boolean) => void;
  isActive: boolean;
  callbackId: number;
};

const mockMeasure = jest.fn<MockMeasured | null, [unknown]>();
const mockScrollTo = jest.fn<void, [unknown, number, number, boolean]>();
const mockSetActive = jest.fn<void, [boolean]>();
const mockUseScrollOffset = jest.fn<void, [unknown]>();
// The latest frame callback the hook registered and whether the registry would run it.
const mockFrame: { callback?: (frame: MockFrameInfo) => void; isActive: boolean } = {
  isActive: false,
};

type MockPan = {
  calls: { name: string; args: unknown[] }[];
  handlers: Partial<Record<string, (...args: unknown[]) => unknown>>;
};

jest.mock('react-native-reanimated', () => {
  const { useRef } = jest.requireActual<typeof import('react')>('react');
  return {
    // Stable across renders like the real one, so a write between renders is read on the next.
    useSharedValue: <T>(initial: T) => {
      const ref = useRef<MockShared<T> | null>(null);
      ref.current ??= mockSharedOf(initial);
      return ref.current;
    },
    useAnimatedStyle: (factory: () => Record<string, unknown>) => factory(),
    useReducedMotion: () => mockUseReducedMotion(),
    withTiming: (value: number, config?: unknown) => mockWithTiming(value, config),
    useAnimatedRef: () => {
      const ref = useRef<MockAnimatedRef | null>(null);
      if (ref.current === null) {
        const animatedRef: MockAnimatedRef = Object.assign(() => animatedRef.current, {
          current: null as unknown,
        });
        ref.current = animatedRef;
      }
      return ref.current;
    },
    useScrollOffset: (animatedRef: unknown, provided?: MockShared<number>) => {
      mockUseScrollOffset(animatedRef);
      const ref = useRef<MockShared<number> | null>(null);
      ref.current ??= mockSharedOf(0);
      return provided ?? ref.current;
    },
    useFrameCallback: (callback: (frame: MockFrameInfo) => void, autostart = true) => {
      const ref = useRef<MockFrameHandle | null>(null);
      if (ref.current === null) {
        const handle: MockFrameHandle = {
          setActive: (active) => {
            handle.isActive = active;
            mockFrame.isActive = active;
            mockSetActive(active);
          },
          isActive: autostart,
          callbackId: 1,
        };
        mockFrame.isActive = autostart;
        ref.current = handle;
      }
      mockFrame.callback = callback;
      return ref.current;
    },
    measure: (animatedRef: unknown) => mockMeasure(animatedRef),
    scrollTo: (animatedRef: unknown, x: number, y: number, animated: boolean) =>
      mockScrollTo(animatedRef, x, y, animated),
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
import {
  ACCOUNTS_LIST_EDGE_SCROLL,
  ACCOUNTS_LIST_GRIP_HIT_SLOP,
} from '@/modules/accounts/screens/accounts/list/accounts_list.geometry';

const CELL = 65;
const COUNT = 5;
const ROW_ID = 'account-b';
const REST = { opacity: 1, transform: [{ translateY: 0 }] };

const FRAME_MS = 16;
const STEP = (ACCOUNTS_LIST_EDGE_SCROLL.maxRatePerSecond * FRAME_MS) / 1000;
const VIEWPORT: MockMeasured = { x: 0, y: 0, width: 320, height: 480, pageX: 0, pageY: 100 };
const GRIP_ABSOLUTE_Y = VIEWPORT.pageY + VIEWPORT.height / 2;
const CARD_TOP = 150;
const CARD_HEIGHT = 20 * CELL;
const LAST_OFFSET = CARD_TOP + CARD_HEIGHT - VIEWPORT.height;
const OFFSET = 400;
const EDGE_REACH = 10;
// Frames of full-rate scroll after which a row lifted EDGE_REACH from its grip passes half a cell.
const FRAMES_TO_HALF_CELL = Math.ceil((CELL / 2 - EDGE_REACH) / STEP);

type ScreenProps = {
  isLifted: boolean;
  index: number;
  enabled: boolean;
  hasScroll: boolean;
  onLift: jest.Mock;
  onRelease: jest.Mock;
};

function useScreen(props: ScreenProps) {
  const { drag, slotStyle, liftedStyle, scrollRef, onCardLayout } = useAccountsListDragAnim({
    isLifted: props.isLifted,
    count: COUNT,
    hasScroll: props.hasScroll,
  });
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
  return { drag, slotStyle, liftedStyle, scrollRef, onCardLayout, lift, rows };
}

async function renderScreen(overrides: Partial<ScreenProps> = {}) {
  const props: ScreenProps = {
    isLifted: false,
    index: 1,
    enabled: true,
    hasScroll: true,
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

async function dragBy(screen: Screen, translationY: number, fromY = GRIP_ABSOLUTE_Y) {
  await act(() => {
    screen.result.current.lift.onLayout(layoutOf(CELL));
  });
  await act(() => {
    handler(screen, 'onStart')({ translationY: 0, absoluteY: fromY });
  });
  await act(() => {
    handler(screen, 'onUpdate')({ translationY, absoluteY: fromY + translationY });
  });
}

let frameClock = 0;

function runFrames(count: number) {
  const callback = mockFrame.callback;
  if (!callback) throw new Error('the hook registered no frame callback');
  for (let i = 0; i < count; i += 1) {
    if (!mockFrame.isActive) continue;
    frameClock += FRAME_MS;
    callback({
      timestamp: frameClock,
      timeSincePreviousFrame: FRAME_MS,
      timeSinceFirstFrame: frameClock,
    });
  }
}

// Lifts row 1 at scroll offset `offset` and leaves the finger at `fingerY` in the viewport, `reach` from its grip.
async function liftAndHold(screen: Screen, fingerY: number, reach: number, offset = OFFSET) {
  await act(() => {
    screen.result.current.onCardLayout({
      nativeEvent: { layout: { x: 0, y: CARD_TOP, width: 320, height: CARD_HEIGHT } },
    } as LayoutChangeEvent);
  });
  screen.result.current.drag.scrollOffset.value = offset;
  await dragBy(screen, reach, VIEWPORT.pageY + fingerY - reach);
  await screen.setLifted(true);
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
  mockMeasure.mockReset();
  mockMeasure.mockReturnValue(VIEWPORT);
  mockScrollTo.mockClear();
  mockSetActive.mockClear();
  mockUseScrollOffset.mockClear();
  mockFrame.callback = undefined;
  mockFrame.isActive = false;
  frameClock = 0;
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

  it('hit-tests the grip with the same insets the grip pressable uses', async () => {
    const screen = await renderScreen();

    expect(argsOf(screen, 'hitSlop')).toEqual([[ACCOUNTS_LIST_GRIP_HIT_SLOP]]);
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

describe('useLiftGesture: a second grip while another row owns the lift', () => {
  async function ownedByRowZero() {
    const screen = await renderScreen();
    await act(() => {
      screen.result.current.lift.onLayout(layoutOf(CELL + 10));
    });
    await liftedAt(screen, 0, 2);
    return screen;
  }
  const ownersDrag = { liftedIndex: 0, targetIndex: 2, translationY: 130 };

  it('asks to lift on start but writes nothing into the drag', async () => {
    const screen = await ownedByRowZero();

    await act(() => {
      handler(screen, 'onStart')({ translationY: 0 });
    });

    expect(screen.props.onLift).toHaveBeenCalledTimes(1);
    expect(screen.props.onLift).toHaveBeenCalledWith(ROW_ID);
    expect(valuesOf(screen.result.current.drag)).toEqual(ownersDrag);
    expect(screen.result.current.drag.cellHeight.value).toBe(CELL);
  });

  it('moves nothing on update', async () => {
    const screen = await ownedByRowZero();

    await act(() => {
      handler(screen, 'onStart')({ translationY: 0 });
    });
    await act(() => {
      handler(screen, 'onUpdate')({ translationY: 200 });
    });

    expect(valuesOf(screen.result.current.drag)).toEqual(ownersDrag);
  });

  it('releases in place on a successful end, leaving the owner its target', async () => {
    const screen = await ownedByRowZero();

    await act(() => {
      handler(screen, 'onStart')({ translationY: 0 });
    });
    await finalize(screen, true);

    expect(screen.props.onRelease).toHaveBeenCalledTimes(1);
    expect(screen.props.onRelease).toHaveBeenCalledWith(ROW_ID, 1, 1);
    expect(valuesOf(screen.result.current.drag)).toEqual(ownersDrag);
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

describe('useAccountsListDragAnim: edge scroll while a finger holds the lifted row (B6)', () => {
  it('measures nothing and scrolls nothing while no finger holds a row', async () => {
    const screen = await renderScreen();
    runFrames(3);
    await liftedAt(screen, 1, 3);
    runFrames(3);

    expect(mockMeasure).not.toHaveBeenCalled();
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(valuesOf(screen.result.current.drag)).toEqual({
      liftedIndex: 1,
      targetIndex: 3,
      translationY: 130,
    });
  });

  it('measures the scroll view once per lift, and again after the lift clears', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, VIEWPORT.height, EDGE_REACH);
    runFrames(3);

    expect(mockMeasure).toHaveBeenCalledTimes(1);
    expect(mockMeasure.mock.calls[0]?.[0]).toBe(screen.result.current.scrollRef);

    await finalize(screen, true);
    await screen.setLifted(false);
    await liftAndHold(screen, VIEWPORT.height, EDGE_REACH);
    runFrames(1);

    expect(mockMeasure).toHaveBeenCalledTimes(2);
  });

  it('scrolls nothing with the finger mid-viewport and keeps its offset on the live one', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, VIEWPORT.height / 2, 0);
    const { drag } = screen.result.current;
    runFrames(2);
    drag.scrollOffset.value = OFFSET + 40;
    runFrames(1);

    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(drag.edgeScrollOffset.value).toBe(OFFSET + 40);
    expect(valuesOf(drag)).toEqual({ liftedIndex: 1, targetIndex: 1, translationY: 0 });
  });

  it('scrolls down at the full rate on the bottom edge, stepping from its own last request', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, VIEWPORT.height, EDGE_REACH);
    const { drag, scrollRef } = screen.result.current;

    runFrames(1);
    expect(mockScrollTo).toHaveBeenLastCalledWith(
      scrollRef,
      0,
      expect.closeTo(OFFSET + STEP, 6),
      false,
    );
    expect(drag.translationY.value).toBeCloseTo(EDGE_REACH + STEP, 6);

    runFrames(1);
    expect(mockScrollTo).toHaveBeenLastCalledWith(
      scrollRef,
      0,
      expect.closeTo(OFFSET + 2 * STEP, 6),
      false,
    );
    expect(drag.translationY.value).toBeCloseTo(EDGE_REACH + 2 * STEP, 6);
    expect(drag.fingerTranslationY.value).toBe(EDGE_REACH);
    expect(drag.scrollOffset.value).toBe(OFFSET);
  });

  it('moves the slot down a row once the scrolled distance passes half a cell', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, VIEWPORT.height, EDGE_REACH);
    const { drag } = screen.result.current;

    runFrames(FRAMES_TO_HALF_CELL - 1);
    expect(drag.targetIndex.value).toBe(1);

    runFrames(1);
    expect(drag.targetIndex.value).toBe(2);

    await screen.setLifted(true);
    expect(screen.result.current.slotStyle).toMatchObject({
      transform: [{ translateY: 2 * CELL }],
    });
  });

  it('scrolls up at the full rate on the top edge and moves the slot up a row past half a cell', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, 0, -EDGE_REACH);
    const { drag, scrollRef } = screen.result.current;

    runFrames(1);
    expect(mockScrollTo).toHaveBeenLastCalledWith(
      scrollRef,
      0,
      expect.closeTo(OFFSET - STEP, 6),
      false,
    );
    expect(drag.translationY.value).toBeCloseTo(-EDGE_REACH - STEP, 6);
    expect(drag.fingerTranslationY.value).toBe(-EDGE_REACH);

    runFrames(FRAMES_TO_HALF_CELL - 2);
    expect(drag.targetIndex.value).toBe(1);

    runFrames(1);
    expect(drag.targetIndex.value).toBe(0);
  });

  it('stops scrolling up once the first row is fully on screen', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, 0, -EDGE_REACH, CARD_TOP + 2.5 * STEP);
    const { drag, scrollRef } = screen.result.current;
    runFrames(5);

    expect(mockScrollTo).toHaveBeenCalledTimes(3);
    expect(mockScrollTo).toHaveBeenLastCalledWith(scrollRef, 0, CARD_TOP, false);
    expect(drag.edgeScrollOffset.value).toBe(CARD_TOP);
    expect(drag.translationY.value).toBeCloseTo(-EDGE_REACH - 2.5 * STEP, 6);
  });

  it('stops scrolling down once the last row is fully on screen', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, VIEWPORT.height, EDGE_REACH, LAST_OFFSET - 2.5 * STEP);
    const { drag, scrollRef } = screen.result.current;
    runFrames(5);

    expect(mockScrollTo).toHaveBeenCalledTimes(3);
    expect(mockScrollTo).toHaveBeenLastCalledWith(scrollRef, 0, LAST_OFFSET, false);
    expect(drag.edgeScrollOffset.value).toBe(LAST_OFFSET);
    expect(drag.translationY.value).toBeCloseTo(EDGE_REACH + 2.5 * STEP, 6);
  });

  it('ends the hold on release: the next frame scrolls nothing and the copy parks in the slot', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, VIEWPORT.height, EDGE_REACH);
    const { drag } = screen.result.current;
    runFrames(FRAMES_TO_HALF_CELL);
    await finalize(screen, true);
    const scrolls = mockScrollTo.mock.calls.length;
    runFrames(3);

    expect(mockScrollTo).toHaveBeenCalledTimes(scrolls);
    expect(drag.isHolding.value).toBe(false);
    expect(screen.props.onRelease).toHaveBeenCalledTimes(1);
    expect(screen.props.onRelease).toHaveBeenCalledWith(ROW_ID, 1, 2);
    expect(valuesOf(drag)).toEqual({ liftedIndex: 1, targetIndex: 2, translationY: CELL });
  });

  it('keeps the scrolled distance on a later finger move, so moving back by it drops the row in place', async () => {
    const screen = await renderScreen();
    await liftAndHold(screen, VIEWPORT.height, EDGE_REACH);
    const { drag } = screen.result.current;
    runFrames(FRAMES_TO_HALF_CELL);
    const scrolled = drag.edgeScrollOffset.value - OFFSET;

    await act(() => {
      handler(
        screen,
        'onUpdate',
      )({
        translationY: EDGE_REACH - scrolled,
        absoluteY: VIEWPORT.pageY + VIEWPORT.height - scrolled,
      });
    });
    expect(drag.fingerTranslationY.value).toBeCloseTo(EDGE_REACH - scrolled, 6);
    expect(drag.translationY.value).toBeCloseTo(EDGE_REACH, 6);
    expect(drag.targetIndex.value).toBe(1);

    await finalize(screen, true);
    expect(screen.props.onRelease).toHaveBeenCalledWith(ROW_ID, 1, 1);
  });

  it('starts the frame callback on the lift and stops it in the commit that clears the lift', async () => {
    const screen = await renderScreen();
    expect(mockSetActive).not.toHaveBeenCalledWith(true);

    await dragBy(screen, 0);
    await screen.setLifted(true);
    expect(mockSetActive).toHaveBeenLastCalledWith(true);

    await finalize(screen, true);
    expect(mockSetActive).toHaveBeenLastCalledWith(true);

    await screen.setLifted(false);
    expect(mockSetActive).toHaveBeenLastCalledWith(false);
  });

  it('scrolls nothing on a null measure, does not throw, and measures again next frame', async () => {
    mockMeasure.mockReturnValue(null);
    const screen = await renderScreen();
    await liftAndHold(screen, VIEWPORT.height, EDGE_REACH);
    const { drag } = screen.result.current;

    expect(() => runFrames(2)).not.toThrow();
    expect(mockScrollTo).not.toHaveBeenCalled();
    expect(mockMeasure).toHaveBeenCalledTimes(2);
    expect(drag.translationY.value).toBe(EDGE_REACH);

    mockMeasure.mockReturnValue(VIEWPORT);
    runFrames(1);
    expect(mockScrollTo).toHaveBeenCalledTimes(1);
  });

  it('observes the scroll offset only when the screen mounts a scroll view', async () => {
    await renderScreen({ hasScroll: false });
    expect(mockUseScrollOffset).toHaveBeenCalled();
    expect(mockUseScrollOffset.mock.calls.every(([ref]) => ref === null)).toBe(true);

    mockUseScrollOffset.mockClear();
    const screen = await renderScreen();
    expect(mockUseScrollOffset.mock.lastCall?.[0]).toBe(screen.result.current.scrollRef);
  });
});
