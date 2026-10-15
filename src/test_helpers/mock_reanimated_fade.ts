/** Stands in for `react-native-reanimated` in a suite that loads `toast.anim.ts`: the real module and its own mock throw at import under Jest. */
export function mockReanimatedFade() {
  return {
    FadeIn: { duration: (ms: number) => ({ fade: 'in', ms }) },
    FadeOut: { duration: (ms: number) => ({ fade: 'out', ms }) },
  };
}
