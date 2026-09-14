import { getDb } from '@/database/client';
import { getActiveCommitmentCountByAccount } from '@/modules/commitments/database/commitments';
import { getTransactionCountByAccount } from '@/modules/transactions/database/transactions';

import { getAccountByIdIncludingArchived } from '../database/accounts';
import type { Account } from '../entities/account.entity';

export interface ArchivedAccountDetailSnapshot {
  accountId: string;
  /** The row only when it is archived and not deleted. */
  account: Account | undefined;
  transactionCount: number;
  activeCommitmentCount: number;
}

export interface ArchivedAccountDetailLoadInput {
  accountId: string;
  /** The store's freshness stamp, from the transaction store; the read itself never uses it. */
  mutationVersion: number;
}

export interface IArchivedAccountDetailRepository {
  getSnapshot(input: ArchivedAccountDetailLoadInput): Promise<ArchivedAccountDetailSnapshot>;
}

export class ArchivedAccountDetailRepository implements IArchivedAccountDetailRepository {
  async getSnapshot({
    accountId,
  }: ArchivedAccountDetailLoadInput): Promise<ArchivedAccountDetailSnapshot> {
    const db = await getDb();

    const [row, transactionCount, activeCommitmentCount] = await Promise.all([
      getAccountByIdIncludingArchived(db, accountId),
      getTransactionCountByAccount(db, accountId),
      getActiveCommitmentCountByAccount(db, accountId),
    ]);

    return {
      accountId,
      account: row?.is_archived === 1 && row.is_deleted === 0 ? row : undefined,
      transactionCount,
      activeCommitmentCount,
    };
  }
}

export const archivedAccountDetailRepository = new ArchivedAccountDetailRepository();
