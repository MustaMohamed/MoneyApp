import { create } from 'zustand';

import type { Transaction } from '@/database/entities/transaction.entity';
import {
  TransactionRepository,
  type ITransactionRepository,
  type NewTransactionInput,
} from '@/repositories/transaction.repository';

export type { Transaction, NewTransactionInput };

interface TransactionState {
  transactions: Transaction[];
  loadTransactions: (limit?: number, offset?: number) => Promise<void>;
  addTransaction: (data: NewTransactionInput) => Promise<Transaction>;
  deleteTransaction: (id: string) => Promise<void>;
}

export function createTransactionStore(repo: ITransactionRepository) {
  return create<TransactionState>((set, get) => ({
    transactions: [],

    loadTransactions: async (limit = 30, offset = 0) => {
      try {
        const transactions = await repo.getAll(limit, offset);
        set({ transactions });
      } catch (err) {
        console.error('[transactionStore] loadTransactions failed:', err);
        throw err;
      }
    },

    addTransaction: async (data) => {
      try {
        const transaction = await repo.add(data);
        await get().loadTransactions();
        return transaction;
      } catch (err) {
        console.error('[transactionStore] addTransaction failed:', err);
        throw err;
      }
    },

    deleteTransaction: async (id) => {
      try {
        await repo.delete(id);
        await get().loadTransactions();
      } catch (err) {
        console.error('[transactionStore] deleteTransaction failed:', err);
        throw err;
      }
    },
  }));
}

export const useTransactionStore = createTransactionStore(new TransactionRepository());
