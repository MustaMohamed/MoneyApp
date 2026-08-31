import { z } from 'zod';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import {
  parseDecimalText,
  parseNonNegativeDecimal,
  parsePositiveDecimal,
} from '@/utils/parse_decimal';

import type { Account } from '../store/account.store';

export function createAddAccountSchema(accounts: Account[]) {
  return z
    .object({
      name: z.string().min(1, Strings.errNameRequired).max(30, Strings.errNameTooLong),
      balance: z.string().refine((v) => parseNonNegativeDecimal(v) !== undefined, {
        message: Strings.errAmountInvalid,
      }),
      selected_type: z.enum(AccountType),
      selected_color: z.string(),
      currency: z.enum(Currency),
      interest_tracking: z.boolean(),
      credit_limit: z.string().optional(),
      apr: z.string().optional(),
      min_payment: z.string().optional(),
      due_day: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (accounts.some((a) => a.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
        ctx.addIssue({
          code: 'custom',
          path: ['name'],
          message: Strings.errNameDuplicateNamed(data.name.trim()),
        });
      }

      // All credit rules sit below this, so a leftover credit draft cannot block a non-credit save.
      if (data.selected_type !== AccountType.CreditCard) return;

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
        } else {
          // Compare only once the balance parses; an invalid balance is not a min-payment error.
          const parsedBalance = parseNonNegativeDecimal(data.balance);
          if (parsedBalance !== undefined && parsedMinPayment > parsedBalance) {
            ctx.addIssue({
              code: 'custom',
              path: ['min_payment'],
              message: Strings.errMinPaymentExceedsOwed,
            });
          }
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
    });
}

export type AddAccountFormData = z.infer<ReturnType<typeof createAddAccountSchema>>;
