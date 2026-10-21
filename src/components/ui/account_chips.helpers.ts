import type { AccountType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { resolveAccountName } from '@/utils/account_name';

interface AccountChipTile {
  color: string | null;
  type: AccountType;
}

export interface AccountChipModel {
  /** `undefined` is the All accounts chip. */
  accountId: string | undefined;
  label: string;
  accessibilityLabel: string;
  /** The account-type tile on the account colour; `undefined` on All accounts. */
  tile: AccountChipTile | undefined;
  selected: boolean;
}

/** A chip is on only when the applied filter holds exactly its one account. */
export function buildAccountChips(
  accounts: readonly Account[],
  accountIds: readonly string[],
): AccountChipModel[] {
  const onlyId = accountIds.length === 1 ? accountIds[0] : undefined;
  const chipAccounts = accounts.filter(
    (account) => account.is_archived !== 1 && account.is_deleted !== 1,
  );
  return [
    {
      accountId: undefined,
      label: Strings.filterAllAccounts,
      accessibilityLabel: Strings.filterAllAccounts,
      tile: undefined,
      selected: accountIds.length === 0,
    },
    ...chipAccounts.map((account) => {
      const label = resolveAccountName(account);
      return {
        accountId: account.id,
        label,
        accessibilityLabel: Strings.filterAccountAccessibility(label),
        tile: { color: account.color, type: account.type },
        selected: account.id === onlyId,
      };
    }),
  ];
}
