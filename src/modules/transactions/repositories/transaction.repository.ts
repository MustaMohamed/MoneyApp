import uuid from 'react-native-uuid';

import { CategoryType, Currency, TransactionType } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { getDb } from '@/database/client';
import {
  applyAccountDelta,
  getAccountByIdIncludingArchived,
} from '@/modules/accounts/database/accounts';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { getBudgetRowById } from '@/modules/budget/database/budgets';
import { getCategoryById } from '@/modules/categories/database/categories';
import { roundMoney } from '@/utils/money';

import {
  deleteTransactionRow,
  getTransactionById,
  getTransactions,
  getTransactionsByAccount,
  insertTransactionRow,
  updateTransactionRow,
  type TransactionListQuery,
  type UpdateTransactionInput,
} from '../database/transactions';
import {
  resolveCreateDeltas,
  resolveDeleteDeltas,
  resolveReportingClass,
  resolveUpdateDeltas,
  TransactionPolicyError,
  type LedgerAccountSnapshot,
  type TransactionPolicyCommand,
  type TransactionReportingClass,
} from '../domain/transaction_policy';
import type { Transaction } from '../entities/transaction.entity';
import {
  TransactionBalanceError,
  TransactionNotFoundError,
  TransactionOwnershipError,
  TransactionValidationError,
} from './transaction.errors';

export type { TransactionListQuery, UpdateTransactionInput };

export interface NewTransactionInput {
  type: TransactionType;
  amount: number;
  currency: Currency;
  /** EGP equivalent — amount for EGP accounts, amount × rate for USD accounts. */
  egp_amount: number;
  /** Amount received by the destination account in its native currency. */
  to_amount?: number;
  /** EGP per USD, required whenever either participating account uses USD. */
  exchange_rate?: number;
  account_id: string;
  /** Required for transfer and cc_payment. */
  to_account_id?: string;
  /** Required for expense, cash income, and Card credit. */
  category_id?: string;
  /** Optional named monthly budget assignment for expenses and Card credits. */
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

export class TransactionBudgetAssignmentError extends TransactionValidationError {}

function toAccountSnapshot(account: Account): LedgerAccountSnapshot {
  return {
    id: account.id,
    type: account.type,
    currency: account.currency,
    currentBalance: account.current_balance,
    revolvingBalance: account.revolving_balance,
    minimumPayment: account.minimum_payment,
  };
}

function isBalanceIssue(code: string): boolean {
  return code === 'card_credit_exceeds_liability' || code === 'cc_payment_exceeds_liability';
}

function resolvePolicyDeltas(resolve: () => ReturnType<typeof resolveCreateDeltas>) {
  try {
    return resolve();
  } catch (error) {
    if (!(error instanceof TransactionPolicyError)) throw error;
    if (error.issues.some((issue) => isBalanceIssue(issue.code))) {
      throw new TransactionBalanceError(error.message, error.issues);
    }
    throw new TransactionValidationError(error.message, error.issues);
  }
}

async function loadAccount(
  db: Awaited<ReturnType<typeof getDb>>,
  id: string | null | undefined,
): Promise<Account | undefined> {
  return id ? getAccountByIdIncludingArchived(db, id) : undefined;
}

function requireAccount(account: Account | undefined, role: 'source' | 'destination'): Account {
  if (!account) throw new TransactionValidationError(`${role} account not found`);
  return account;
}

function requireSelectableAccount(account: Account, role: 'source' | 'destination'): void {
  if (account.is_archived === 1) {
    throw new TransactionValidationError(`${role} account is archived`);
  }
}

function normalizedAmountsMatch(input: {
  amount: number;
  egpAmount: number;
  toAmount: number | null;
  exchangeRate: number | null;
  source: Account;
  destination?: Account;
  type: TransactionType;
}): boolean {
  const needsRate =
    input.source.currency === Currency.USD || input.destination?.currency === Currency.USD;
  const rate = input.exchangeRate;
  if (needsRate && (!rate || !Number.isFinite(rate) || rate <= 0)) return false;

  const expectedEgp =
    input.source.currency === Currency.USD
      ? roundMoney(input.amount * (rate ?? 0))
      : roundMoney(input.amount);
  if (roundMoney(input.egpAmount) !== expectedEgp) return false;

  if (input.type !== TransactionType.Transfer && input.type !== TransactionType.CCPayment) {
    return input.toAmount === null;
  }
  if (!input.destination || input.toAmount === null) return false;

  const expectedDestination =
    input.type === TransactionType.CCPayment || input.destination.currency === Currency.EGP
      ? expectedEgp
      : input.source.currency === Currency.USD
        ? roundMoney(input.amount)
        : roundMoney(expectedEgp / (rate ?? 0));
  return roundMoney(input.toAmount) === expectedDestination;
}

function validateNormalizedInput(input: {
  amount: number;
  currency: Currency;
  egpAmount: number;
  toAmount: number | null;
  exchangeRate: number | null;
  source: Account;
  destination?: Account;
  type: TransactionType;
}): void {
  if (input.currency !== input.source.currency) {
    throw new TransactionValidationError('Transaction currency must match the source account');
  }
  if (!normalizedAmountsMatch(input)) {
    throw new TransactionValidationError('Transaction amounts do not reconcile');
  }
}

function expectedCategoryType(reportingClass: TransactionReportingClass): CategoryType | undefined {
  if (reportingClass === 'income') return CategoryType.Income;
  if (reportingClass === 'expense' || reportingClass === 'card_credit') {
    return CategoryType.Expense;
  }
  return undefined;
}

async function resolveCategoryAndBudget(
  db: Awaited<ReturnType<typeof getDb>>,
  input: {
    reportingClass: TransactionReportingClass;
    categoryId: string | null | undefined;
    transactionDate: string;
    budgetId: string | null | undefined;
  },
): Promise<{ categoryId: string | null; budgetId: string | null }> {
  const expectedType = expectedCategoryType(input.reportingClass);
  if (!expectedType) {
    if (input.categoryId || input.budgetId) {
      throw new TransactionValidationError('This transaction type cannot use a category or budget');
    }
    return { categoryId: null, budgetId: null };
  }
  if (!input.categoryId) throw new TransactionValidationError('A category is required');

  const category = await getCategoryById(db, input.categoryId);
  if (!category || category.type !== expectedType) {
    throw new TransactionValidationError('Category type does not match the transaction');
  }

  if (!input.budgetId) return { categoryId: category.id, budgetId: null };
  if (expectedType !== CategoryType.Expense) {
    throw new TransactionBudgetAssignmentError('Cash income cannot use a budget');
  }
  const budget = await getBudgetRowById(db, input.budgetId);
  if (
    !budget ||
    budget.category_id !== category.id ||
    budget.effective_from !== input.transactionDate.slice(0, 7)
  ) {
    throw new TransactionBudgetAssignmentError(Strings.transactionBudgetAssignmentMismatch);
  }
  return { categoryId: category.id, budgetId: budget.id };
}

function toPolicyCommand(input: {
  type: TransactionType;
  amount: number;
  egpAmount: number;
  toAmount: number | null;
  minimumPaymentSnapshot: number | null;
  source: Account;
  destination?: Account;
}): TransactionPolicyCommand {
  return {
    type: input.type,
    amount: input.amount,
    egpAmount: input.egpAmount,
    toAmount: input.toAmount,
    minimumPaymentSnapshot: input.minimumPaymentSnapshot,
    source: toAccountSnapshot(input.source),
    destination: input.destination ? toAccountSnapshot(input.destination) : undefined,
  };
}

function assertOwnership(transaction: Transaction): void {
  if (transaction.commitment_payment_id) throw new TransactionOwnershipError();
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
    const now = new Date().toISOString();
    const source = requireAccount(await loadAccount(db, data.account_id), 'source');
    const destination = await loadAccount(db, data.to_account_id);
    requireSelectableAccount(source, 'source');
    if (destination) requireSelectableAccount(destination, 'destination');

    const toAmount = data.to_amount ?? null;
    const exchangeRate = data.exchange_rate ?? null;
    validateNormalizedInput({
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      egpAmount: data.egp_amount,
      toAmount,
      exchangeRate,
      source,
      destination,
    });

    const reportingClass = resolveReportingClass(data.type, source.type);
    const transactionDate = data.transaction_date ?? now.slice(0, 10);
    const assignment = await resolveCategoryAndBudget(db, {
      reportingClass,
      categoryId: data.category_id,
      transactionDate,
      budgetId: data.budget_id,
    });
    const minimumPaymentSnapshot =
      data.type === TransactionType.CCPayment
        ? requireAccount(destination, 'destination').minimum_payment
        : null;
    const policyCommand = toPolicyCommand({
      type: data.type,
      amount: data.amount,
      egpAmount: data.egp_amount,
      toAmount,
      minimumPaymentSnapshot,
      source,
      destination,
    });
    const deltas = resolvePolicyDeltas(() => resolveCreateDeltas(policyCommand));

    const transaction: Transaction = {
      id: String(uuid.v4()),
      type: data.type,
      amount: data.amount,
      currency: data.currency,
      egp_amount: data.egp_amount,
      exchange_rate: exchangeRate,
      to_amount: toAmount,
      minimum_payment_snapshot: minimumPaymentSnapshot,
      account_id: source.id,
      to_account_id: destination?.id ?? null,
      category_id: assignment.categoryId,
      budget_id: assignment.budgetId,
      note: data.note ?? null,
      transaction_date: transactionDate,
      transaction_time: data.transaction_time ?? now.slice(11, 19),
      commitment_payment_id: null,
      installment_id: null,
      created_at: now,
      updated_at: now,
    };

    await db.withTransactionAsync(async () => {
      if ((await insertTransactionRow(db, transaction)) !== 1) {
        throw new TransactionValidationError('Transaction was not inserted');
      }
      for (const delta of deltas) await applyAccountDelta(db, delta, now);
    });
    return transaction;
  }

  async delete(id: string): Promise<void> {
    const db = await getDb();
    const existing = await getTransactionById(db, id);
    if (!existing) throw new TransactionNotFoundError();
    assertOwnership(existing);

    const source = requireAccount(await loadAccount(db, existing.account_id), 'source');
    const destination = await loadAccount(db, existing.to_account_id);
    const command = toPolicyCommand({
      type: existing.type,
      amount: existing.amount,
      egpAmount: existing.egp_amount,
      toAmount: existing.to_amount,
      minimumPaymentSnapshot: existing.minimum_payment_snapshot,
      source,
      destination,
    });
    const deltas = resolveDeleteDeltas(command);
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      if ((await deleteTransactionRow(db, id)) !== 1) throw new TransactionNotFoundError();
      for (const delta of deltas) await applyAccountDelta(db, delta, now);
    });
  }

  async update(id: string, data: UpdateTransactionInput): Promise<void> {
    const db = await getDb();
    const existing = await getTransactionById(db, id);
    if (!existing) throw new TransactionNotFoundError();
    assertOwnership(existing);

    const source = requireAccount(await loadAccount(db, existing.account_id), 'source');
    const destination = await loadAccount(db, existing.to_account_id);
    const toAmount = data.to_amount ?? null;
    const exchangeRate = data.exchange_rate ?? null;
    validateNormalizedInput({
      type: existing.type,
      amount: data.amount,
      currency: data.currency,
      egpAmount: data.egp_amount,
      toAmount,
      exchangeRate,
      source,
      destination,
    });

    const reportingClass = resolveReportingClass(existing.type, source.type);
    const assignment = await resolveCategoryAndBudget(db, {
      reportingClass,
      categoryId: data.category_id === undefined ? existing.category_id : data.category_id,
      transactionDate: data.transaction_date,
      budgetId: data.budget_id === undefined ? existing.budget_id : data.budget_id,
    });
    const minimumPaymentSnapshot =
      existing.type === TransactionType.CCPayment
        ? requireAccount(destination, 'destination').minimum_payment
        : null;
    const oldCommand = toPolicyCommand({
      type: existing.type,
      amount: existing.amount,
      egpAmount: existing.egp_amount,
      toAmount: existing.to_amount,
      minimumPaymentSnapshot: existing.minimum_payment_snapshot,
      source,
      destination,
    });
    const newCommand = toPolicyCommand({
      type: existing.type,
      amount: data.amount,
      egpAmount: data.egp_amount,
      toAmount,
      minimumPaymentSnapshot,
      source,
      destination,
    });
    const deltas = resolvePolicyDeltas(() => resolveUpdateDeltas(oldCommand, newCommand));
    const now = new Date().toISOString();

    await db.withTransactionAsync(async () => {
      const changes = await updateTransactionRow(
        db,
        id,
        { ...data, budget_id: assignment.budgetId, category_id: assignment.categoryId },
        minimumPaymentSnapshot,
        now,
      );
      if (changes !== 1) throw new TransactionNotFoundError();
      for (const delta of deltas) await applyAccountDelta(db, delta, now);
    });
  }
}
