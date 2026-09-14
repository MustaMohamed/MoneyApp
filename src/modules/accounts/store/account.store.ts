import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { Account } from '../entities/account.entity';
import {
  accountRepository,
  type IAccountRepository,
  type NewAccountInput,
  type UpdateAccountInput,
} from '../repositories/account.repository';
import { mergeAccountsById } from './account_lookup.helpers';

export type { Account, NewAccountInput, UpdateAccountInput };

export const EMPTY_ACCOUNTS: Account[] = [];
Object.freeze(EMPTY_ACCOUNTS);

export const EMPTY_ACCOUNT_LOOKUP: Readonly<Record<string, Account>> = Object.freeze({});

const INITIAL_STATE = {
  accounts: EMPTY_ACCOUNTS,
  archivedAccounts: EMPTY_ACCOUNTS,
  accountLookupById: EMPTY_ACCOUNT_LOOKUP,
  accountLookupError: false,
  archivedCount: 0,
  hasLoaded: false,
  loadError: false,
};

export type AccountStore = typeof INITIAL_STATE & {
  loadAccounts: () => Promise<void>;
  loadAccountLookup: (ids: string[]) => Promise<void>;
  addAccount: (data: NewAccountInput) => Promise<Account>;
  updateAccount: (id: string, data: UpdateAccountInput) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  unarchiveAccount: (id: string) => Promise<void>;
  adjustBalance: (id: string, newBalance: number) => Promise<void>;
  confirmBalanceReviewed: (id: string) => Promise<void>;
  reset: () => void;
};

export function createAccountStore(repo: IAccountRepository) {
  let loadRequestId = 0;

  return createMoneyAppSelectors(
    create<AccountStore>((set, get) => ({
      ...INITIAL_STATE,

      // `loadError` means the last *settled* read failed, so a reload in flight keeps it up.
      loadAccounts: async () => {
        const requestId = ++loadRequestId;

        try {
          const [accounts, archivedAccounts] = await Promise.all([
            repo.getAll(),
            repo.getArchived(),
          ]);
          if (requestId === loadRequestId) {
            set({
              accounts,
              archivedAccounts,
              archivedCount: archivedAccounts.length,
              hasLoaded: true,
              loadError: false,
            });
          }
        } catch (err) {
          if (requestId === loadRequestId) set({ loadError: true });
          console.error('[accountStore] loadAccounts failed:', err);
          throw err;
        }
      },

      loadAccountLookup: async (ids) => {
        const generation = loadRequestId;
        const { accounts, archivedAccounts, accountLookupById, accountLookupError } = get();
        const known = mergeAccountsById(accounts, archivedAccounts, accountLookupById);
        const missing = [...new Set(ids)].filter((id) => !known.has(id));
        if (missing.length === 0) return;
        if (accountLookupError) set({ accountLookupError: false });

        try {
          const rows = await repo.getByIdsIncludingArchived(missing);
          if (generation !== loadRequestId) return;
          set((s) => ({
            accountLookupById: {
              ...s.accountLookupById,
              ...Object.fromEntries(rows.map((row) => [row.id, row])),
            },
          }));
        } catch (err) {
          if (generation === loadRequestId) set({ accountLookupError: true });
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
        } catch (err) {
          console.error('[accountStore] archiveAccount failed:', err);
          throw err;
        }
        // The row is archived, so a failing reload must not read as a failed archive; it publishes `loadError`.
        await get()
          .loadAccounts()
          .catch(() => undefined);
      },

      unarchiveAccount: async (id) => {
        try {
          await repo.unarchive(id);
          await get().loadAccounts();
        } catch (err) {
          console.error('[accountStore] unarchiveAccount failed:', err);
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
        set(INITIAL_STATE);
      },
    })),
  );
}

export const useAccountStore = createAccountStore(accountRepository);
