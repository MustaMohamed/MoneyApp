import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';

/** `undefined` stays "Unknown account": an id that did not resolve is not the same as a deleted one (audit L27). */
export function resolveAccountName(account: Account | undefined): string {
  if (!account) return Strings.unknownAccount;
  return account.is_deleted === 1 ? Strings.deletedAccount : account.name;
}
