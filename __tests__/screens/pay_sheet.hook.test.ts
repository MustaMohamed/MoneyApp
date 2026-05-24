import { renderHook } from '@testing-library/react-native';

import { usePaySheet } from '@/screens/commitments/detail/components/pay_sheet.hook';
import { useAccountStore } from '@/store/account.store';
import { useCommitmentStore } from '@/store/commitment.store';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/commitment.store', () => ({ useCommitmentStore: jest.fn() }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
// §7 cleanup: pay_sheet now reads currency state to thread rate_updated_at
// into the V2 ExchangeRateRow. Without this mock the real currency store
// runs and trips an infinite re-render in the test renderer.
jest.mock('@/store/currency.store', () => ({
  useCurrencyStore: jest.fn((sel: any) =>
    sel({
      state: { rate: 55, isManualOverride: false, rate_updated_at: null },
    }),
  ),
}));
jest.mock('@/repositories/commitment.repository', () => ({
  commitmentRepository: {
    getLastPaidPayment: jest.fn().mockResolvedValue(null),
    getPaymentsByCommitment: jest.fn().mockResolvedValue([]),
  },
}));
jest.mock('@/screens/commitments/detail/components/pay_sheet.state', () => ({
  usePaySheetState: jest.fn((sel: any) =>
    sel({
      state: { visible: false, saving: false, accountPickerVisible: false, rateOverride: false },
      setVisible: jest.fn(),
      setSaving: jest.fn(),
      setAccountPickerVisible: jest.fn(),
      setRateOverride: jest.fn(),
      reset: jest.fn(),
    }),
  ),
}));

function setup() {
  (useCommitmentStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: { commitments: [], payments: [], selectedMonth: '2026-05' },
      markAsPaid: jest.fn().mockResolvedValue(undefined),
      loadPaymentsForMonth: jest.fn().mockResolvedValue(undefined),
    }),
  );
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] }, loadAccounts: jest.fn().mockResolvedValue(undefined) }),
  );
}

describe('usePaySheet', () => {
  beforeEach(setup);

  it('renders without throwing when commitment and payment are undefined', () => {
    expect(() => renderHook(() => usePaySheet(undefined, undefined))).not.toThrow();
  });

  it('saving defaults to false', () => {
    const { result } = renderHook(() => usePaySheet(undefined, undefined));
    expect(result.current.state.saving).toBe(false);
  });
});
