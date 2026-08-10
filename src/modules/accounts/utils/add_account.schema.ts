import { z } from 'zod';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { parseNonNegativeDecimal, parsePositiveDecimal } from '@/utils/parse_decimal';

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

      // Every credit rule below opens on this one branch, so a leftover
      // credit draft can never block a save on a non-credit type — spec.md
      // §296, MA-009 plan decision 4.
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
        // Parsed, but not > 0. Debt above the limit is a separate, valid
        // case (spec.md:291) — this rule only rejects a non-positive limit.
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
          // Only compare once the amount owed itself parses — an invalid
          // balance is a balance error, not a minimum-payment one.
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
        const parsedDueDay = parseNonNegativeDecimal(dueDayRaw);
        if (
          parsedDueDay === undefined ||
          !Number.isInteger(parsedDueDay) ||
          parsedDueDay < 1 ||
          parsedDueDay > 31
        ) {
          ctx.addIssue({ code: 'custom', path: ['due_day'], message: Strings.errDueDayRange });
        }
      }

      if (data.interest_tracking) {
        const aprRaw = data.apr?.trim();
        if (!aprRaw) {
          ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAprRequired });
        } else if (parseNonNegativeDecimal(aprRaw) === undefined) {
          ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAmountInvalid });
        }
      }
    });
}

export type AddAccountFormData = z.infer<ReturnType<typeof createAddAccountSchema>>;
