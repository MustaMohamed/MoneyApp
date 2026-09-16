import { z } from 'zod';

import { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { isBlankName } from '@/utils/strip_format_chars';

import type { Account } from '../store/account.store';
import { isAccountNameTaken } from './account_name_taken';
import { addCreditFieldIssues, creditFieldsShape } from './credit_fields.schema';

export function createEditAccountFormSchema(
  accounts: Account[],
  archivedAccounts: Account[],
  account: Pick<Account, 'id' | 'type' | 'current_balance'>,
) {
  return z
    .object({
      name: z
        .string()
        .trim()
        .refine((n) => !isBlankName(n), Strings.errNameRequired)
        .max(30, Strings.errNameTooLong),
      color: z.string(),
      ...creditFieldsShape,
    })
    .superRefine((data, ctx) => {
      if (
        !isBlankName(data.name) &&
        isAccountNameTaken([...accounts, ...archivedAccounts], data.name, account.id)
      ) {
        ctx.addIssue({
          code: 'custom',
          path: ['name'],
          message: Strings.errNameDuplicateNamed(data.name),
        });
      }

      addCreditFieldIssues(data, ctx, {
        isCreditCard: account.type === AccountType.CreditCard,
        owed: account.current_balance,
      });
    });
}

export type EditAccountFormData = z.infer<ReturnType<typeof createEditAccountFormSchema>>;
