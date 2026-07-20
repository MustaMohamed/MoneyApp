import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { Account } from '../entities/account.entity';
import {
  accountRepository,
  type IAccountRepository,
  type NewAccountInput,
  type UpdateAccountInput,
} from '../repositories/account.repository';

export type { Account, NewAccountInput, UpdateAccountInput };

export const EMPTY_ACCOUNTS: Account[] = [];
Object.freeze(EMPTY_ACCOUNTS);

export const EMPTY_ACCOUNT_LOOKUP: Account[] = [];
Object.freeze(EMPTY_ACCOUNT_LOOKUP);

const INITIAL_STATE = {
  accounts: EMPTY_ACCOUNTS,
  accountLookup: EMPTY_ACCOUNT_LOOKUP,
  hasLoaded: false,
};

export type AccountStore = typeof INITIAL_STATE & {
  loadAccounts: () => Promise<void>;
  loadAccountLookup: (ids: string[]) => Promise<void>;
  addAccount: (data: NewAccountInput) => Promise<Account>;
  updateAccount: (id: string, data: UpdateAccountInput) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  adjustBalance: (id: string, newBalance: number) => Promise<void>;
  confirmBalanceReviewed: (id: string) => Promise<void>;
  reset: () => void;
};

export function createAccountStore(repo: IAccountRepository) {
  let loadRequestId = 0;
  let lookupRequestId = 0;

  return createMoneyAppSelectors(
    create<AccountStore>((set, get) => ({
      ...INITIAL_STATE,

      loadAccounts: async () => {
        const requestId = ++loadRequestId;

        try {
          const accounts = await repo.getAll();
          if (requestId === loadRequestId) {
            set({ accounts, hasLoaded: true });
          }
        } catch (err) {
          console.error('[accountStore] loadAccounts failed:', err);
          throw err;
        }
      },

      loadAccountLookup: async (ids) => {
        const requestId = ++lookupRequestId;
        const uniqueIds = [...new Set(ids)];
        if (uniqueIds.length === 0) {
          set({ accountLookup: EMPTY_ACCOUNT_LOOKUP });
          return;
        }

        try {
          const accountLookup = await repo.getByIdsIncludingArchived(uniqueIds);
          if (requestId === lookupRequestId) {
            set({ accountLookup });
          }
        } catch (err) {
          console.error('[accountStore] loadAccountLookup failed:', err);
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

      confirmBalanceReviewed: async (id) => {
        try {
          await repo.confirmBalanceReviewed(id);
          await get().loadAccounts();
        } catch (err) {
          console.error('[accountStore] confirmBalanceReviewed failed:', err);
          throw err;
        }
      },

      reset: () => {
        loadRequestId += 1;
        lookupRequestId += 1;
        set(INITIAL_STATE);
      },
    })),
  );
}

export const useAccountStore = createAccountStore(accountRepository);
