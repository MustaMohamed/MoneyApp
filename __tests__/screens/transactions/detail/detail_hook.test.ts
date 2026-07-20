import { act, renderHook } from '@testing-library/react-native';
import { router } from 'expo-router';
import { Alert } from 'react-native';

import { Currency, TransactionType } from '@/constants/enums';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { commitmentRepository } from '@/modules/commitments/repositories/commitment.repository';
import { useCommitmentStore } from '@/modules/commitments/store/commitment.store';
import { useTransactionDetail } from '@/modules/transactions/screens/transactions/detail/detail.hook';
import { useTxDetailState } from '@/modules/transactions/screens/transactions/detail/detail.state';
import { useTxDetailStore } from '@/modules/transactions/screens/transactions/detail/detail.store';
import { useTransactionStore } from '@/modules/transactions/store/transaction.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('zustand/react/shallow', () => ({ useShallow: (selector: unknown) => selector }));
jest.mock('expo-router', () => ({ router: { back: jest.fn(), push: jest.fn() } }));
jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/modules/categories/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/modules/commitments/store/commitment.store', () => ({
  useCommitmentStore: jest.fn(),
}));
jest.mock('@/modules/transactions/store/transaction.store', () => ({
  useTransactionStore: jest.fn(),
}));
jest.mock('@/modules/transactions/screens/transactions/detail/detail.state', () => ({
  useTxDetailState: jest.fn(),
}));
jest.mock('@/modules/transactions/screens/transactions/detail/detail.store', () => ({
  useTxDetailStore: jest.fn(),
}));
jest.mock('@/modules/commitments/repositories/commitment.repository', () => ({
  commitmentRepository: { getPaymentById: jest.fn() },
}));

const linkedTransaction = {
  id: 'transaction-1',
  type: TransactionType.Expense,
  amount: 200,
  currency: Currency.EGP,
  egp_amount: 200,
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  revolving_balance_delta: null,
  account_id: 'account-1',
  to_account_id: null,
  category_id: 'category-1',
  budget_id: null,
  note: null,
  transaction_date: '2026-04-18',
  transaction_time: '10:00:00',
  commitment_payment_id: 'payment-1',
  installment_id: null,
  created_at: 'now',
  updated_at: 'now',
};

const loadCommitments = jest.fn().mockResolvedValue(undefined);
const setSelectedMonth = jest.fn().mockResolvedValue(undefined);

beforeEach(() => {
  jest.clearAllMocks();
  jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());

  attachMockSelectorStore(useTxDetailStore as unknown as jest.Mock, () => ({
    tx: linkedTransaction,
    setTx: jest.fn(),
    reset: jest.fn(),
  }));
  attachMockSelectorStore(useTxDetailState as unknown as jest.Mock, () => ({
    confirmVisible: false,
    deleting: false,
    reloadKey: 0,
    setConfirmVisible: jest.fn(),
    setDeleting: jest.fn(),
    bumpReload: jest.fn(),
    reset: jest.fn(),
  }));
  attachMockSelectorStore(useTransactionStore as unknown as jest.Mock, () => ({
    getById: jest.fn().mockResolvedValue(linkedTransaction),
    deleteTransaction: jest.fn(),
  }));
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: [],
    accountLookup: [],
    loadAccountLookup: jest.fn().mockResolvedValue(undefined),
  }));
  attachMockSelectorStore(useCategoryStore as unknown as jest.Mock, () => ({ categories: [] }));
  attachMockSelectorStore(useCommitmentStore as unknown as jest.Mock, () => ({
    loadCommitments,
    setSelectedMonth,
  }));
});

describe('useTransactionDetail commitment navigation', () => {
  it('loads the linked payment month before navigating', async () => {
    (commitmentRepository.getPaymentById as jest.Mock).mockResolvedValue({
      id: 'payment-1',
      due_date: '2026-04-18',
    });
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));

    await act(async () => result.current.openCommitment());

    expect(commitmentRepository.getPaymentById).toHaveBeenCalledWith('payment-1');
    expect(loadCommitments).toHaveBeenCalledTimes(1);
    expect(setSelectedMonth).toHaveBeenCalledWith('2026-04');
    expect(router.push).toHaveBeenCalledWith('/commitments/payment-1');
  });

  it('does not navigate when the linked payment no longer exists', async () => {
    (commitmentRepository.getPaymentById as jest.Mock).mockResolvedValue(undefined);
    const { result } = renderHook(() => useTransactionDetail(linkedTransaction.id));

    await act(async () => result.current.openCommitment());

    expect(loadCommitments).not.toHaveBeenCalled();
    expect(setSelectedMonth).not.toHaveBeenCalled();
    expect(router.push).not.toHaveBeenCalled();
    expect(Alert.alert).toHaveBeenCalled();
  });
});
