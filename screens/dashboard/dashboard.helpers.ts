import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';

export interface NetWorthResult {
  assetsEgp: number;
  liabilitiesEgp: number;
  netWorthEgp: number;
  netWorthUsd: number;
}

export function computeNetWorth(accounts: Account[], rate: number): NetWorthResult {
  let assetsEgp = 0;
  let liabilitiesEgp = 0;

  for (const a of accounts) {
    const balanceEgp = a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
    if (a.type === AccountType.CreditCard) {
      liabilitiesEgp += balanceEgp;
    } else {
      assetsEgp += balanceEgp;
    }
  }

  const netWorthEgp = assetsEgp - liabilitiesEgp;
  const netWorthUsd = rate > 0 ? netWorthEgp / rate : 0;
  return { assetsEgp, liabilitiesEgp, netWorthEgp, netWorthUsd };
}

export function groupAccountsByType(accounts: Account[]): Partial<Record<AccountType, Account[]>> {
  const groups: Partial<Record<AccountType, Account[]>> = {};
  for (const a of accounts) {
    if (!groups[a.type]) groups[a.type] = [];
    groups[a.type]!.push(a);
  }
  return groups;
}
