// modules/transactions/repositories/transaction.repository.ts
import uuid from 'react-native-uuid';

import { Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { getDb } from '@/database/client';
import { getBudgetRowById } from '@/modules/budget/database/budgets';

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
  /** Optional named monthly budget assignment for expenses. */
  budget_id?: string;
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

export class TransactionBudgetAssignmentError extends Error {}

async function resolveBudgetAssignment(
  db: Awaited<ReturnType<typeof getDb>>,
  input: {
    type: TransactionType;
    categoryId: string | null | undefined;
    transactionDate: string;
    budgetId: string | null | undefined;
  },
): Promise<string | null> {
  if (input.type !== TransactionType.Expense || !input.budgetId) return null;
  const budget = await getBudgetRowById(db, input.budgetId);
  if (
    !budget ||
    budget.category_id !== input.categoryId ||
    budget.effective_from !== input.transactionDate.slice(0, 7)
  ) {
    throw new TransactionBudgetAssignmentError(Strings.transactionBudgetAssignmentMismatch);
  }
  return budget.id;
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
    const transactionDate = data.transaction_date ?? today;
    const budgetId = await resolveBudgetAssignment(db, {
      type: data.type,
      categoryId: data.category_id,
      transactionDate,
      budgetId: data.budget_id,
    });

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
      budget_id: budgetId,
      note: data.note ?? null,
      transaction_date: transactionDate,
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
    const existing = await getTransactionById(db, id);
    if (!existing) return;
    const budgetId = await resolveBudgetAssignment(db, {
      type: existing.type,
      categoryId: data.category_id === undefined ? existing.category_id : data.category_id,
      transactionDate: data.transaction_date,
      budgetId: data.budget_id === undefined ? existing.budget_id : data.budget_id,
    });
    await updateTransaction(db, id, { ...data, budget_id: budgetId });
  }
}
