import uuid from 'react-native-uuid';
import { create } from 'zustand';

import { getDb } from '@/db/init';

export type AccountType =
  | 'bank'
  | 'smart_wallet'
  | 'physical_wallet'
  | 'physical_savings'
  | 'credit_card';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  currency: 'EGP' | 'USD';
  opening_balance: number;
  current_balance: number;
  color: string | null;
  credit_limit: number | null;
  revolving_balance: number | null;
  minimum_payment: number | null;
  statement_due_day: number | null;
  interest_tracking: 0 | 1;
  apr: number | null;
  is_archived: 0 | 1;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

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
      const rows = await db.getAllAsync<Account>(
        'SELECT * FROM accounts WHERE is_archived = 0 ORDER BY sort_order ASC, created_at ASC',
      );
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

      await db.runAsync(
        `INSERT INTO accounts (
          id, name, type, currency,
          opening_balance, current_balance,
          color, credit_limit, revolving_balance, minimum_payment,
          statement_due_day, interest_tracking, apr,
          is_archived, sort_order, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          data.name,
          data.type,
          data.currency,
          data.opening_balance,
          data.opening_balance,
          data.color,
          data.credit_limit,
          data.revolving_balance,
          data.minimum_payment,
          data.statement_due_day,
          data.interest_tracking,
          data.apr,
          0,
          data.sort_order,
          now,
          now,
        ],
      );

      await get().loadAccounts();

      return {
        ...data,
        id,
        current_balance: data.opening_balance,
        is_archived: 0,
        created_at: now,
        updated_at: now,
      };
    } catch (err) {
      console.error('[accountStore] addAccount failed:', err);
      throw err;
    }
  },
}));
