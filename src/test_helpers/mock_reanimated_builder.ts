/** Stands in for a Reanimated entering builder (`FadeInDown`, `FadeInUp`): each link records its argument, since returning `this` would leave chain parameters unasserted. */
export function mockEnteringBuilder() {
  return {
    duration(durationMs: number) {
      return { ...this, durationMs };
    },
    delay(delayMs: number) {
      return { ...this, delayMs };
    },
    withInitialValues(initialValues: { translateY: number }) {
      return { ...this, initialValues };
    },
  };
}
