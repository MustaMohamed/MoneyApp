import { renderHook } from '@testing-library/react-native';
import type { GestureResponderEvent } from 'react-native';

import {
  DRAG_CANCEL_DISTANCE,
  isDragPastThreshold,
  useDragCancelledPress,
} from '@/utils/use_drag_cancelled_press.hook';

const touchAt = (pageX: number, pageY = 200, timestamp?: number) =>
  ({ nativeEvent: { pageX, pageY, timestamp } }) as GestureResponderEvent;

async function renderPress() {
  const onPress = jest.fn();
  const feedback = { onPressIn: jest.fn(), onPressOut: jest.fn() };
  const { result } = await renderHook(() => useDragCancelledPress(onPress, feedback));
  return { onPress, feedback, result };
}

describe('isDragPastThreshold', () => {
  it('reads a horizontal move of 10 dp or more as a drag, in either direction', () => {
    expect(DRAG_CANCEL_DISTANCE).toBe(10);
    expect(isDragPastThreshold(0, 10)).toBe(true);
    expect(isDragPastThreshold(0, -10)).toBe(true);
    expect(isDragPastThreshold(100, 112)).toBe(true);
  });

  it('reads a shorter move as a tap', () => {
    expect(isDragPastThreshold(0, 9.9)).toBe(false);
    expect(isDragPastThreshold(0, -9.9)).toBe(false);
    expect(isDragPastThreshold(100, 100)).toBe(false);
  });
});

describe('useDragCancelledPress', () => {
  it('a 12 dp horizontal move cancels the press and ends the pressed look once', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100));
    result.current.onPressMove(touchAt(112));
    expect(feedback.onPressOut).toHaveBeenCalledTimes(1);

    result.current.onPressOut(touchAt(112));
    result.current.onPress();

    expect(onPress).not.toHaveBeenCalled();
    expect(feedback.onPressIn).toHaveBeenCalledTimes(1);
    expect(feedback.onPressOut).toHaveBeenCalledTimes(1);
  });

  it('a leftward drag cancels like a rightward one', async () => {
    const { onPress, result } = await renderPress();

    result.current.onPressIn(touchAt(100));
    result.current.onPressMove(touchAt(88));
    result.current.onPressOut(touchAt(88));
    result.current.onPress();

    expect(onPress).not.toHaveBeenCalled();
  });

  it('a drag stays cancelled when later moves come back inside 10 dp', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100));
    result.current.onPressMove(touchAt(112));
    result.current.onPressMove(touchAt(140));
    result.current.onPressMove(touchAt(101));
    result.current.onPressOut(touchAt(101));
    result.current.onPress();

    expect(onPress).not.toHaveBeenCalled();
    expect(feedback.onPressOut).toHaveBeenCalledTimes(1);
  });

  it('a 5 dp move is still a tap', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100));
    result.current.onPressMove(touchAt(105));
    expect(feedback.onPressOut).not.toHaveBeenCalled();

    result.current.onPressOut(touchAt(105));
    result.current.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(feedback.onPressOut).toHaveBeenCalledTimes(1);
  });

  it('a press with no move fires press-in, press-out and the press once each', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100));
    result.current.onPressOut(touchAt(100));
    result.current.onPress();

    expect(feedback.onPressIn).toHaveBeenCalledTimes(1);
    expect(feedback.onPressOut).toHaveBeenCalledTimes(1);
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a press with no press-in before it, as the screen reader sends, fires', async () => {
    const { onPress, result } = await renderPress();

    result.current.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a screen reader press after a drag that ended on press-out alone fires', async () => {
    const { onPress, result } = await renderPress();

    result.current.onPressIn(touchAt(100));
    result.current.onPressMove(touchAt(112));
    result.current.onPressOut(touchAt(112));
    await Promise.resolve();
    result.current.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a move that changes only the vertical position never cancels', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100, 200));
    result.current.onPressMove(touchAt(100, 260));
    expect(feedback.onPressOut).not.toHaveBeenCalled();

    result.current.onPressOut(touchAt(100, 260));
    result.current.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(feedback.onPressOut).toHaveBeenCalledTimes(1);
  });

  it('a tap after a cancelled drag fires', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100));
    result.current.onPressMove(touchAt(112));
    result.current.onPressOut(touchAt(112));
    result.current.onPress();
    expect(onPress).not.toHaveBeenCalled();

    result.current.onPressIn(touchAt(100));
    result.current.onPressOut(touchAt(100));
    result.current.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(feedback.onPressIn).toHaveBeenCalledTimes(2);
    expect(feedback.onPressOut).toHaveBeenCalledTimes(2);
  });

  it('a press-in on the move that brings a cancelled touch back into the row keeps the cancel', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100, 200));
    result.current.onPressMove(touchAt(115, 200));
    result.current.onPressMove(touchAt(115, 260));
    result.current.onPressOut(touchAt(115, 260));
    await Promise.resolve();
    const reentry = touchAt(115, 200);
    result.current.onPressMove(reentry);
    result.current.onPressIn(reentry);
    result.current.onPressOut(touchAt(115, 200));
    result.current.onPress();

    expect(onPress).not.toHaveBeenCalled();
    expect(feedback.onPressIn).toHaveBeenCalledTimes(1);
    expect(feedback.onPressOut).toHaveBeenCalledTimes(1);
  });

  it('a press-in of a new touch after that re-entry clears the cancel', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100, 200));
    result.current.onPressMove(touchAt(115, 200));
    result.current.onPressOut(touchAt(115, 260));
    await Promise.resolve();
    const reentry = touchAt(115, 200);
    result.current.onPressMove(reentry);
    result.current.onPressIn(reentry);
    result.current.onPressOut(touchAt(115, 200));
    result.current.onPress();
    await Promise.resolve();

    result.current.onPressIn(touchAt(100, 200));
    result.current.onPressOut(touchAt(100, 200));
    result.current.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(feedback.onPressIn).toHaveBeenCalledTimes(2);
  });

  it('a press-out the leave delayed past a kept re-entry leaves the cancel set', async () => {
    const { onPress, feedback, result } = await renderPress();

    result.current.onPressIn(touchAt(100, 200, 0));
    result.current.onPressMove(touchAt(115, 200, 20));
    const leave = touchAt(115, 260, 40);
    result.current.onPressMove(leave);
    const reentry = touchAt(115, 200, 60);
    result.current.onPressMove(reentry);
    result.current.onPressIn(reentry);
    result.current.onPressOut(leave);
    await Promise.resolve();
    result.current.onPressOut(touchAt(115, 200, 200));
    result.current.onPress();

    expect(onPress).not.toHaveBeenCalled();
    expect(feedback.onPressOut).toHaveBeenCalledTimes(1);
  });

  it('a screen reader press after a drag that left, kept moving and lifted outside fires', async () => {
    const { onPress, result } = await renderPress();

    result.current.onPressIn(touchAt(100, 200, 0));
    result.current.onPressMove(touchAt(115, 200, 20));
    const leave = touchAt(115, 260, 40);
    result.current.onPressMove(leave);
    result.current.onPressMove(touchAt(115, 300, 60));
    result.current.onPressOut(leave);
    await Promise.resolve();
    result.current.onPress();

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('a re-entry press-in before the drag reached 10 dp keeps the touch-down as the start', async () => {
    const { onPress, result } = await renderPress();

    result.current.onPressIn(touchAt(100, 200));
    result.current.onPressMove(touchAt(108, 200));
    result.current.onPressMove(touchAt(108, 260));
    result.current.onPressOut(touchAt(108, 260));
    await Promise.resolve();
    const reentry = touchAt(108, 200);
    result.current.onPressMove(reentry);
    result.current.onPressIn(reentry);
    result.current.onPressMove(touchAt(116, 200));
    result.current.onPressOut(touchAt(116, 200));
    result.current.onPress();

    expect(onPress).not.toHaveBeenCalled();
  });

  it('a press-out the leave delayed past a re-entry under 10 dp leaves a later cancel set', async () => {
    const { onPress, result } = await renderPress();

    result.current.onPressIn(touchAt(100, 200, 0));
    result.current.onPressMove(touchAt(108, 200, 20));
    const leave = touchAt(108, 260, 40);
    result.current.onPressMove(leave);
    const reentry = touchAt(108, 200, 60);
    result.current.onPressMove(reentry);
    result.current.onPressIn(reentry);
    result.current.onPressMove(touchAt(116, 200, 80));
    result.current.onPressOut(leave);
    await Promise.resolve();
    result.current.onPressOut(touchAt(116, 200, 200));
    result.current.onPress();

    expect(onPress).not.toHaveBeenCalled();
  });

  it('with no feedback handlers a drag still cancels and a tap still fires', async () => {
    const onPress = jest.fn();
    const { result } = await renderHook(() => useDragCancelledPress(onPress));

    result.current.onPressIn(touchAt(100));
    result.current.onPressMove(touchAt(112));
    result.current.onPressOut(touchAt(112));
    result.current.onPress();
    expect(onPress).not.toHaveBeenCalled();

    result.current.onPressIn(touchAt(100));
    result.current.onPressOut(touchAt(100));
    result.current.onPress();
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
