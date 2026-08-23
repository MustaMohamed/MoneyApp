import { Strings } from '@/constants/strings';
import { parseDecimalText, parseNonNegativeDecimal } from '@/utils/parse_decimal';

/**
 * Fixed 2dp on the running-total line, overriding `CURRENCY_CONFIG`'s EGP
 * precision. It is a live-entry confirmation of what the user is typing, not
 * an at-rest amount: at 0dp a 45.40 allocation renders `'45'`, silently wrong
 * and never literally zero, so `formatDisplayMagnitude`'s escalate-on-zero
 * rule never fires. Recorded in `docs/adr/2026-08-22-money-rounding-layer.md`
 * Addendum A point 4; same shape as `N4_HERO_AMOUNT_DECIMALS`.
 */
export const SPENDING_PLAN_ALLOCATION_DECIMALS = 2;

export type AllocationValidation =
  | { ok: true; value: number | undefined }
  | { ok: false; incomplete: boolean; message: string };

/**
 * The verdict on one allocation row's raw text. Pure, so the hook can derive
 * the row's error message and the submit's pre-flight can gate the save on
 * the same function rather than on two rules that drift apart.
 *
 * `incomplete` marks a decimal the user is still part-way through (`'1.'`,
 * `'.'`). Those stay silent while typing and explain themselves only once a
 * Save is blocked — `'0.40'` passes through `'0.'` on the way in, and a rule
 * that rendered every failure on the keystroke would flash a message once per
 * amount entered.
 *
 * Branch order is the contract: the classes overlap, and `'0.005'` has to
 * reach the floor message rather than the format one.
 */
export function validateAllocationText(text: string): AllocationValidation {
  if (text.trim() === '') return { ok: true, value: undefined };

  const parsed = parseNonNegativeDecimal(text);
  if (parsed !== undefined) return { ok: true, value: parsed };

  if (/^\d*\.$/.test(text)) {
    return { ok: false, incomplete: true, message: Strings.errAmountInvalid };
  }
  if (parseDecimalText(text) === undefined) {
    return { ok: false, incomplete: false, message: Strings.errAmountInvalid };
  }
  return { ok: false, incomplete: false, message: Strings.budgetPlanAllocationInvalid };
}
