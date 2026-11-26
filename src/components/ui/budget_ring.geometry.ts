import { Size, Spacing } from '@/constants/theme';

// The ring's hole less 2 dp each side, so a label shrinks to fit rather than wrap onto the stroke.
export function budgetRingLabelMaxWidth(
  size: number,
  stroke: number = Size.budgetRingStroke,
): number {
  return size - 2 * (stroke + Spacing.xxxs);
}
