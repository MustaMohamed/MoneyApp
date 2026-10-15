import type { ToastRootAnimation } from 'heroui-native';
import { FadeIn, FadeOut } from 'react-native-reanimated';

const TOAST_FADE_IN_MS = 200;
const TOAST_FADE_OUT_MS = 150;

/** A toast fades in and out where it rests, so it never crosses the add button, the tab bar or a floating alert. */
export const TOAST_ANIMATION = {
  entering: {
    top: FadeIn.duration(TOAST_FADE_IN_MS),
    bottom: FadeIn.duration(TOAST_FADE_IN_MS),
  },
  exiting: {
    top: FadeOut.duration(TOAST_FADE_OUT_MS),
    bottom: FadeOut.duration(TOAST_FADE_OUT_MS),
  },
} satisfies ToastRootAnimation;
