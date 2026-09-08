import { getDb } from '@/database/client';
import { getAccountsStats, type AccountStats } from '@/modules/accounts/database/account_stats';
import { getTransactionsByAccount } from '@/modules/transactions/database/transactions';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';

export const RECENT_ACTIVITY_LIMIT = 10;

export interface AccountActivitySnapshot {
  accountId: string;
  rows: Transaction[];
  stats: AccountStats;
  loadedAt: number;
}

export interface AccountActivityLoadInput {
  accountId: string;
  /** The store's freshness stamp, from the transaction store; the read itself never uses it. */
  mutationVersion: number;
  now: Date;
}

export interface IAccountActivityRepository {
  getSnapshot(input: AccountActivityLoadInput): Promise<AccountActivitySnapshot>;
}

const EMPTY_STATS: AccountStats = { month_in: 0, month_out: 0, week_in: 0, week_out: 0 };

export class AccountActivityRepository implements IAccountActivityRepository {
  async getSnapshot({
    accountId,
    now,
  }: AccountActivityLoadInput): Promise<AccountActivitySnapshot> {
    const db = await getDb();

    const [rows, statsMap] = await Promise.all([
      getTransactionsByAccount(db, accountId, RECENT_ACTIVITY_LIMIT),
      getAccountsStats(db, [accountId], now),
    ]);

    return {
      accountId,
      rows,
      stats: statsMap[accountId] ?? EMPTY_STATS,
      loadedAt: now.getTime(),
    };
  }
}

export const accountActivityRepository = new AccountActivityRepository();
