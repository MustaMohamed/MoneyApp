import { z } from 'zod';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';

import type { Account } from '../store/account.store';

export function createAddAccountSchema(accounts: Account[]) {
  return z
    .object({
      name: z.string().min(1, Strings.errNameRequired).max(30, Strings.errNameTooLong),
      balance: z.string().refine((v) => parseNonNegativeDecimal(v) !== undefined, {
        message: Strings.errBalanceInvalid,
      }),
      selected_type: z.enum(AccountType),
      selected_color: z.string(),
      currency: z.enum(Currency),
      interest_tracking: z.boolean(),
      credit_limit: z.string().optional(),
      apr: z.string().optional(),
      revolving_balance: z.string().optional(),
      min_payment: z.string().optional(),
      due_day: z.string().optional(),
    })
    .superRefine((data, ctx) => {
      if (accounts.some((a) => a.name.trim().toLowerCase() === data.name.trim().toLowerCase())) {
        ctx.addIssue({ code: 'custom', path: ['name'], message: Strings.errNameDuplicate });
      }
      if (data.selected_type === AccountType.CreditCard && !data.credit_limit?.trim()) {
        ctx.addIssue({
          code: 'custom',
          path: ['credit_limit'],
          message: Strings.errCreditLimitRequired,
        });
      }
      if (
        data.selected_type === AccountType.CreditCard &&
        data.interest_tracking &&
        !data.apr?.trim()
      ) {
        ctx.addIssue({ code: 'custom', path: ['apr'], message: Strings.errAprRequired });
      }
    });
}

export type AddAccountFormData = z.infer<ReturnType<typeof createAddAccountSchema>>;
