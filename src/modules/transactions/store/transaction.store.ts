// modules/transactions/store/transaction.store.ts
import { create } from 'zustand';

import { Currency, type TransactionType } from '@/constants/enums';
import { createMoneyAppSelectors } from '@/utils/zustand_selectors';

import type { Transaction } from '../entities/transaction.entity';
import {
  TransactionRepository,
  type ITransactionRepository,
  type NewTransactionInput,
  type TransactionListQuery,
  type UpdateTransactionInput,
} from '../repositories/transaction.repository';

export type { Transaction, NewTransactionInput, TransactionListQuery, UpdateTransactionInput };

export const PAGE_SIZE = 30;

export interface TransactionListFilters {
  type?: TransactionType;
  search?: string;
  accountIds?: string[];
  categoryIds?: string[];
  dateFrom?: string;
  dateTo?: string;
  amountMin?: number;
  amountMax?: number;
  amountCurrency?: Currency;
}

const INITIAL_STATE = {
  transactions: [] as Transaction[],
  hasMore: false,
  loading: false,
  hasLoaded: false,
  query: {} as TransactionListFilters,
  mutationVersion: 0,
};

type TransactionStore = typeof INITIAL_STATE & {
  setQuery: (q: TransactionListFilters) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  getById: (id: string) => Promise<Transaction | null>;
  addTransaction: (data: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransactionInput) => Promise<void>;
  reset: () => void;
};

export function createTransactionStore(repo: ITransactionRepository) {
  let requestId = 0;

  return createMoneyAppSelectors(
    create<TransactionStore>((set, get) => {
      async function fetchPage(
        filters: TransactionListFilters,
        offset: number,
        mode: 'replace' | 'append',
      ) {
        const myId = ++requestId;
        set({ loading: true });
        try {
          const rows = await repo.getAll({ ...filters, limit: PAGE_SIZE, offset });
          if (myId !== requestId) return;
          const hasMore = rows.length === PAGE_SIZE;
          if (mode === 'replace') {
            set({
              transactions: rows,
              hasMore,
              loading: false,
              hasLoaded: true,
              query: filters,
            });
          } else {
            set((s) => ({
              transactions: [...s.transactions, ...rows],
              hasMore,
              loading: false,
            }));
          }
        } catch (err) {
          if (myId === requestId) set({ loading: false });
          console.error('[transactionStore] fetch failed:', err);
          throw err;
        }
      }

      function bumpMutationVersion() {
        set((s) => ({
          mutationVersion: s.mutationVersion + 1,
        }));
      }

      return {
        ...INITIAL_STATE,

        setQuery: (q) => fetchPage(q, 0, 'replace'),

        refresh: () => fetchPage(get().query, 0, 'replace'),

        loadMore: async () => {
          const { hasMore, loading, query, transactions } = get();
          if (!hasMore || loading) return;
          await fetchPage(query, transactions.length, 'append');
        },

        getById: async (id) => repo.getById(id),

        addTransaction: async (data) => {
          const tx = await repo.add(data);
          bumpMutationVersion();
          await get()
            .refresh()
            .catch((err) => console.error('[transactionStore] post-add refresh failed:', err));
          return tx;
        },

        deleteTransaction: async (id) => {
          await repo.delete(id);
          bumpMutationVersion();
          await get()
            .refresh()
            .catch((err) => console.error('[transactionStore] post-delete refresh failed:', err));
        },

        updateTransaction: async (id, data) => {
          await repo.update(id, data);
          bumpMutationVersion();
          await get()
            .refresh()
            .catch((err) => console.error('[transactionStore] post-update refresh failed:', err));
        },

        reset: () => {
          requestId++;
          set(INITIAL_STATE);
        },
      };
    }),
  );
}

export const useTransactionStore = createTransactionStore(new TransactionRepository());
