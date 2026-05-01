import { create } from 'zustand';

import type { Account } from '@/database/entities/account.entity';
import {
  AccountRepository,
  type IAccountRepository,
  type NewAccountInput,
  type UpdateAccountInput,
} from '@/repositories/account.repository';

export type { Account, NewAccountInput, UpdateAccountInput };

interface AccountState {
  accounts: Account[];
  loadAccounts: () => Promise<void>;
  addAccount: (data: NewAccountInput) => Promise<Account>;
  updateAccount: (id: string, data: UpdateAccountInput) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  adjustBalance: (id: string, newBalance: number) => Promise<void>;
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

    addAccount: async (data) => {
      try {
        const account = await repo.add(data);
        await get().loadAccounts();
        return account;
      } catch (err) {
        console.error('[accountStore] addAccount failed:', err);
        throw err;
      }
    },

    updateAccount: async (id, data) => {
      try {
        await repo.update(id, data);
        await get().loadAccounts();
      } catch (err) {
        console.error('[accountStore] updateAccount failed:', err);
        throw err;
      }
    },

    archiveAccount: async (id) => {
      try {
        await repo.archive(id);
        await get().loadAccounts();
      } catch (err) {
        console.error('[accountStore] archiveAccount failed:', err);
        throw err;
      }
    },

    adjustBalance: async (id, newBalance) => {
      try {
        await repo.adjustBalance(id, newBalance);
        await get().loadAccounts();
      } catch (err) {
        console.error('[accountStore] adjustBalance failed:', err);
        throw err;
      }
    },
  }));
}

export const useAccountStore = createAccountStore(new AccountRepository());
