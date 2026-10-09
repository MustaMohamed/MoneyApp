import { useCallback, useRef } from 'react';
import type { GestureResponderEvent } from 'react-native';

// The horizontal move that ends a press; `SwipeableRow` starts its swipe at the same distance, RNGH's own default.
export const DRAG_CANCEL_DISTANCE = 10;

export function isDragPastThreshold(startX: number, pageX: number): boolean {
  return Math.abs(pageX - startX) >= DRAG_CANCEL_DISTANCE;
}

export interface DragCancelledPressFeedback {
  onPressIn?: () => void;
  onPressOut?: () => void;
}

export interface DragCancelledPressHandlers {
  onPressIn: (event: GestureResponderEvent) => void;
  onPressMove: (event: GestureResponderEvent) => void;
  onPressOut: (event: GestureResponderEvent) => void;
  onPress: () => void;
}

/** A press that a horizontal drag cancels: React Native alone fires `onPress` on any release inside the row. */
export function useDragCancelledPress(
  onPress: () => void,
  feedback?: DragCancelledPressFeedback,
): DragCancelledPressHandlers {
  const startX = useRef<number | undefined>(undefined);
  const lookEnded = useRef(false);
  const pressCancelled = useRef(false);
  const lastMove = useRef<GestureResponderEvent['nativeEvent'] | undefined>(undefined);
  const reentryAt = useRef<number | undefined>(undefined);
  const feedbackPressIn = feedback?.onPressIn;
  const feedbackPressOut = feedback?.onPressOut;

  const handlePressIn = useCallback(
    (event: GestureResponderEvent) => {
      // Pressability re-enters a row with the event of the move it just reported, so this press-in is the same touch's own.
      if (event.nativeEvent === lastMove.current) {
        reentryAt.current = event.nativeEvent.timestamp;
        if (lookEnded.current) {
          pressCancelled.current = true;
          return;
        }
      } else {
        startX.current = event.nativeEvent.pageX;
      }
      lookEnded.current = false;
      pressCancelled.current = false;
      feedbackPressIn?.();
    },
    [feedbackPressIn],
  );

  const handlePressMove = useCallback(
    (event: GestureResponderEvent) => {
      lastMove.current = event.nativeEvent;
      if (lookEnded.current || startX.current === undefined) return;
      if (!isDragPastThreshold(startX.current, event.nativeEvent.pageX)) return;
      lookEnded.current = true;
      pressCancelled.current = true;
      feedbackPressOut?.();
    },
    [feedbackPressOut],
  );

  const handlePressOut = useCallback(
    (event: GestureResponderEvent) => {
      if (!lookEnded.current) feedbackPressOut?.();
      // Pressability delays a leave's press-out by up to 130 ms, and one older than the re-entry after it is not the touch's end.
      if (event.nativeEvent.timestamp < (reentryAt.current ?? -Infinity)) return;
      // A terminated touch sends press-out and no press, so the cancel ends with this task and a later screen-reader press fires.
      queueMicrotask(() => {
        pressCancelled.current = false;
      });
    },
    [feedbackPressOut],
  );

  const handlePress = useCallback(() => {
    const cancelled = pressCancelled.current;
    pressCancelled.current = false;
    if (!cancelled) onPress();
  }, [onPress]);

  return {
    onPressIn: handlePressIn,
    onPressMove: handlePressMove,
    onPressOut: handlePressOut,
    onPress: handlePress,
  };
}
