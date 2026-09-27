import { ACCOUNT_TYPE_ICONS, type AccountTypeIconName } from '@/constants/account_type_icons';
import { Strings } from '@/constants/strings';
import { resolveAccountGlyphColor } from '@/modules/accounts/constants/account_glyph_color';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { resolveAccountName } from '@/utils/account_name';

export interface AccountChipModel {
  /** `undefined` is the All accounts chip. */
  accountId: string | undefined;
  label: string;
  accessibilityLabel: string;
  /** The account-type icon, as the sheet's account pill shows it; `undefined` on All accounts. */
  iconName: AccountTypeIconName | undefined;
  iconColor: string | undefined;
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
      iconName: undefined,
      iconColor: undefined,
      selected: accountIds.length === 0,
    },
    ...accounts.map((account) => {
      const label = resolveAccountName(account);
      return {
        accountId: account.id,
        label,
        accessibilityLabel: Strings.filterAccountAccessibility(label),
        iconName: ACCOUNT_TYPE_ICONS[account.type],
        iconColor: resolveAccountGlyphColor(account.color),
        selected: account.id === onlyId,
      };
    }),
  ];
}
