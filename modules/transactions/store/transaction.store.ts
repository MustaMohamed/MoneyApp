// modules/transactions/store/transaction.store.ts
import { create } from 'zustand';

import { Currency, type TransactionType } from '@/constants/enums';

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
  query: {} as TransactionListFilters,
};

interface TransactionStore {
  state: typeof INITIAL_STATE;

  setQuery: (q: TransactionListFilters) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  getById: (id: string) => Promise<Transaction | null>;
  addTransaction: (data: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransactionInput) => Promise<void>;
  reset: () => void;
}

export function createTransactionStore(repo: ITransactionRepository) {
  let requestId = 0;

  return create<TransactionStore>((set, get) => {
    async function fetchPage(
      filters: TransactionListFilters,
      offset: number,
      mode: 'replace' | 'append',
    ) {
      const myId = ++requestId;
      set((s) => ({ state: { ...s.state, loading: true } }));
      try {
        const rows = await repo.getAll({ ...filters, limit: PAGE_SIZE, offset });
        if (myId !== requestId) return;
        const hasMore = rows.length === PAGE_SIZE;
        if (mode === 'replace') {
          set({ state: { transactions: rows, hasMore, loading: false, query: filters } });
        } else {
          set((s) => ({
            state: {
              ...s.state,
              transactions: [...s.state.transactions, ...rows],
              hasMore,
              loading: false,
            },
          }));
        }
      } catch (err) {
        if (myId === requestId) set((s) => ({ state: { ...s.state, loading: false } }));
        console.error('[transactionStore] fetch failed:', err);
        throw err;
      }
    }

    return {
      state: INITIAL_STATE,

      setQuery: (q) => fetchPage(q, 0, 'replace'),

      refresh: () => fetchPage(get().state.query, 0, 'replace'),

      loadMore: async () => {
        const { hasMore, loading, query, transactions } = get().state;
        if (!hasMore || loading) return;
        await fetchPage(query, transactions.length, 'append');
      },

      getById: async (id) => repo.getById(id),

      addTransaction: async (data) => {
        const tx = await repo.add(data);
        await get()
          .refresh()
          .catch((err) => console.error('[transactionStore] post-add refresh failed:', err));
        return tx;
      },

      deleteTransaction: async (id) => {
        await repo.delete(id);
        await get()
          .refresh()
          .catch((err) => console.error('[transactionStore] post-delete refresh failed:', err));
      },

      updateTransaction: async (id, data) => {
        await repo.update(id, data);
        await get()
          .refresh()
          .catch((err) => console.error('[transactionStore] post-update refresh failed:', err));
      },

      reset: () => {
        requestId++;
        set({ state: INITIAL_STATE });
      },
    };
  });
}

export const useTransactionStore = createTransactionStore(new TransactionRepository());
