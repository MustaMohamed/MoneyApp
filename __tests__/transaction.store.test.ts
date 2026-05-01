import { Currency, TransactionType } from '@/constants/enums';
import { createTransactionStore } from '@/store/transaction.store';
import type { Transaction } from '@/database/entities/transaction.entity';
import type {
  ITransactionRepository,
  NewTransactionInput,
} from '@/repositories/transaction.repository';

const NOW = '2026-05-01T12:00:00.000Z';

function makeTransaction(overrides: Partial<Transaction> = {}): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 100,
    currency: Currency.EGP,
    egp_amount: 100,
    exchange_rate: null,
    account_id: 'acc-1',
    to_account_id: null,
    category_id: 'cat_food',
    note: null,
    transaction_date: '2026-05-01',
    transaction_time: '10:00:00',
    created_at: NOW,
    updated_at: NOW,
    ...overrides,
  };
}

function makeRepo(transactions: Transaction[] = []): ITransactionRepository {
  const store = [...transactions];
  return {
    getAll: jest.fn(async () => [...store]),
    getByAccount: jest.fn(async () => []),
    getById: jest.fn(async (id) => store.find((t) => t.id === id) ?? null),
    add: jest.fn(async (data: NewTransactionInput) => {
      const tx = makeTransaction({ id: 'tx-new', ...data });
      store.push(tx);
      return tx;
    }),
    delete: jest.fn(async (id: string) => {
      const idx = store.findIndex((t) => t.id === id);
      if (idx !== -1) store.splice(idx, 1);
    }),
  };
}

describe('transactionStore.loadTransactions', () => {
  it('populates transactions from repo', async () => {
    const repo = makeRepo([makeTransaction()]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().loadTransactions();
    expect(useStore.getState().transactions).toHaveLength(1);
  });

  it('throws and re-throws on repo error', async () => {
    const repo = makeRepo();
    repo.getAll = jest.fn().mockRejectedValue(new Error('db down'));
    const useStore = createTransactionStore(repo);
    await expect(useStore.getState().loadTransactions()).rejects.toThrow('db down');
  });
});

describe('transactionStore.addTransaction', () => {
  it('adds and reloads transactions', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);

    const input: NewTransactionInput = {
      type: TransactionType.Expense,
      amount: 50,
      currency: Currency.EGP,
      egp_amount: 50,
      account_id: 'acc-1',
      category_id: 'cat_food',
    };

    const tx = await useStore.getState().addTransaction(input);
    expect(tx.id).toBe('tx-new');
    expect(useStore.getState().transactions).toHaveLength(1);
  });

  it('returns the created transaction', async () => {
    const repo = makeRepo();
    const useStore = createTransactionStore(repo);
    const tx = await useStore.getState().addTransaction({
      type: TransactionType.Income,
      amount: 1000,
      currency: Currency.EGP,
      egp_amount: 1000,
      account_id: 'acc-1',
      category_id: 'cat_salary',
    });
    expect(tx.type).toBe(TransactionType.Income);
    expect(tx.amount).toBe(1000);
  });
});

describe('transactionStore.deleteTransaction', () => {
  it('removes transaction and reloads', async () => {
    const repo = makeRepo([makeTransaction({ id: 'tx-del' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().loadTransactions();
    expect(useStore.getState().transactions).toHaveLength(1);

    await useStore.getState().deleteTransaction('tx-del');
    expect(useStore.getState().transactions).toHaveLength(0);
  });

  it('calls repo.delete with the correct id', async () => {
    const repo = makeRepo([makeTransaction({ id: 'tx-x' })]);
    const useStore = createTransactionStore(repo);
    await useStore.getState().loadTransactions();
    await useStore.getState().deleteTransaction('tx-x');
    expect(repo.delete).toHaveBeenCalledWith('tx-x');
  });
});
