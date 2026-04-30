import uuid from 'react-native-uuid';

import { addAccount, getAccounts } from '@/database/accounts';
import { getDb } from '@/database/client';
import type { Account } from '@/database/entities/account.entity';

export type NewAccountInput = Omit<
  Account,
  'id' | 'created_at' | 'updated_at' | 'current_balance' | 'is_archived'
>;

export interface IAccountRepository {
  getAll(): Promise<Account[]>;
  add(data: NewAccountInput): Promise<Account>;
}

export class AccountRepository implements IAccountRepository {
  async getAll(): Promise<Account[]> {
    const db = await getDb();
    return getAccounts(db);
  }

  async add(data: NewAccountInput): Promise<Account> {
    const db = await getDb();
    const id = uuid.v4() as string;
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
}
