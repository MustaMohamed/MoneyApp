// modules/transactions/store/transaction.store.ts
import { batch, signal, type ReadonlySignal } from '@preact/signals-react';

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

const INITIAL_TRANSACTIONS: Transaction[] = [];
const INITIAL_QUERY: TransactionListFilters = {};

type TransactionSignalState = {
  transactions: ReadonlySignal<Transaction[]>;
  hasMore: ReadonlySignal<boolean>;
  loading: ReadonlySignal<boolean>;
  hasLoaded: ReadonlySignal<boolean>;
  query: ReadonlySignal<TransactionListFilters>;
  mutationVersion: ReadonlySignal<number>;
};

export class TransactionStore {
  private readonly transactions = signal(INITIAL_TRANSACTIONS);
  private readonly hasMore = signal(false);
  private readonly loading = signal(false);
  private readonly hasLoaded = signal(false);
  private readonly query = signal(INITIAL_QUERY);
  private readonly mutationVersion = signal(0);

  readonly state: TransactionSignalState = {
    transactions: this.transactions,
    hasMore: this.hasMore,
    loading: this.loading,
    hasLoaded: this.hasLoaded,
    query: this.query,
    mutationVersion: this.mutationVersion,
  };

  private requestId = 0;

  constructor(private readonly repo: ITransactionRepository) {}

  private fetchPage = async (
    filters: TransactionListFilters,
    offset: number,
    mode: 'replace' | 'append',
  ): Promise<void> => {
    const myId = ++this.requestId;
    this.loading.value = true;
    try {
      const rows = await this.repo.getAll({ ...filters, limit: PAGE_SIZE, offset });
      if (myId !== this.requestId) return;

      const hasMore = rows.length === PAGE_SIZE;
      if (mode === 'replace') {
        batch(() => {
          this.transactions.value = rows;
          this.hasMore.value = hasMore;
          this.loading.value = false;
          this.hasLoaded.value = true;
          this.query.value = filters;
        });
        return;
      }

      batch(() => {
        this.transactions.value = [...this.transactions.value, ...rows];
        this.hasMore.value = hasMore;
        this.loading.value = false;
      });
    } catch (err) {
      if (myId === this.requestId) {
        this.loading.value = false;
      }
      console.error('[transactionStore] fetch failed:', err);
      throw err;
    }
  };

  private bumpMutationVersion = () => {
    this.mutationVersion.value += 1;
  };

  setQuery = (q: TransactionListFilters): Promise<void> => this.fetchPage(q, 0, 'replace');

  refresh = (): Promise<void> => this.fetchPage(this.query.value, 0, 'replace');

  loadMore = async (): Promise<void> => {
    if (!this.hasMore.value || this.loading.value) return;
    await this.fetchPage(this.query.value, this.transactions.value.length, 'append');
  };

  getById = async (id: string): Promise<Transaction | null> => this.repo.getById(id);

  addTransaction = async (data: NewTransactionInput): Promise<Transaction> => {
    const tx = await this.repo.add(data);
    this.bumpMutationVersion();
    await this.refresh().catch((err) =>
      console.error('[transactionStore] post-add refresh failed:', err),
    );
    return tx;
  };

  deleteTransaction = async (id: string): Promise<void> => {
    await this.repo.delete(id);
    this.bumpMutationVersion();
    await this.refresh().catch((err) =>
      console.error('[transactionStore] post-delete refresh failed:', err),
    );
  };

  updateTransaction = async (id: string, data: UpdateTransactionInput): Promise<void> => {
    await this.repo.update(id, data);
    this.bumpMutationVersion();
    await this.refresh().catch((err) =>
      console.error('[transactionStore] post-update refresh failed:', err),
    );
  };

  reset = () => {
    this.requestId += 1;
    batch(() => {
      this.transactions.value = INITIAL_TRANSACTIONS;
      this.hasMore.value = false;
      this.loading.value = false;
      this.hasLoaded.value = false;
      this.query.value = INITIAL_QUERY;
      this.mutationVersion.value = 0;
    });
  };
}

export function createTransactionStore(repo: ITransactionRepository): TransactionStore {
  return new TransactionStore(repo);
}

const transactionStore = createTransactionStore(new TransactionRepository());

export function useTransactionStore(): TransactionStore {
  return transactionStore;
}
