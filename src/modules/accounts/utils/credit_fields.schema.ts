import { z } from 'zod';

import { Strings } from '@/constants/strings';
import {
  parseDecimalText,
  parseNonNegativeDecimal,
  parsePositiveDecimal,
} from '@/utils/parse_decimal';

/** The five credit fields, spread into the add and the edit form object. */
export const creditFieldsShape = {
  interest_tracking: z.boolean(),
  credit_limit: z.string().optional(),
  apr: z.string().optional(),
  min_payment: z.string().optional(),
  due_day: z.string().optional(),
};

export type CreditFieldValues = z.infer<z.ZodObject<typeof creditFieldsShape>>;

/** The one credit-field check behind the add and the edit schema; only the comparand differs. */
export function addCreditFieldIssues(
  data: CreditFieldValues,
  ctx: z.core.$RefinementCtx<CreditFieldValues>,
  comparand: { isCreditCard: boolean; owed: number | undefined },
): void {
  // All credit rules sit below this, so a leftover credit draft cannot block a non-credit save.
  if (!comparand.isCreditCard) return;

  const creditLimitRaw = data.credit_limit?.trim();
  if (!creditLimitRaw) {
    ctx.addIssue({
      code: 'custom',
      path: ['credit_limit'],
      message: Strings.errCreditLimitRequired,
    });
  } else if (parseNonNegativeDecimal(creditLimitRaw) === undefined) {
    ctx.addIssue({
      code: 'custom',
      path: ['credit_limit'],
      message: Strings.errAmountInvalid,
    });
  } else if (parsePositiveDecimal(creditLimitRaw) === undefined) {
    // Debt above the limit is valid; this rule only rejects a non-positive limit.
    ctx.addIssue({
      code: 'custom',
      path: ['credit_limit'],
      message: Strings.errCreditLimitPositive,
    });
  }

  const minPaymentRaw = data.min_payment?.trim();
  if (minPaymentRaw) {
    const parsedMinPayment = parseNonNegativeDecimal(minPaymentRaw);
    if (parsedMinPayment === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: ['min_payment'],
        message: Strings.errAmountInvalid,
      });
    } else if (comparand.owed !== undefined && parsedMinPayment > comparand.owed) {
      // `owed` is undefined when the add form's balance does not parse; an invalid balance is not a min-payment error.
      ctx.addIssue({
        code: 'custom',
        path: ['min_payment'],
        message: Strings.errMinPaymentExceedsOwed,
      });
    }
  }

  const dueDayRaw = data.due_day?.trim();
  if (dueDayRaw) {
    const parsedDueDay = parseDecimalText(dueDayRaw);
    if (
      parsedDueDay === undefined ||
      !Number.isInteger(parsedDueDay) ||
      parsedDueDay < 1 ||
      parsedDueDay > 31
    ) {
      ctx.addIssue({ code: 'custom', path: ['due_day'], message: Strings.errDueDayRange });
    }
  }

  // `DECIMAL_PATTERN` admits no minus sign, so the range check only ever sees a value >= 0.
  if (data.interest_tracking) {
    const aprRaw = data.apr?.trim();
    if (!aprRaw) {
      ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAprRequired });
    } else {
      const parsedApr = parseDecimalText(aprRaw);
      if (parsedApr === undefined) {
        ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAmountInvalid });
      } else if (parsedApr > 100) {
        // 0 is valid (promotional-rate card); 100 is a sanity ceiling, not a market maximum.
        ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAprRange });
      }
    }
  }
}
