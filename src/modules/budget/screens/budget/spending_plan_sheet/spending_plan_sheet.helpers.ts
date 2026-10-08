import { type ScaledTextStyle, scaledTextStyleAboveOne } from '@/components/ui/text_scale.geometry';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import {
  isStillTypingDecimal,
  parseDecimalText,
  parseNonNegativeDecimal,
} from '@/utils/parse_decimal';

/** 2dp overrides EGP's 0dp on the live running total, where `45.40` would render as `45`. */
export const SPENDING_PLAN_ALLOCATION_DECIMALS = 2;

export type SpendingPlanFieldKind = 'name' | 'amount' | 'allocation';

export interface SpendingPlanFieldGeometry {
  text: ScaledTextStyle | undefined;
  height: number;
}

const FIELD_FONT_SIZE: Record<SpendingPlanFieldKind, number> = {
  name: Type.body,
  amount: Type.bodyStrong,
  allocation: Type.caption,
};

/** `text` is `undefined` at or below scale 1, where the field's class size stands and the OS scales it. */
export function resolveSpendingPlanFieldGeometry(
  kind: SpendingPlanFieldKind,
  fontScale: number,
): SpendingPlanFieldGeometry {
  const text = scaledTextStyleAboveOne(FIELD_FONT_SIZE[kind], fontScale);
  const track =
    kind === 'allocation' ? Size.spendingPlanAllocationTrack : Size.spendingPlanFieldTrack;
  return {
    text,
    height: Math.max(
      track,
      (text?.lineHeight ?? 0) + 2 * Size.inputPaddingY + 2 * Size.fieldBorderWidth,
    ),
  };
}

export function resolveAllocationSlotMinHeight(fontScale: number): number {
  return (
    resolveSpendingPlanFieldGeometry('allocation', fontScale).height +
    Size.spendingPlanAllocationErrorRoom
  );
}

/** Above scale 1 a typed amount takes the suffix's room; the mask leaves `''` as the only empty field. */
export function showsAllocationSuffix(text: string, fontScale: number): boolean {
  return fontScale <= 1 || text === '';
}

export type AllocationValidation =
  | { ok: true; value: number | undefined }
  | { ok: false; incomplete: boolean; message: string };

/** Branch order is the contract: the classes overlap and `0.005` must reach the floor message. */
export function validateAllocationText(text: string): AllocationValidation {
  if (text.trim() === '') return { ok: true, value: undefined };

  const parsed = parseNonNegativeDecimal(text);
  if (parsed !== undefined) return { ok: true, value: parsed };

  if (isStillTypingDecimal(text, false)) {
    return { ok: false, incomplete: true, message: Strings.errAmountInvalid };
  }
  if (parseDecimalText(text) === undefined) {
    return { ok: false, incomplete: false, message: Strings.errAmountInvalid };
  }
  return { ok: false, incomplete: false, message: Strings.budgetPlanAllocationBelowMin };
}
