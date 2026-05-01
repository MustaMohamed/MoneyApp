import uuid from 'react-native-uuid';

import { Currency, TransactionType } from '@/constants/enums';
import {
  addTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
} from '@/database/transactions';
import { getDb } from '@/database/client';
import type { Transaction } from '@/database/entities/transaction.entity';

export interface NewTransactionInput {
  type: TransactionType;
  amount: number;
  currency: Currency;
  /** EGP equivalent — pass amount directly for EGP accounts, or amount * rate for USD. */
  egp_amount: number;
  /** Required when currency is USD. */
  exchange_rate?: number;
  account_id: string;
  /** Required for transfer and cc_payment. */
  to_account_id?: string;
  /** Required for expense and income. */
  category_id?: string;
  note?: string;
  /** ISO date string, defaults to today. */
  transaction_date?: string;
  /** HH:MM:SS, defaults to current time. */
  transaction_time?: string;
}

export interface ITransactionRepository {
  getAll(limit?: number, offset?: number): Promise<Transaction[]>;
  getByAccount(accountId: string, limit?: number, offset?: number): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  add(data: NewTransactionInput): Promise<Transaction>;
  delete(id: string): Promise<void>;
}

export class TransactionRepository implements ITransactionRepository {
  async getAll(limit = 30, offset = 0): Promise<Transaction[]> {
    const db = await getDb();
    return getTransactions(db, limit, offset);
  }

  async getByAccount(accountId: string, limit = 30, offset = 0): Promise<Transaction[]> {
    const db = await getDb();
    return getTransactionsByAccount(db, accountId, limit, offset);
  }

  async getById(id: string): Promise<Transaction | null> {
    const db = await getDb();
    return getTransactionById(db, id);
  }

  async add(data: NewTransactionInput): Promise<Transaction> {
    const db = await getDb();
    const id = String(uuid.v4());
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const time = now.slice(11, 19);

    const transaction: Transaction = {
      id,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      egp_amount: data.egp_amount,
      exchange_rate: data.exchange_rate ?? null,
      account_id: data.account_id,
      to_account_id: data.to_account_id ?? null,
      category_id: data.category_id ?? null,
      note: data.note ?? null,
      transaction_date: data.transaction_date ?? today,
      transaction_time: data.transaction_time ?? time,
      created_at: now,
      updated_at: now,
    };

    await addTransaction(db, transaction);
    return transaction;
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    await deleteTransaction(db, id);
  }
}
