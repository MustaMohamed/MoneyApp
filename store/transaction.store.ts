import { create } from 'zustand';

import type { TransactionType } from '@/constants/enums';
import type { Transaction } from '@/database/entities/transaction.entity';
import {
  TransactionRepository,
  type ITransactionRepository,
  type NewTransactionInput,
  type TransactionListQuery,
} from '@/repositories/transaction.repository';

export type { Transaction, NewTransactionInput, TransactionListQuery };

export const PAGE_SIZE = 30;

export interface TransactionListFilters {
  type?: TransactionType;
  search?: string;
}

interface TransactionState {
  transactions: Transaction[];
  hasMore: boolean;
  loading: boolean;
  query: TransactionListFilters;

  setQuery: (q: TransactionListFilters) => Promise<void>;
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;

  getById: (id: string) => Promise<Transaction | null>;
  addTransaction: (data: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

export function createTransactionStore(repo: ITransactionRepository) {
  // Module-scoped to this store instance — race guard for setQuery / loadMore / refresh.
  let requestId = 0;

  return create<TransactionState>((set, get) => {
    async function fetchPage(
      filters: TransactionListFilters,
      offset: number,
      mode: 'replace' | 'append',
    ) {
      const myId = ++requestId;
      set({ loading: true });
      try {
        const rows = await repo.getAll({ ...filters, limit: PAGE_SIZE, offset });
        if (myId !== requestId) return; // stale — newer request superseded us
        const hasMore = rows.length === PAGE_SIZE;
        if (mode === 'replace') {
          set({ transactions: rows, hasMore, loading: false, query: filters });
        } else {
          set({
            transactions: [...get().transactions, ...rows],
            hasMore,
            loading: false,
          });
        }
      } catch (err) {
        if (myId === requestId) set({ loading: false });
        console.error('[transactionStore] fetch failed:', err);
        throw err;
      }
    }

    return {
      transactions: [],
      hasMore: false,
      loading: false,
      query: {},

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
        // Swallow refresh errors: the add succeeded; a follow-up list-refresh
        // failure shouldn't trick the caller into thinking the add failed.
        // The list will catch up on the next setQuery / refresh.
        await get()
          .refresh()
          .catch((err) => console.error('[transactionStore] post-add refresh failed:', err));
        return tx;
      },

      deleteTransaction: async (id) => {
        await repo.delete(id);
        // Same reasoning as addTransaction: don't surface a refresh failure
        // as if the delete itself failed.
        await get()
          .refresh()
          .catch((err) => console.error('[transactionStore] post-delete refresh failed:', err));
      },
    };
  });
}

export const useTransactionStore = createTransactionStore(new TransactionRepository());
