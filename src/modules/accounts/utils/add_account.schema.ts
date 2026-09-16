import { z } from 'zod';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { parseNonNegativeDecimal } from '@/utils/parse_decimal';
import { isBlankName } from '@/utils/strip_format_chars';

import type { Account } from '../store/account.store';
import { isAccountNameTaken } from './account_name_taken';
import { addCreditFieldIssues } from './credit_fields.schema';

export function createAddAccountSchema(accounts: Account[]) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .refine((n) => !isBlankName(n), Strings.errNameRequired)
        .max(30, Strings.errNameTooLong),
      // Blank gets its own copy — 'Numbers only.' against an empty field read as a non sequitur (screen-review N2, nice 10).
      balance: z
        .string()
        .min(1, Strings.errAmountRequired)
        .refine((v) => v.length === 0 || parseNonNegativeDecimal(v) !== undefined, {
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
      if (!isBlankName(data.name) && isAccountNameTaken(accounts, data.name)) {
        ctx.addIssue({
          code: 'custom',
          path: ['name'],
          message: Strings.errNameDuplicateNamed(data.name),
        });
      }

      addCreditFieldIssues(data, ctx, {
        isCreditCard: data.selected_type === AccountType.CreditCard,
        owed: parseNonNegativeDecimal(data.balance),
      });
    });
}

export type AddAccountFormData = z.infer<ReturnType<typeof createAddAccountSchema>>;
