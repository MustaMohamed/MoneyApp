import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useTransactionStore } from '@/store/transaction.store';
import { useCurrencyStore } from '@/store/currency.store';
import { useAddTransaction } from '@/screens/transactions/transaction_form/add_transaction.hook';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/store/transaction.store', () => ({ useTransactionStore: jest.fn() }));
jest.mock('@/store/currency.store', () => ({ useCurrencyStore: jest.fn() }));
jest.mock('@/screens/transactions/transaction_form/add_transaction.store', () => ({
  useAddTransactionStore: jest.fn((sel: any) =>
    sel({
      state: { type: 'expense', amountStr: '0' },
      setType: jest.fn(),
      handleNumpad: jest.fn(),
    }),
  ),
}));
jest.mock('@/screens/transactions/transaction_form/add_transaction.state', () => ({
  useAddTransactionState: jest.fn((sel: any) =>
    sel({
      state: {
        visible: false,
        saving: false,
        showAccountPicker: false,
        showToPicker: false,
        showCategoryPicker: false,
        rateOverride: false,
      },
      setSaving: jest.fn(),
      setShowAccountPicker: jest.fn(),
      setShowToPicker: jest.fn(),
      setShowCategoryPicker: jest.fn(),
      setRateOverride: jest.fn(),
    }),
  ),
}));

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, loadAccounts: jest.fn().mockResolvedValue(undefined) }),
  );
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
  (useTransactionStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ addTransaction: jest.fn().mockResolvedValue(undefined) }),
  );
  (useCurrencyStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { rate: 50, isManualOverride: false } }),
  );
}

describe('useAddTransaction', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    const onClose = jest.fn();
    expect(() => renderHook(() => useAddTransaction(onClose))).not.toThrow();
  });

  it('saving defaults to false', () => {
    const onClose = jest.fn();
    const { result } = renderHook(() => useAddTransaction(onClose));
    expect(result.current.state.saving).toBe(false);
  });
});
