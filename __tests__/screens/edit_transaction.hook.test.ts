import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useEditTransaction } from '@/screens/transactions/transaction_form/edit_transaction.hook';
import type { Transaction } from '@/database/entities/transaction.entity';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/store/transaction.store', () => ({ useTransactionStore: jest.fn() }));
jest.mock('@/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/screens/transactions/transaction_form/edit_transaction.store', () => ({
  useEditTransactionStore: jest.fn((sel: any) =>
    sel({ state: { amountStr: '100' }, handleNumpad: jest.fn() }),
  ),
}));
jest.mock('@/screens/transactions/transaction_form/edit_transaction.state', () => ({
  useEditTransactionState: jest.fn((sel: any) =>
    sel({
      state: { visible: true, saving: false, showCategoryPicker: false, rateOverride: false },
      setSaving: jest.fn(),
      setShowCategoryPicker: jest.fn(),
      setRateOverride: jest.fn(),
    }),
  ),
}));

const mockTx: Transaction = {
  id: 'tx-1',
  type: 'expense' as any,
  amount: 100,
  currency: 'EGP' as any,
  egp_amount: 100,
  account_id: 'acc-1',
  to_account_id: null,
  category_id: 'cat-1',
  note: null,
  transaction_date: '2026-05-01',
  transaction_time: '10:00:00',
  exchange_rate: null,
  to_amount: null,
  minimum_payment_snapshot: null,
  commitment_payment_id: null,
  created_at: '2026-05-01T10:00:00Z',
  updated_at: '2026-05-01T10:00:00Z',
};

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, loadAccounts: jest.fn().mockResolvedValue(undefined) }),
  );
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
  (useTransactionStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ updateTransaction: jest.fn().mockResolvedValue(undefined) }),
  );
  (useCurrencyStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { rate: 50, isManualOverride: false } }),
  );
}

describe('useEditTransaction', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    const onClose = jest.fn();
    expect(() => renderHook(() => useEditTransaction(mockTx, onClose))).not.toThrow();
  });

  it('saving defaults to false', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useEditTransaction(mockTx, onClose));
    expect(result.current.state.saving).toBe(false);
  });
});
