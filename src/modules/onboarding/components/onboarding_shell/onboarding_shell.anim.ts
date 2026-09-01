import { useEffect } from 'react';
import { Keyboard, Platform } from 'react-native';
import { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const KEYBOARD_LIFT_MS = 160;

/** Lifts the footer above the IME (mockup C3) via RN Keyboard events — reanimated v4 deprecates useAnimatedKeyboard and its replacement is a new dep (trigger 4); Screen already pads the bottom inset, so only the overshoot lifts and a closed keyboard is a strict no-op. */
export function useKeyboardLiftAnim() {
  const lift = useSharedValue(0);
  const { bottom } = useSafeAreaInsets();

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const show = Keyboard.addListener(showEvent, (e) => {
      lift.value = withTiming(Math.max(e.endCoordinates.height - bottom, 0), {
        duration: KEYBOARD_LIFT_MS,
      });
    });
    const hide = Keyboard.addListener(hideEvent, () => {
      lift.value = withTiming(0, { duration: KEYBOARD_LIFT_MS });
    });
    return () => {
      show.remove();
      hide.remove();
    };
  }, [lift, bottom]);

  return useAnimatedStyle(() => ({ paddingBottom: lift.value }));
}
