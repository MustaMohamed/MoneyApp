import {
  type ScaledTextStyle,
  scaledFontSize,
  scaledTextStyleAboveOne,
} from '@/components/ui/text_scale.geometry';
import { CURRENCY_CONFIG } from '@/constants/currency';
import { Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { Size, Type } from '@/constants/theme';
import { formatAmount, formatDisplayMagnitude } from '@/utils/format_amount';
import {
  isStillTypingDecimal,
  parseDecimalText,
  parseNonNegativeDecimal,
} from '@/utils/parse_decimal';
import { calendarDaysBetween } from '@/utils/year_month';

/** 2dp overrides EGP's 0dp on the limits summary once any figure has cents, where `45.40` would render as `45`. */
const SPENDING_PLAN_ALLOCATION_DECIMALS = 2;

export function formatLimitsFigure(value: number, hasCents: boolean): string {
  return formatAmount(
    value,
    hasCents ? SPENDING_PLAN_ALLOCATION_DECIMALS : CURRENCY_CONFIG[Currency.EGP].decimals,
  );
}

/** Display only: total over the inclusive days, unrounded before the formatter (ADR 2026-08-21 §2.1). */
export function resolvePlanDailyLine(
  totalAmount: number | undefined,
  startDate: string,
  endDate: string,
): string | undefined {
  if (totalAmount === undefined || startDate === '' || endDate === '') return undefined;
  const days = calendarDaysBetween(startDate, endDate) + 1;
  if (days < 1) return undefined;
  return Strings.budgetPlanDailyLine(
    days,
    formatDisplayMagnitude(totalAmount / days, Currency.EGP).text,
  );
}

export interface SpendingPlanFieldFaults {
  name: string | undefined;
  total: string | undefined;
  endDate: string | undefined;
  categories: string | undefined;
  allocations: Readonly<Record<string, string | undefined>>;
}

/** Ungated: the hook shows these only after a refused Save, and refuses on them regardless. */
export function resolvePlanScheduleFaults(
  startDate: string,
  endDate: string,
  selectedCategoryCount: number,
): { endDate: string | undefined; categories: string | undefined } {
  return {
    endDate: endDate < startDate ? Strings.budgetPlanDateInvalid : undefined,
    categories: selectedCategoryCount === 0 ? Strings.budgetPlanCategoryRequired : undefined,
  };
}

export function countSpendingPlanFaults(faults: SpendingPlanFieldFaults): number {
  const { allocations, ...fields } = faults;
  return [...Object.values(fields), ...Object.values(allocations)].filter(
    (fault) => fault !== undefined,
  ).length;
}

export function resolvePlanFooterLine(
  faults: SpendingPlanFieldFaults,
  submitError: string | undefined,
  overLine: string | undefined,
): string | undefined {
  const count = countSpendingPlanFaults(faults);
  return count > 0 ? Strings.fixFieldsMarkedAbove(count) : (submitError ?? overLine);
}

export function formatPlanCategoriesValue(names: readonly string[]): string {
  if (names.length === 0) return Strings.budgetPlanPickCategories;
  return Strings.budgetPlanCategoriesValue(names.slice(0, 2), Math.max(0, names.length - 2));
}

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

/** The slot grows past its 128 dp so the empty field's `No limit` and `EGP` read whole above scale 1. */
export function resolveAllocationSlotWidth(fontScale: number): number {
  return Math.max(
    Size.spendingPlanAllocationSlot,
    2 * Size.spendingPlanAllocationFieldPaddingX +
      2 * Size.fieldBorderWidth +
      scaledFontSize(Size.spendingPlanAllocationSlotText, fontScale),
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
