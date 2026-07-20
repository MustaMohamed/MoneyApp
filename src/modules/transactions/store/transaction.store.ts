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
import { getTransactionQueryKey } from './transaction_query.helpers';

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

export type TransactionListStatus =
  | 'idle'
  | 'initialLoading'
  | 'ready'
  | 'empty'
  | 'firstLoadError'
  | 'refreshing'
  | 'refreshErrorWithData';

const EMPTY_QUERY: TransactionListFilters = {};

const INITIAL_STATE = {
  transactions: [] as Transaction[],
  hasMore: false,
  loadingMore: false,
  paginationError: false,
  query: EMPTY_QUERY,
  queryKey: getTransactionQueryKey(EMPTY_QUERY),
  snapshotKey: undefined as string | undefined,
  status: 'idle' as TransactionListStatus,
  mutationVersion: 0,
};

type TransactionStore = typeof INITIAL_STATE & {
  setQuery: (q: TransactionListFilters) => Promise<void>;
  refresh: () => Promise<void>;
  retry: () => Promise<void>;
  loadMore: () => Promise<void>;

  getById: (id: string) => Promise<Transaction | null>;
  addTransaction: (data: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
  updateTransaction: (id: string, data: UpdateTransactionInput) => Promise<void>;
  reset: () => void;
};

export function createTransactionStore(repo: ITransactionRepository) {
  let replaceRequestId = 0;
  let pageRequestId = 0;

  return createMoneyAppSelectors(
    create<TransactionStore>((set, get) => {
      async function replaceSnapshot(filters: TransactionListFilters, preserveSnapshot: boolean) {
        const key = getTransactionQueryKey(filters);
        const myId = ++replaceRequestId;
        pageRequestId++;
        const current = get();
        const canPreserve = preserveSnapshot && current.snapshotKey === key;

        if (canPreserve) {
          set({ status: 'refreshing', loadingMore: false, paginationError: false });
        } else {
          set({
            transactions: [],
            hasMore: false,
            loadingMore: false,
            paginationError: false,
            query: filters,
            queryKey: key,
            snapshotKey: undefined,
            status: 'initialLoading',
          });
        }

        try {
          const rows = await repo.getAll({ ...filters, limit: PAGE_SIZE, offset: 0 });
          if (myId !== replaceRequestId || get().queryKey !== key) return;
          const hasMore = rows.length === PAGE_SIZE;
          set({
            transactions: rows,
            hasMore,
            query: filters,
            queryKey: key,
            snapshotKey: key,
            status: rows.length === 0 ? 'empty' : 'ready',
          });
        } catch (err) {
          if (myId === replaceRequestId && get().queryKey === key) {
            set({ status: canPreserve ? 'refreshErrorWithData' : 'firstLoadError' });
          }
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

        setQuery: async (q) => {
          const key = getTransactionQueryKey(q);
          const state = get();
          if (state.queryKey === key && state.status !== 'idle') return;
          await replaceSnapshot(q, false);
        },

        refresh: () => replaceSnapshot(get().query, true),

        retry: () => {
          const state = get();
          return replaceSnapshot(state.query, state.snapshotKey === state.queryKey);
        },

        loadMore: async () => {
          const { hasMore, loadingMore, query, queryKey, snapshotKey, status, transactions } =
            get();
          if (!hasMore || loadingMore || status === 'refreshing' || snapshotKey !== queryKey)
            return;
          const myId = ++pageRequestId;
          set({ loadingMore: true, paginationError: false });
          try {
            const rows = await repo.getAll({
              ...query,
              limit: PAGE_SIZE,
              offset: transactions.length,
            });
            if (
              myId !== pageRequestId ||
              get().queryKey !== queryKey ||
              get().snapshotKey !== queryKey
            ) {
              return;
            }
            set((state) => ({
              transactions: [...state.transactions, ...rows],
              hasMore: rows.length === PAGE_SIZE,
              loadingMore: false,
              paginationError: false,
              status: 'ready',
            }));
          } catch (error) {
            if (myId === pageRequestId && get().queryKey === queryKey) {
              set({ loadingMore: false, paginationError: true });
            }
            console.error('[transactionStore] page fetch failed:', error);
          }
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
          replaceRequestId++;
          pageRequestId++;
          set(INITIAL_STATE);
        },
      };
    }),
  );
}

export const useTransactionStore = createTransactionStore(new TransactionRepository());
