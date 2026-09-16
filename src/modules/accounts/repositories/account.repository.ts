import uuid from 'react-native-uuid';

import { getDb } from '@/database/client';
import { updateUnpaidPaymentsAccount } from '@/modules/commitments/database/commitment_payments';
import {
  clearCommitmentAccount,
  updateActiveCommitmentsAccount,
} from '@/modules/commitments/database/commitments';
import { roundMoney } from '@/utils/money';

import {
  addAccount,
  archiveAccount,
  clearAccountBalanceReview,
  getAccountByIdIncludingArchived,
  getAccountsByIdsIncludingArchived,
  getAccounts,
  getArchivedAccounts,
  setAccountBalance,
  setAccountDeleted,
  setAccountUnarchived,
  updateAccount,
  type UpdateAccountInput,
} from '../database/accounts';
import type { Account } from '../entities/account.entity';
import { isAccountNameTaken } from '../utils/account_name_taken';
import {
  AccountArchivedError,
  AccountNameTakenError,
  AccountNotArchivedError,
  AccountNotFoundError,
} from './account.errors';

export type NewAccountInput = Omit<
  Account,
  | 'id'
  | 'created_at'
  | 'updated_at'
  | 'current_balance'
  | 'is_archived'
  | 'is_deleted'
  | 'balance_review_required'
>;

export type { UpdateAccountInput };

export interface IAccountRepository {
  getAll(): Promise<Account[]>;
  getArchived(): Promise<Account[]>;
  getByIdIncludingArchived(id: string): Promise<Account | undefined>;
  getByIdsIncludingArchived(ids: string[]): Promise<Account[]>;
  add(data: NewAccountInput): Promise<Account>;
  update(id: string, data: UpdateAccountInput): Promise<void>;
  archive(id: string): Promise<void>;
  unarchive(id: string): Promise<void>;
  delete(id: string, replacementAccountId?: string): Promise<void>;
  adjustBalance(id: string, newBalance: number): Promise<void>;
  confirmBalanceReviewed(id: string): Promise<void>;
}

export class AccountRepository implements IAccountRepository {
  async getAll(): Promise<Account[]> {
    const db = await getDb();
    return getAccounts(db);
  }

  async getArchived(): Promise<Account[]> {
    const db = await getDb();
    return getArchivedAccounts(db);
  }

  async getByIdsIncludingArchived(ids: string[]): Promise<Account[]> {
    const db = await getDb();
    return getAccountsByIdsIncludingArchived(db, ids);
  }

  async getByIdIncludingArchived(id: string): Promise<Account | undefined> {
    const db = await getDb();
    return getAccountByIdIncludingArchived(db, id);
  }

  async add(data: NewAccountInput): Promise<Account> {
    const db = await getDb();
    const id = String(uuid.v4());
    const now = new Date().toISOString();
    const account: Account = {
      ...data,
      id,
      current_balance: data.opening_balance,
      is_archived: 0,
      is_deleted: 0,
      balance_review_required: 0,
      created_at: now,
      updated_at: now,
    };
    await addAccount(db, account);
    return account;
  }

  async update(id: string, data: UpdateAccountInput): Promise<void> {
    const db = await getDb();
    await updateAccount(db, id, { ...data, updated_at: new Date().toISOString() });
  }

  async archive(id: string): Promise<void> {
    const db = await getDb();
    await archiveAccount(db, id, new Date().toISOString());
  }

  async unarchive(id: string): Promise<void> {
    const db = await getDb();
    const existing = await getAccountByIdIncludingArchived(db, id);
    if (!existing || existing.is_deleted === 1) throw new AccountNotFoundError();
    if (existing.is_archived !== 1) {
      throw new AccountNotArchivedError('Only an archived account can be restored');
    }

    const active = await getAccounts(db);
    if (isAccountNameTaken(active, existing.name)) throw new AccountNameTakenError();

    const now = new Date().toISOString();
    if ((await setAccountUnarchived(db, id, now)) !== 1) throw new AccountNotFoundError();
  }

  async delete(id: string, replacementAccountId?: string): Promise<void> {
    const db = await getDb();
    const existing = await getAccountByIdIncludingArchived(db, id);
    if (!existing || existing.is_deleted === 1) throw new AccountNotFoundError();
    if (existing.is_archived !== 1) throw new AccountNotArchivedError();

    const now = new Date().toISOString();
    await db.withTransactionAsync(async () => {
      if (replacementAccountId !== undefined) {
        const replacement = await getAccountByIdIncludingArchived(db, replacementAccountId);
        if (!replacement || replacement.is_deleted === 1) throw new AccountNotFoundError();
        if (replacement.is_archived === 1) throw new AccountArchivedError();
        // Payments first: their subquery finds the commitments only while they still name `id`.
        await updateUnpaidPaymentsAccount(db, id, replacementAccountId, now);
        await updateActiveCommitmentsAccount(db, id, replacementAccountId, now);
      }
      if ((await setAccountDeleted(db, id, now)) !== 1) throw new AccountNotFoundError();
      await clearCommitmentAccount(db, id, now);
    });
  }

  async adjustBalance(id: string, newBalance: number): Promise<void> {
    const rounded = roundMoney(newBalance);
    const db = await getDb();
    const existing = await getAccountByIdIncludingArchived(db, id);
    if (!existing || existing.is_deleted === 1) throw new AccountNotFoundError();
    if (existing.is_archived === 1) throw new AccountArchivedError();

    const now = new Date().toISOString();
    if ((await setAccountBalance(db, id, rounded, now)) !== 1) throw new AccountArchivedError();
  }

  async confirmBalanceReviewed(id: string): Promise<void> {
    const db = await getDb();
    await clearAccountBalanceReview(db, id, new Date().toISOString());
  }
}

export const accountRepository = new AccountRepository();
