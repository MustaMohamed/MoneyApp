import { AccountType, Currency } from '@/constants/enums';
import type { Account } from '@/database/entities/account.entity';
import type { IAccountRepository, NewAccountInput } from '@/repositories/account.repository';
import { AccountStore } from '@/store/account.store';

const mockAccount: Account = {
  id: 'test-id',
  name: 'CIB Savings',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 5000,
  current_balance: 5000,
  color: '#1B2B4B',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  is_archived: 0,
  sort_order: 0,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
};

const baseInput: NewAccountInput = {
  name: 'CIB Savings',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 5000,
  color: '#1B2B4B',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  sort_order: 0,
};

function makeRepo(overrides: Partial<IAccountRepository> = {}): IAccountRepository {
  return {
    getAll: jest.fn().mockResolvedValue([]),
    add: jest.fn().mockResolvedValue(mockAccount),
    update: jest.fn().mockResolvedValue(undefined),
    archive: jest.fn().mockResolvedValue(undefined),
    adjustBalance: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('accountStore.loadAccounts', () => {
  it('starts with unresolved account data', () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);

    expect(store.state.accounts.value).toBeUndefined();
  });

  it('calls repo.getAll and sets accounts in state', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = new AccountStore(repo);
    await store.loadAccounts();
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.state.accounts.value).toEqual([mockAccount]);
  });

  it('propagates errors thrown by repo.getAll', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockRejectedValue(new Error('db error')) });
    const store = new AccountStore(repo);
    await expect(store.loadAccounts()).rejects.toThrow('db error');
  });
});

describe('accountStore.addAccount', () => {
  it('delegates to repo.add with the provided input', async () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);
    const result = await store.addAccount(baseInput);
    expect(repo.add).toHaveBeenCalledWith(baseInput);
    expect(result).toEqual(mockAccount);
  });

  it('reloads accounts state after adding', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = new AccountStore(repo);
    await store.addAccount(baseInput);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.state.accounts.value).toEqual([mockAccount]);
  });

  it('propagates errors thrown by repo.add', async () => {
    const repo = makeRepo({ add: jest.fn().mockRejectedValue(new Error('insert failed')) });
    const store = new AccountStore(repo);
    await expect(store.addAccount(baseInput)).rejects.toThrow('insert failed');
  });
});

describe('accountStore.updateAccount', () => {
  it('delegates to repo.update with id and data', async () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);
    await store.updateAccount('test-id', { name: 'New Name', color: '#C9973A' });
    expect(repo.update).toHaveBeenCalledWith('test-id', { name: 'New Name', color: '#C9973A' });
  });

  it('reloads accounts after updating', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = new AccountStore(repo);
    await store.updateAccount('test-id', { name: 'New Name', color: null });
    expect(repo.getAll).toHaveBeenCalledTimes(1);
    expect(store.state.accounts.value).toEqual([mockAccount]);
  });

  it('propagates errors from repo.update', async () => {
    const repo = makeRepo({ update: jest.fn().mockRejectedValue(new Error('update failed')) });
    const store = new AccountStore(repo);
    await expect(store.updateAccount('test-id', { name: 'x', color: null })).rejects.toThrow(
      'update failed',
    );
  });
});

describe('accountStore.archiveAccount', () => {
  it('delegates to repo.archive with the account id', async () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);
    await store.archiveAccount('test-id');
    expect(repo.archive).toHaveBeenCalledWith('test-id');
  });

  it('reloads accounts after archiving', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([]) });
    const store = new AccountStore(repo);
    await store.archiveAccount('test-id');
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from repo.archive', async () => {
    const repo = makeRepo({ archive: jest.fn().mockRejectedValue(new Error('archive failed')) });
    const store = new AccountStore(repo);
    await expect(store.archiveAccount('test-id')).rejects.toThrow('archive failed');
  });
});

describe('accountStore.adjustBalance', () => {
  it('delegates to repo.adjustBalance with id and balance', async () => {
    const repo = makeRepo();
    const store = new AccountStore(repo);
    await store.adjustBalance('test-id', 9999);
    expect(repo.adjustBalance).toHaveBeenCalledWith('test-id', 9999);
  });

  it('reloads accounts after adjusting', async () => {
    const repo = makeRepo({ getAll: jest.fn().mockResolvedValue([mockAccount]) });
    const store = new AccountStore(repo);
    await store.adjustBalance('test-id', 9999);
    expect(repo.getAll).toHaveBeenCalledTimes(1);
  });

  it('propagates errors from repo.adjustBalance', async () => {
    const repo = makeRepo({
      adjustBalance: jest.fn().mockRejectedValue(new Error('db error')),
    });
    const store = new AccountStore(repo);
    await expect(store.adjustBalance('test-id', 0)).rejects.toThrow('db error');
  });
});

describe('accountStore.reset', () => {
  it('restores unresolved account data', async () => {
    const repo = makeRepo({
      getAll: jest.fn().mockResolvedValue([{ ...mockAccount, id: 'a1' }]),
    });
    const store = new AccountStore(repo);
    await store.loadAccounts();
    expect(store.state.accounts.value).toHaveLength(1);

    store.reset();

    expect(store.state.accounts.value).toBeUndefined();
  });
});
