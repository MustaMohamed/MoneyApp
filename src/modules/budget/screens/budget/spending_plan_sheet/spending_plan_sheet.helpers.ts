import { Strings } from '@/constants/strings';
import {
  isStillTypingDecimal,
  parseDecimalText,
  parseNonNegativeDecimal,
} from '@/utils/parse_decimal';

/** 2dp overrides EGP's 0dp on the live running total, where `45.40` would render as `45`. */
export const SPENDING_PLAN_ALLOCATION_DECIMALS = 2;

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
