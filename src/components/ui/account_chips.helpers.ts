import type { ChipRowModel } from '@/components/ui/chip_row.helpers';
import { Strings } from '@/constants/strings';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { resolveAccountName } from '@/utils/account_name';

/** A chip is on only when the applied filter holds exactly its one account. */
export function buildAccountChips(
  accounts: readonly Account[],
  accountIds: readonly string[],
): ChipRowModel[] {
  const onlyId = accountIds.length === 1 ? accountIds[0] : undefined;
  const chipAccounts = accounts.filter(
    (account) => account.is_archived !== 1 && account.is_deleted !== 1,
  );
  return [
    {
      id: undefined,
      label: Strings.filterAllAccounts,
      accessibilityLabel: Strings.filterAllAccounts,
      lead: undefined,
      selected: accountIds.length === 0,
    },
    ...chipAccounts.map((account): ChipRowModel => {
      const label = resolveAccountName(account);
      return {
        id: account.id,
        label,
        accessibilityLabel: Strings.filterAccountAccessibility(label),
        lead: { kind: 'tile', color: account.color, type: account.type },
        selected: account.id === onlyId,
      };
    }),
  ];
}

/** `undefined` is All accounts; the chip already lit clears the filter. */
export function toggleAccountFilter<F extends { accountIds: string[] }>(
  filters: F,
  accountId: string | undefined,
): F {
  const isOnlyApplied = filters.accountIds.length === 1 && filters.accountIds[0] === accountId;
  const accountIds = accountId === undefined || isOnlyApplied ? [] : [accountId];
  return { ...filters, accountIds };
}

export function pruneAccountFilter<F extends { accountIds: string[] }>(
  filters: F,
  activeAccounts: readonly Account[],
): F {
  const activeIds = new Set(activeAccounts.map((account) => account.id));
  const accountIds = filters.accountIds.filter((id) => activeIds.has(id));
  return accountIds.length === filters.accountIds.length ? filters : { ...filters, accountIds };
}

/** One applied account is shown by its chip, so the funnel counts accounts only at two or more. */
export function countFunnelFilters(activeCount: number, accountIds: readonly string[]): number {
  return activeCount - (accountIds.length === 1 ? 1 : 0);
}
