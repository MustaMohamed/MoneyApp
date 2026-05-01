import uuid from 'react-native-uuid';

import {
  addAccount,
  archiveAccount,
  getAccounts,
  setAccountBalance,
  updateAccount,
} from '@/database/accounts';
import { getDb } from '@/database/client';
import type { Account } from '@/database/entities/account.entity';

export type NewAccountInput = Omit<
  Account,
  'id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'
>;

export type UpdateAccountInput = {
  name: string;
  color: string | null;
};

export interface IAccountRepository {
  getAll(): Promise<Account[]>;
  add(data: NewAccountInput): Promise<Account>;
  update(id: string, data: UpdateAccountInput): Promise<void>;
  archive(id: string): Promise<void>;
  adjustBalance(id: string, newBalance: number): Promise<void>;
}

export class AccountRepository implements IAccountRepository {
  async getAll(): Promise<Account[]> {
    const db = await getDb();
    return getAccounts(db);
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
}
