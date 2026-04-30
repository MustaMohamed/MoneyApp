import { create } from 'zustand';

import type { Account } from '@/database/entities/account.entity';
import {
  AccountRepository,
  type IAccountRepository,
  type NewAccountInput,
} from '@/repositories/account.repository';

export type { Account, NewAccountInput };

interface AccountState {
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  addAccount: (data: NewAccountInput) => Promise<Account>;
}

export function createAccountStore(repo: IAccountRepository) {
  return create<AccountState>((set, get) => ({
    accounts: [],

    loadAccounts: async () => {
      try {
        const accounts = await repo.getAll();
        set({ accounts });
      } catch (err) {
        console.error('[accountStore] loadAccounts failed:', err);
        throw err;
      }
    },

    addAccount: async (data: NewAccountInput) => {
      try {
        const account = await repo.add(data);
        await get().loadAccounts();
        return account;
      } catch (err) {
        console.error('[accountStore] addAccount failed:', err);
        throw err;
      }
    },
  }));
}

export const useAccountStore = createAccountStore(new AccountRepository());
