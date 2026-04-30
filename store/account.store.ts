import uuid from 'react-native-uuid';
import { create } from 'zustand';

import { addAccount as dbAddAccount, getAccounts } from '@/database/accounts';
import { getDb } from '@/database/client';
import type { Account } from '@/database/entities/account.entity';

export type { Account };

interface AccountState {
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  addAccount: (data: Omit<Account, 'id' | 'created_at' | 'updated_at'>) => Promise<Account>;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],

  loadAccounts: async () => {
    try {
      const db = await getDb();
      const rows = await getAccounts(db);
      set({ accounts: rows });
    } catch (err) {
      console.error('[accountStore] loadAccounts failed:', err);
      throw err;
    }
  },

  addAccount: async (data) => {
    try {
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

      await dbAddAccount(db, account);
      await get().loadAccounts();

      return account;
    } catch (err) {
      console.error('[accountStore] addAccount failed:', err);
      throw err;
    }
  },
}));
