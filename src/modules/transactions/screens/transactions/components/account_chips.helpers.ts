import { Strings } from '@/constants/strings';
import { resolveAccountGlyphColor } from '@/modules/accounts/constants/account_glyph_color';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { resolveAccountName } from '@/utils/account_name';

export interface AccountChipModel {
  /** `undefined` is the All accounts chip. */
  accountId: string | undefined;
  label: string;
  accessibilityLabel: string;
  dotColor: string | undefined;
  selected: boolean;
}

/** A chip is on only when the applied filter holds exactly its one account. */
export function buildAccountChips(
  accounts: readonly Account[],
  accountIds: readonly string[],
): AccountChipModel[] {
  const onlyId = accountIds.length === 1 ? accountIds[0] : undefined;
  return [
    {
      accountId: undefined,
      label: Strings.filterAllAccounts,
      accessibilityLabel: Strings.filterAllAccounts,
      dotColor: undefined,
      selected: accountIds.length === 0,
    },
    ...accounts.map((account) => {
      const label = resolveAccountName(account);
      return {
        accountId: account.id,
        label,
        accessibilityLabel: Strings.filterAccountAccessibility(label),
        dotColor: resolveAccountGlyphColor(account.color),
        selected: account.id === onlyId,
      };
    }),
  ];
}
