import { act, renderHook, waitFor } from '@testing-library/react-native';
import { createElement, StrictMode, type PropsWithChildren } from 'react';

import { AccountType, Currency, TransactionType } from '@/constants/enums';
import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import type { Transaction } from '@/modules/transactions/entities/transaction.entity';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { useTransactionFormPrerequisites } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_prerequisites.hook';

const account: Account = {
  id: 'account-1',
  name: 'Cash',
  type: AccountType.PhysicalWallet,
  currency: Currency.EGP,
  opening_balance: 0,
  current_balance: 1000,
  color: '#fff',
  credit_limit: null,
  revolving_balance: null,
  minimum_payment: null,
  statement_due_day: null,
  interest_tracking: 0,
  apr: null,
  balance_review_required: 0,
  is_archived: 0,
  sort_order: 0,
  created_at: 'now',
  updated_at: 'now',
};

function createTransaction(accountId = account.id): Transaction {
  return {
    id: 'tx-1',
    type: TransactionType.Expense,
    amount: 125,
    currency: Currency.EGP,
    egp_amount: 125,
    exchange_rate: null,
    to_amount: null,
    minimum_payment_snapshot: null,
    revolving_balance_delta: null,
    account_id: accountId,
    to_account_id: null,
    category_id: 'category-1',
    budget_id: null,
    note: null,
    transaction_date: '2026-07-21',
    transaction_time: '12:00:00',
    commitment_payment_id: null,
    installment_id: null,
    created_at: 'now',
    updated_at: 'now',
  };
}

function StrictModeWrapper({ children }: PropsWithChildren): React.ReactElement {
  return createElement(StrictMode, null, children);
}

describe('useTransactionFormPrerequisites', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    useTransactionFormState.getState().reset();
    useAccountStore.setState({ accounts: [], accountLookup: [], hasLoaded: false });
    useCategoryStore.setState({ categories: [], hasLoaded: false, loadError: false });
  });

  it('runs one owned Add request when Strict Mode replays the effect', async () => {
    const loadAccounts = jest.fn(async () => {
      useAccountStore.setState({ accounts: [account], hasLoaded: true });
    });
    const loadCategories = jest.fn(async () => {
      useCategoryStore.setState({ hasLoaded: true });
    });
    useAccountStore.setState({ loadAccounts });
    useCategoryStore.setState({ loadCategories });
    useTransactionFormState.getState().openAdd();
    const sessionId = useTransactionFormState.getState().sessionId;

    const { result } = renderHook(() => useTransactionFormPrerequisites(sessionId, 'add', null), {
      wrapper: StrictModeWrapper,
    });

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(loadAccounts).toHaveBeenCalledTimes(1);
    expect(loadCategories).toHaveBeenCalledTimes(1);
  });

  it('retries a failed request with a new generation', async () => {
    const loadAccounts = jest
      .fn<Promise<void>, []>()
      .mockRejectedValueOnce(new Error('failed'))
      .mockImplementationOnce(async () => {
        useAccountStore.setState({ accounts: [account], hasLoaded: true });
      });
    const loadCategories = jest.fn(async () => {
      useCategoryStore.setState({ hasLoaded: true });
    });
    useAccountStore.setState({ loadAccounts });
    useCategoryStore.setState({ loadCategories });
    useTransactionFormState.getState().openAdd();
    const sessionId = useTransactionFormState.getState().sessionId;

    const { result } = renderHook(() => useTransactionFormPrerequisites(sessionId, 'add', null));

    await waitFor(() => expect(result.current.status).toBe('error'));
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(loadAccounts).toHaveBeenCalledTimes(2);
  });

  it('ignores completion from a replaced session', async () => {
    let resolveAccounts: () => void = () => {};
    const loadAccounts = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveAccounts = () => {
            useAccountStore.setState({ accounts: [account], hasLoaded: true });
            resolve();
          };
        }),
    );
    useAccountStore.setState({ loadAccounts });
    useCategoryStore.setState({ hasLoaded: true });
    useTransactionFormState.getState().openAdd();
    const firstSessionId = useTransactionFormState.getState().sessionId;

    renderHook(() => useTransactionFormPrerequisites(firstSessionId, 'add', null));
    await waitFor(() => expect(loadAccounts).toHaveBeenCalledTimes(1));

    act(() => useTransactionFormState.getState().openEdit(createTransaction()));
    act(resolveAccounts);
    await act(async () => Promise.resolve());

    expect(useTransactionFormState.getState()).toMatchObject({
      mode: 'edit',
      prerequisiteStatus: 'idle',
    });
  });

  it('hydrates an archived account required by Edit', async () => {
    const archived = { ...account, id: 'archived-account', is_archived: 1 as const };
    const loadAccountLookup = jest.fn(async () => {
      useAccountStore.setState({ accountLookup: [archived] });
    });
    useAccountStore.setState({ hasLoaded: true, loadAccountLookup });
    useCategoryStore.setState({ hasLoaded: true });
    const tx = createTransaction(archived.id);
    useTransactionFormState.getState().openEdit(tx);
    const sessionId = useTransactionFormState.getState().sessionId;

    const { result } = renderHook(() => useTransactionFormPrerequisites(sessionId, 'edit', tx));

    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(loadAccountLookup).toHaveBeenCalledWith([archived.id]);
  });
});
