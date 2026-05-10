import { renderHook } from '@testing-library/react-native';

import { useAccountStore } from '@/store/account.store';
import { useCategoryStore } from '@/store/category.store';
import { useFilterDrawerStore } from '@/screens/transactions/filter/filter.store';
import { useFilterDrawerState } from '@/screens/transactions/filter/filter.state';
import { useFilterDrawer } from '@/screens/transactions/filter/filter.hook';

jest.mock('zustand/react/shallow', () => ({ useShallow: (sel: any) => sel }));
jest.mock('@/store/account.store', () => ({ useAccountStore: jest.fn() }));
jest.mock('@/store/category.store', () => ({ useCategoryStore: jest.fn() }));
jest.mock('@/screens/transactions/filter/filter.store', () => ({
  useFilterDrawerStore: jest.fn(),
  EMPTY_FILTERS: { accountIds: [], categoryIds: [], datePreset: 'allTime', amountCurrency: 'EGP' },
}));
jest.mock('@/screens/transactions/filter/filter.state', () => ({
  useFilterDrawerState: jest.fn(),
}));
jest.mock('@/screens/transactions/filter/filter.helpers', () => ({
  countActiveFilters: jest.fn(() => 0),
  formatSelectionSummary: jest.fn(() => ''),
}));
jest.mock('@/screens/transactions/transactions.store', () => ({
  useTransactionsScreenStore: jest.fn((sel: any) =>
    sel({
      state: {
        appliedFilters: {
          accountIds: [],
          categoryIds: [],
          datePreset: 'allTime',
          amountCurrency: 'EGP',
        },
      },
      setAppliedFilters: jest.fn(),
    }),
  ),
}));

function setup() {
  (useAccountStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { accounts: [] } }),
  );
  (useCategoryStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({ state: { categories: [] } }),
  );
  (useFilterDrawerStore as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: {
        draft: {
          accountIds: [],
          categoryIds: [],
          datePreset: 'allTime',
          amountCurrency: 'EGP',
          amountMin: undefined,
          amountMax: undefined,
          customDateFrom: undefined,
          customDateTo: undefined,
        },
      },
      resetDraft: jest.fn(),
      toggleAccountId: jest.fn(),
      toggleCategoryId: jest.fn(),
      setDatePreset: jest.fn(),
      setCustomDateRange: jest.fn(),
      setAmountMin: jest.fn(),
      setAmountMax: jest.fn(),
      setAmountCurrency: jest.fn(),
    }),
  );
  (useFilterDrawerState as unknown as jest.Mock).mockImplementation((sel: any) =>
    sel({
      state: {
        visible: false,
        accountPickerVisible: false,
        categoryPickerVisible: false,
        customDatePickerVisible: false,
      },
      close: jest.fn(),
      closeUi: jest.fn(),
      setAccountPickerVisible: jest.fn(),
      setCategoryPickerVisible: jest.fn(),
      setCustomDatePickerVisible: jest.fn(),
    }),
  );
}

describe('useFilterDrawer', () => {
  beforeEach(setup);

  it('renders without throwing', () => {
    expect(() => renderHook(() => useFilterDrawer())).not.toThrow();
  });

  it('draftActiveCount defaults to 0', () => {
    const { result } = renderHook(() => useFilterDrawer());
    expect(result.current.state.draftActiveCount).toBe(0);
  });
});
