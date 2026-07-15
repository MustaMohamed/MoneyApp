// modules/transactions/repositories/transaction.repository.ts
import uuid from 'react-native-uuid';

import { Currency, TransactionType } from '@/constants/enums';
import { getDb } from '@/database/client';

import {
  addTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
  updateTransaction,
  type TransactionListQuery,
  type UpdateTransactionInput,
} from '../database/transactions';
import type { Transaction } from '../entities/transaction.entity';

export type { TransactionListQuery, UpdateTransactionInput };

export interface NewTransactionInput {
  type: TransactionType;
  amount: number;
  currency: Currency;
  /** EGP equivalent — amount for EGP accounts, amount × rate for USD accounts. */
  egp_amount: number;
  /**
   * Amount received by the TO account in its native currency.
   * Required for transfer and cc_payment; omit for expense and income.
   *
   *   EGP → EGP: amount
   *   USD → EGP: egp_amount
   *   EGP → USD: amount / rate
   *   USD → USD: amount
   *   cc_payment: egp_amount (CC debt is EGP-denominated)
   */
  to_amount?: number;
  /** Required when a USD↔EGP conversion is involved. */
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
  getAll(query?: TransactionListQuery): Promise<Transaction[]>;
  getByAccount(accountId: string, limit?: number, offset?: number): Promise<Transaction[]>;
  getById(id: string): Promise<Transaction | null>;
  add(data: NewTransactionInput): Promise<Transaction>;
  delete(id: string): Promise<void>;
  update(id: string, data: UpdateTransactionInput): Promise<void>;
}

export class TransactionRepository implements ITransactionRepository {
  async getAll(query: TransactionListQuery = {}): Promise<Transaction[]> {
    const db = await getDb();
    return getTransactions(db, query);
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

    // Snapshot the CC account's minimum_payment at save time so reversals remain accurate
    // even if the user later changes the CC account's minimum_payment.
    let minimumPaymentSnapshot: number | null = null;
    if (data.type === TransactionType.CCPayment && data.to_account_id) {
      const rows = await db.getAllAsync<{ minimum_payment: number | null }>(
        'SELECT minimum_payment FROM accounts WHERE id = ?',
        [data.to_account_id],
      );
      minimumPaymentSnapshot = rows[0]?.minimum_payment ?? null;
    }

    const transaction: Transaction = {
      id,
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      egp_amount: data.egp_amount,
      exchange_rate: data.exchange_rate ?? null,
      to_amount: data.to_amount ?? null,
      minimum_payment_snapshot: minimumPaymentSnapshot,
      account_id: data.account_id,
      to_account_id: data.to_account_id ?? null,
      category_id: data.category_id ?? null,
      budget_id: null,
      note: data.note ?? null,
      transaction_date: data.transaction_date ?? today,
      transaction_time: data.transaction_time ?? time,
      commitment_payment_id: null,
      installment_id: null,
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

  async update(id: string, data: UpdateTransactionInput): Promise<void> {
    const db = await getDb();
    await updateTransaction(db, id, data);
  }
}
