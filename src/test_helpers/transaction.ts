import {
  AccountType,
  BudgetGroup,
  CategoryType,
  Currency,
  TransactionType,
} from '@/constants/enums';
import { CoreTokens } from '@/constants/theme_tokens';
import type { Account } from '@/modules/accounts/entities/account.entity';
import type { Budget } from '@/modules/budget/entities/budget.entity';
import type { Category } from '@/modules/categories/entities/category.entity';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';

const TEST_TIMESTAMP = '2026-07-22T12:00:00.000Z';

export function makeTestAccount(overrides: Partial<Account> = {}): Account {
  return {
    id: 'account-1',
    name: 'Cash',
    type: AccountType.PhysicalWallet,
    currency: Currency.EGP,
    opening_balance: 0,
    current_balance: 0,
    color: null,
    credit_limit: null,
    revolving_balance: null,
    minimum_payment: null,
    statement_due_day: null,
    interest_tracking: 0,
    apr: null,
    is_archived: 0,
    balance_review_required: 0,
    sort_order: 0,
    created_at: TEST_TIMESTAMP,
    updated_at: TEST_TIMESTAMP,
    ...overrides,
  };
}

export function makeTestCategory(overrides: Partial<Category> = {}): Category {
  return {
    id: 'category-1',
    name: 'Food',
    type: CategoryType.Expense,
    icon: 'food',
    color: CoreTokens.text1,
    is_default: 0,
    sort_order: 0,
    budget_group: BudgetGroup.Need,
    created_at: TEST_TIMESTAMP,
    updated_at: TEST_TIMESTAMP,
    ...overrides,
  };
}

export function makeTestBudget(overrides: Partial<Budget> = {}): Budget {
  return {
    id: 'budget-1',
    category_id: 'category-1',
    name: 'Monthly food',
    limit_amount: 500,
    effective_from: '2026-07',
    created_at: TEST_TIMESTAMP,
    updated_at: TEST_TIMESTAMP,
    ...overrides,
  };
}

export function makeTestTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'transaction-1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: 'account-1',
    to_account_id: null,
    category_id: 'category-1',
    budget_id: null,
    note: null,
    transaction_date: '2026-07-22',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: TEST_TIMESTAMP,
    updated_at: TEST_TIMESTAMP,
    ...overrides,
  };
}

type TransactionStoreState = ReturnType<typeof useTransactionStore.getState>;
type AddTransaction = TransactionStoreState['addTransaction'];
type UpdateTransaction = TransactionStoreState['updateTransaction'];

export function installMockAddTransaction(
  implementation?: AddTransaction,
): jest.MockedFunction<AddTransaction> {
  const mock = jest.fn<ReturnType<AddTransaction>, Parameters<AddTransaction>>(implementation);
  useTransactionStore.setState({ addTransaction: mock });
  return mock;
}

export function installMockUpdateTransaction(
  implementation?: UpdateTransaction,
): jest.MockedFunction<UpdateTransaction> {
  const mock = jest.fn<ReturnType<UpdateTransaction>, Parameters<UpdateTransaction>>(
    implementation,
  );
  useTransactionStore.setState({ updateTransaction: mock });
  return mock;
}
