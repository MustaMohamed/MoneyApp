import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';

/** Unknown beats deleted beats blank: an unresolved id is not a deleted one (audit L27), and soft delete blanks the name. */
export function resolveAccountName(account: Account | undefined): string {
  if (!account) return Strings.unknownAccount;
  if (account.is_deleted === 1) return Strings.deletedAccount;
  return account.name.trim() === '' ? Strings.unnamedAccount : account.name;
}
