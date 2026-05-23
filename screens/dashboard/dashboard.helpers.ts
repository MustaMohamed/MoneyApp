import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/store/account.store';

export interface NetWorthResult {
  assetsEgp: number;
  assetsUsd: number;
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
  const assetsUsd = rate > 0 ? assetsEgp / rate : 0;
  const netWorthUsd = rate > 0 ? netWorthEgp / rate : 0;
  return { assetsEgp, assetsUsd, liabilitiesEgp, netWorthEgp, netWorthUsd };
}

export function groupAccountsByType(accounts: Account[]): Partial<Record<AccountType, Account[]>> {
  const groups: Partial<Record<AccountType, Account[]>> = {};
  for (const a of accounts) {
    groups[a.type] ??= [];
    groups[a.type]!.push(a);
  }
  return groups;
}

export interface AccountRow {
  id: string;
  name: string;
  balanceEgp: number;
}

export interface LiquidityBreakdown {
  liquidEgp: number;
  liquidCount: number;
  liquidAccounts: AccountRow[];
  reserveEgp: number;
  reserveCount: number;
  reserveAccounts: AccountRow[];
}

const LIQUID_TYPES: ReadonlySet<AccountType> = new Set([
  AccountType.Bank,
  AccountType.SmartWallet,
  AccountType.PhysicalWallet,
]);

const RESERVE_TYPES: ReadonlySet<AccountType> = new Set([AccountType.PhysicalSavings]);

export function computeLiquidityBreakdown(accounts: Account[], rate: number): LiquidityBreakdown {
  let liquidEgp = 0;
  let reserveEgp = 0;
  const liquidAccounts: AccountRow[] = [];
  const reserveAccounts: AccountRow[] = [];

  for (const a of accounts) {
    if (a.is_archived) continue;
    const balanceEgp = a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
    if (LIQUID_TYPES.has(a.type)) {
      liquidEgp += balanceEgp;
      liquidAccounts.push({ id: a.id, name: a.name, balanceEgp });
    } else if (RESERVE_TYPES.has(a.type)) {
      reserveEgp += balanceEgp;
      reserveAccounts.push({ id: a.id, name: a.name, balanceEgp });
    }
  }

  liquidAccounts.sort((a, b) => b.balanceEgp - a.balanceEgp);
  reserveAccounts.sort((a, b) => b.balanceEgp - a.balanceEgp);

  return {
    liquidEgp,
    liquidCount: liquidAccounts.length,
    liquidAccounts,
    reserveEgp,
    reserveCount: reserveAccounts.length,
    reserveAccounts,
  };
}

export interface LiabilityRow extends AccountRow {
  statementDueDay: number | null;
}

export function computeLiabilitiesBreakdown(accounts: Account[], rate: number): LiabilityRow[] {
  const rows: LiabilityRow[] = [];
  for (const a of accounts) {
    if (a.is_archived) continue;
    if (a.type !== AccountType.CreditCard) continue;
    const balanceEgp = a.currency === Currency.USD ? a.current_balance * rate : a.current_balance;
    rows.push({
      id: a.id,
      name: a.name,
      balanceEgp: Math.abs(balanceEgp),
      statementDueDay: a.statement_due_day ?? null,
    });
  }
  rows.sort((a, b) => b.balanceEgp - a.balanceEgp);
  return rows;
}
