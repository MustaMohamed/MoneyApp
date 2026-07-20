import uuid from 'react-native-uuid';

import { getDb } from '@/database/client';

import {
  addAccount,
  archiveAccount,
  clearAccountBalanceReview,
  getAccountByIdIncludingArchived,
  getAccountsByIdsIncludingArchived,
  getAccounts,
  setAccountBalance,
  updateAccount,
} from '../database/accounts';
import type { Account } from '../entities/account.entity';

export type NewAccountInput = Omit<
  Account,
  'id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived' | 'balance_review_required'
>;

export type UpdateAccountInput = {
  name: string;
  color: string | null;
};

export interface IAccountRepository {
  getAll(): Promise<Account[]>;
  getByIdIncludingArchived(id: string): Promise<Account | undefined>;
  getByIdsIncludingArchived(ids: string[]): Promise<Account[]>;
  add(data: NewAccountInput): Promise<Account>;
  update(id: string, data: UpdateAccountInput): Promise<void>;
  archive(id: string): Promise<void>;
  adjustBalance(id: string, newBalance: number): Promise<void>;
  confirmBalanceReviewed(id: string): Promise<void>;
}

export class AccountRepository implements IAccountRepository {
  async getAll(): Promise<Account[]> {
    const db = await getDb();
    return getAccounts(db);
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

  async adjustBalance(id: string, newBalance: number): Promise<void> {
    const db = await getDb();
    await setAccountBalance(db, id, newBalance, new Date().toISOString());
  }

  async confirmBalanceReviewed(id: string): Promise<void> {
    const db = await getDb();
    await clearAccountBalanceReview(db, id, new Date().toISOString());
  }
}

export const accountRepository = new AccountRepository();
