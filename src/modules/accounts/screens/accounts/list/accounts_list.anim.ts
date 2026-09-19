import { useCallback, useEffect, useMemo } from 'react';
import type { LayoutChangeEvent, ScrollView } from 'react-native';
import { Gesture, type PanGesture } from 'react-native-gesture-handler';
import {
  type FrameInfo,
  measure,
  scrollTo,
  type SharedValue,
  useAnimatedRef,
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useScrollOffset,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { ACCOUNTS_LIST_EDGE_SCROLL, ACCOUNTS_LIST_GRIP_HIT_SLOP } from './accounts_list.geometry';
import {
  resolveDropIndex,
  resolveEdgeScrollOffset,
  resolveEdgeScrollRate,
  resolveRowShift,
} from './accounts_list.reorder';

/** The FAB's long-press value (`fab.tsx`), so a long-press lifts after the same hold everywhere. */
const LIFT_LONG_PRESS_MS = 500;
const LIFT_SCALE = 1.02;
export const LIFT_DURATION_MS = 150;
export const SHIFT_DURATION_MS = 150;

/** One drag per screen; `-1` in both indices means no row is lifted. `translationY` is the finger's plus the edge scroll since the lift, in the card's coordinates. */
export interface ListDrag {
  liftedIndex: SharedValue<number>;
  targetIndex: SharedValue<number>;
  translationY: SharedValue<number>;
  cellHeight: SharedValue<number>;
  fingerTranslationY: SharedValue<number>;
  fingerAbsoluteY: SharedValue<number>;
  isHolding: SharedValue<boolean>;
  scrollOffset: SharedValue<number>;
  liftScrollOffset: SharedValue<number>;
  edgeScrollOffset: SharedValue<number>;
  viewportTop: SharedValue<number>;
  viewportHeight: SharedValue<number>;
  firstRowTop: SharedValue<number>;
  lastRowBottom: SharedValue<number>;
  reducedMotion: boolean;
}

/** `isLifted` is the React side's `liftedId !== undefined`: styles snap to rest the commit it turns false. `hasScroll` is whether a `ScreenScroll` mounts to take `scrollRef`. */
export function useAccountsListDragAnim(input: {
  isLifted: boolean;
  count: number;
  hasScroll: boolean;
}) {
  const { isLifted, count, hasScroll } = input;
  const liftedIndex = useSharedValue(-1);
  const targetIndex = useSharedValue(-1);
  const translationY = useSharedValue(0);
  const cellHeight = useSharedValue(0);
  const fingerTranslationY = useSharedValue(0);
  const fingerAbsoluteY = useSharedValue(0);
  const isHolding = useSharedValue(false);
  const liftScrollOffset = useSharedValue(0);
  const edgeScrollOffset = useSharedValue(0);
  const viewportTop = useSharedValue(0);
  const viewportHeight = useSharedValue(0);
  const firstRowTop = useSharedValue(0);
  const lastRowBottom = useSharedValue(0);
  const reducedMotion = useReducedMotion();
  const scrollRef = useAnimatedRef<ScrollView>();
  // A ref with no mounted scroll view warns once per mount, so the error and no-accounts states pass none.
  const scrollOffset = useScrollOffset(hasScroll ? scrollRef : null);

  const drag: ListDrag = useMemo(
    () => ({
      liftedIndex,
      targetIndex,
      translationY,
      cellHeight,
      fingerTranslationY,
      fingerAbsoluteY,
      isHolding,
      scrollOffset,
      liftScrollOffset,
      edgeScrollOffset,
      viewportTop,
      viewportHeight,
      firstRowTop,
      lastRowBottom,
      reducedMotion,
    }),
    [
      cellHeight,
      edgeScrollOffset,
      fingerAbsoluteY,
      fingerTranslationY,
      firstRowTop,
      isHolding,
      lastRowBottom,
      liftScrollOffset,
      liftedIndex,
      reducedMotion,
      scrollOffset,
      targetIndex,
      translationY,
      viewportHeight,
      viewportTop,
    ],
  );

  // Steps from the offset it last requested, never the live one, so scroll-event latency cannot slow it.
  const onFrame = useCallback(
    (frame: FrameInfo) => {
      'worklet';
      if (!drag.isHolding.value) return;
      if (drag.viewportHeight.value === 0) {
        const viewport = measure(scrollRef);
        if (viewport === null) return;
        drag.viewportTop.value = viewport.pageY;
        drag.viewportHeight.value = viewport.height;
      }
      const elapsedMs = frame.timeSincePreviousFrame;
      if (elapsedMs === null) return;
      const rate = resolveEdgeScrollRate({
        fingerY: drag.fingerAbsoluteY.value - drag.viewportTop.value,
        viewportHeight: drag.viewportHeight.value,
        zoneHeight: ACCOUNTS_LIST_EDGE_SCROLL.zoneHeight,
        maxRate: ACCOUNTS_LIST_EDGE_SCROLL.maxRatePerSecond,
      });
      if (rate === 0) {
        drag.edgeScrollOffset.value = drag.scrollOffset.value;
        return;
      }
      const next = resolveEdgeScrollOffset({
        offset: drag.edgeScrollOffset.value,
        step: (rate * elapsedMs) / 1000,
        firstRowTop: drag.firstRowTop.value,
        lastRowBottom: drag.lastRowBottom.value,
        viewportHeight: drag.viewportHeight.value,
      });
      if (next !== drag.edgeScrollOffset.value) {
        drag.edgeScrollOffset.value = next;
        scrollTo(scrollRef, 0, next, false);
      }
      drag.translationY.value =
        drag.fingerTranslationY.value + (drag.edgeScrollOffset.value - drag.liftScrollOffset.value);
      drag.targetIndex.value = resolveDropIndex({
        fromIndex: drag.liftedIndex.value,
        translationY: drag.translationY.value,
        cellHeight: drag.cellHeight.value,
        count,
      });
    },
    [count, drag, scrollRef],
  );
  const frameCallback = useFrameCallback(onFrame, false);

  // The only reset of the indices: the gesture leaves them parked until the commit that clears the lift.
  useEffect(() => {
    frameCallback.setActive(isLifted);
    if (isLifted) return;
    liftedIndex.value = -1;
    targetIndex.value = -1;
    translationY.value = 0;
    isHolding.value = false;
    fingerTranslationY.value = 0;
    fingerAbsoluteY.value = 0;
    viewportTop.value = 0;
    viewportHeight.value = 0;
  }, [
    fingerAbsoluteY,
    fingerTranslationY,
    frameCallback,
    isHolding,
    isLifted,
    liftedIndex,
    targetIndex,
    translationY,
    viewportHeight,
    viewportTop,
  ]);

  const onCardLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const { y, height } = e.nativeEvent.layout;
      firstRowTop.value = y;
      lastRowBottom.value = y + height;
    },
    [firstRowTop, lastRowBottom],
  );

  const slotStyle = useAnimatedStyle(
    () => ({
      height: cellHeight.value,
      opacity: isLifted ? 1 : 0,
      transform: [{ translateY: isLifted ? targetIndex.value * cellHeight.value : 0 }],
    }),
    [isLifted],
  );

  const liftedStyle = useAnimatedStyle(() => {
    if (!isLifted) return { opacity: 0, transform: [{ translateY: 0 }, { scale: 1 }] };
    const timed = (value: number) =>
      reducedMotion ? value : withTiming(value, { duration: LIFT_DURATION_MS });
    return {
      opacity: timed(1),
      transform: [
        { translateY: liftedIndex.value * cellHeight.value + translationY.value },
        { scale: timed(LIFT_SCALE) },
      ],
    };
  }, [isLifted, reducedMotion]);

  return { drag, slotStyle, liftedStyle, scrollRef, onCardLayout };
}

/** `onFinalize` is the one exit: a cancel and a drop both release, so the lift always clears. Only the row that owns the lift writes the drag. */
export function useLiftGesture(input: {
  drag: ListDrag;
  id: string;
  index: number;
  count: number;
  enabled: boolean;
  onLift: (id: string) => void;
  onRelease: (id: string, fromIndex: number, toIndex: number) => Promise<void>;
}): { gesture: PanGesture; onLayout: (e: LayoutChangeEvent) => void } {
  const { drag, id, index, count, enabled, onLift, onRelease } = input;
  const rowHeight = useSharedValue(0);

  const onLayout = useCallback(
    (e: LayoutChangeEvent) => {
      rowHeight.value = e.nativeEvent.layout.height;
    },
    [rowHeight],
  );

  const gesture = useMemo(
    () =>
      Gesture.Pan()
        .activateAfterLongPress(LIFT_LONG_PRESS_MS)
        .enabled(enabled)
        .shouldCancelWhenOutside(false)
        // RNGH hit-tests the detector's own box; the pressable's `hitSlop` never reaches it.
        .hitSlop(ACCOUNTS_LIST_GRIP_HIT_SLOP)
        .onStart((e) => {
          'worklet';
          if (drag.liftedIndex.value === -1) {
            drag.liftedIndex.value = index;
            drag.targetIndex.value = index;
            drag.translationY.value = 0;
            drag.cellHeight.value = rowHeight.value;
            drag.isHolding.value = true;
            drag.fingerTranslationY.value = 0;
            drag.fingerAbsoluteY.value = e.absoluteY;
            drag.liftScrollOffset.value = drag.scrollOffset.value;
            drag.edgeScrollOffset.value = drag.scrollOffset.value;
          }
          scheduleOnRN(onLift, id);
        })
        .onUpdate((e) => {
          'worklet';
          if (drag.liftedIndex.value !== index) return;
          drag.fingerTranslationY.value = e.translationY;
          drag.fingerAbsoluteY.value = e.absoluteY;
          drag.translationY.value =
            e.translationY + (drag.edgeScrollOffset.value - drag.liftScrollOffset.value);
          drag.targetIndex.value = resolveDropIndex({
            fromIndex: index,
            translationY: drag.translationY.value,
            cellHeight: drag.cellHeight.value,
            count,
          });
        })
        .onFinalize((_e, success) => {
          'worklet';
          const ownsLift = drag.liftedIndex.value === index;
          const to = ownsLift && success ? drag.targetIndex.value : index;
          // Parks the copy in the slot until React commits.
          if (ownsLift) {
            drag.isHolding.value = false;
            drag.targetIndex.value = to;
            drag.translationY.value = (to - index) * drag.cellHeight.value;
          }
          scheduleOnRN(onRelease, id, index, to);
        }),
    [count, drag, enabled, id, index, onLift, onRelease, rowHeight],
  );

  return { gesture, onLayout };
}

/** Rows between the lift and the slot shift a cell toward the lift; the lifted row hides under its copy. */
export function useRowShiftStyle(input: { drag: ListDrag; index: number; isLifted: boolean }) {
  const { drag, index, isLifted } = input;
  const { liftedIndex, targetIndex, cellHeight, reducedMotion } = drag;

  return useAnimatedStyle(() => {
    if (!isLifted) return { opacity: 1, transform: [{ translateY: 0 }] };
    const timed = (value: number) =>
      reducedMotion ? value : withTiming(value, { duration: SHIFT_DURATION_MS });
    const shift = resolveRowShift({
      index,
      fromIndex: liftedIndex.value,
      toIndex: targetIndex.value,
    });
    return {
      opacity: timed(liftedIndex.value === index ? 0 : 1),
      transform: [{ translateY: timed(shift * cellHeight.value) }],
    };
  }, [index, isLifted, reducedMotion]);
}
