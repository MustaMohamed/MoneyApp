// modules/transactions/store/transaction.store.ts
import { makeAutoObservable, runInAction } from 'mobx';

import type { Currency, TransactionType } from '@/constants/enums';

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

export class TransactionStore {
  transactions: Transaction[] = [];
  hasMore = false;
  loading = false;
  hasLoaded = false;
  query: TransactionListFilters = {};
  mutationVersion = 0;

  private requestId = 0;

  constructor(private readonly repository: ITransactionRepository = new TransactionRepository()) {
    makeAutoObservable<TransactionStore, 'repository' | 'requestId' | 'fetchPage'>(
      this,
      {
        repository: false,
        requestId: false,
        fetchPage: false,
      },
      { autoBind: true },
    );
  }

  async setQuery(query: TransactionListFilters): Promise<void> {
    await this.fetchPage(query, 0, 'replace');
  }

  async refresh(): Promise<void> {
    await this.fetchPage(this.query, 0, 'replace');
  }

  async loadMore(): Promise<void> {
    if (!this.hasMore || this.loading) return;
    await this.fetchPage(this.query, this.transactions.length, 'append');
  }

  async getById(id: string): Promise<Transaction | null> {
    return this.repository.getById(id);
  }

  async addTransaction(data: NewTransactionInput): Promise<Transaction> {
    const transaction = await this.repository.add(data);
    this.bumpMutationVersion();
    await this.refresh().catch((err) =>
      console.error('[transactionStore] post-add refresh failed:', err),
    );
    return transaction;
  }

  async deleteTransaction(id: string): Promise<void> {
    await this.repository.delete(id);
    this.bumpMutationVersion();
    await this.refresh().catch((err) =>
      console.error('[transactionStore] post-delete refresh failed:', err),
    );
  }

  async updateTransaction(id: string, data: UpdateTransactionInput): Promise<void> {
    await this.repository.update(id, data);
    this.bumpMutationVersion();
    await this.refresh().catch((err) =>
      console.error('[transactionStore] post-update refresh failed:', err),
    );
  }

  reset(): void {
    this.requestId += 1;
    this.transactions = [];
    this.hasMore = false;
    this.loading = false;
    this.hasLoaded = false;
    this.query = {};
    this.mutationVersion = 0;
  }

  private async fetchPage(
    filters: TransactionListFilters,
    offset: number,
    mode: 'replace' | 'append',
  ): Promise<void> {
    const requestId = ++this.requestId;
    this.loading = true;

    try {
      const rows = await this.repository.getAll({ ...filters, limit: PAGE_SIZE, offset });
      if (requestId !== this.requestId) return;

      const hasMore = rows.length === PAGE_SIZE;
      runInAction(() => {
        if (mode === 'replace') {
          this.transactions = rows;
          this.hasMore = hasMore;
          this.loading = false;
          this.hasLoaded = true;
          this.query = filters;
          return;
        }

        this.transactions = [...this.transactions, ...rows];
        this.hasMore = hasMore;
        this.loading = false;
      });
    } catch (err) {
      if (requestId === this.requestId) {
        runInAction(() => {
          this.loading = false;
        });
      }
      console.error('[transactionStore] fetch failed:', err);
      throw err;
    }
  }

  private bumpMutationVersion(): void {
    this.mutationVersion += 1;
  }
}

export function createTransactionStore(repo: ITransactionRepository): TransactionStore {
  return new TransactionStore(repo);
}

export const transactionStore = new TransactionStore(new TransactionRepository());

export function useTransactionStore(): TransactionStore {
  return transactionStore;
}
