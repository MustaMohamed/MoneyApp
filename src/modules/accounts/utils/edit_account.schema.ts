import { z } from 'zod';

import { Strings } from '@/constants/strings';

import type { Account } from '../store/account.store';
import { isAccountNameTaken } from './account_name_taken';

export function createEditAccountSchema(accounts: Account[], accountId: string) {
  return z.object({
    name: z
      .string()
      .min(1, Strings.errNameRequired)
      .max(30, Strings.errNameTooLong)
      .refine((n) => !isAccountNameTaken(accounts, n, accountId), {
        message: Strings.errNameDuplicate,
      }),
    color: z.string(),
  });
}
