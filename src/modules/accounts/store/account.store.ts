import { create } from 'zustand';

import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { Account } from '../entities/account.entity';
import {
  accountRepository,
  type IAccountRepository,
  type NewAccountInput,
  type UpdateAccountInput,
} from '../repositories/account.repository';
import { findMissingAccountIds, mergeAccountsById } from './account_lookup.helpers';

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
  deleteAccount: (id: string) => Promise<void>;
  deleteAccountMovingCommitments: (id: string, replacementAccountId: string) => Promise<void>;
  adjustBalance: (id: string, newBalance: number) => Promise<void>;
  confirmBalanceReviewed: (id: string) => Promise<void>;
  reset: () => void;
};

export function createAccountStore(repo: IAccountRepository) {
  let loadRequestId = 0;
  // Ids whose last lookup failed and that no load has answered since; closure state, not store state.
  const failedLookupIds = new Set<string>();

  return createMoneyAppSelectors(
    create<AccountStore>((set, get) => {
      // A landed write must not read as a failed one because the reload after it failed; `loadAccounts` publishes `loadError`.
      const writeThenReload = async <T>(tag: string, write: () => Promise<T>): Promise<T> => {
        let result: T;
        try {
          result = await write();
        } catch (err) {
          console.error(`[accountStore] ${tag} failed:`, err);
          throw err;
        }
        await get()
          .loadAccounts()
          .catch(() => undefined);
        return result;
      };

      const refreshDeletedLookup = async (id: string): Promise<void> => {
        // A cached copy keeps the id known, so the lookup would never fetch the deleted row.
        set((s) =>
          id in s.accountLookupById
            ? {
                accountLookupById: Object.fromEntries(
                  Object.entries(s.accountLookupById).filter(([key]) => key !== id),
                ),
              }
            : s,
        );
        // A failed lookup publishes `accountLookupError`, which the transactions list renders.
        await get()
          .loadAccountLookup([id])
          .catch(() => undefined);
      };

      return {
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
          const missing = findMissingAccountIds([...new Set(ids)], known);
          if (missing.length === 0) return;
          const outstanding = findMissingAccountIds([...failedLookupIds], known);
          if (accountLookupError && outstanding.every((id) => missing.includes(id))) {
            set({ accountLookupError: false });
          }

          try {
            const rows = await repo.getByIdsIncludingArchived(missing);
            if (generation !== loadRequestId) return;
            for (const id of missing) failedLookupIds.delete(id);
            set((s) => ({
              accountLookupById: {
                ...s.accountLookupById,
                ...Object.fromEntries(rows.map((row) => [row.id, row])),
              },
            }));
          } catch (err) {
            if (generation === loadRequestId) {
              for (const id of missing) failedLookupIds.add(id);
              set({ accountLookupError: true });
            }
            console.error('[accountStore] loadAccountLookup failed:', err);
            throw err;
          }
        },

        addAccount: (data) => writeThenReload('addAccount', () => repo.add(data)),

        updateAccount: (id, data) => writeThenReload('updateAccount', () => repo.update(id, data)),

        archiveAccount: (id) => writeThenReload('archiveAccount', () => repo.archive(id)),

        unarchiveAccount: (id) => writeThenReload('unarchiveAccount', () => repo.unarchive(id)),

        deleteAccount: async (id) => {
          await writeThenReload('deleteAccount', () => repo.delete(id));
          await refreshDeletedLookup(id);
        },

        deleteAccountMovingCommitments: async (id, replacementAccountId) => {
          await writeThenReload('deleteAccountMovingCommitments', () =>
            repo.delete(id, replacementAccountId),
          );
          await refreshDeletedLookup(id);
        },

        adjustBalance: (id, newBalance) =>
          writeThenReload('adjustBalance', () => repo.adjustBalance(id, newBalance)),

        confirmBalanceReviewed: (id) =>
          writeThenReload('confirmBalanceReviewed', () => repo.confirmBalanceReviewed(id)),

        reset: () => {
          loadRequestId += 1;
          failedLookupIds.clear();
          set(INITIAL_STATE);
        },
      };
    }),
  );
}

export const useAccountStore = createAccountStore(accountRepository);
