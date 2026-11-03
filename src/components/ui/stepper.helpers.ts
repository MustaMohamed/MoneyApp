/** The count's cell, F2's `.sv`, wide enough that a third digit does not move the buttons. */
export const STEPPER_VALUE_MIN_WIDTH = 52;

/** Each button stays open while one more step keeps the count within the caller's floor and, when set, its ceiling. */
export function resolveStepperEnds(
  value: number,
  min: number,
  max: number | undefined,
): { canDecrease: boolean; canIncrease: boolean } {
  return { canDecrease: value > min, canIncrease: max === undefined || value < max };
}
