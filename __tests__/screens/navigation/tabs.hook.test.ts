import { act, renderHook } from '@testing-library/react-native';

const mockPush = jest.fn();

jest.mock('expo-router', () => ({
  usePathname: () => '/dashboard',
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }),
}));

jest.mock('@/components/ui/fab_visibility', () => ({
  shouldHideGlobalFab: () => false,
}));

jest.mock('@/store/sheet_visibility.store', () => ({
  useAnySheetOpen: () => false,
}));

import { useTabsLayout } from '@/modules/navigation/screens/tabs/tabs.hook';
import { useTransactionFormHostState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';

describe('useTabsLayout', () => {
  beforeEach(() => {
    mockPush.mockClear();
    useTransactionFormHostState.getState().reset();
  });

  it('opens Add globally without navigating away from the current tab', () => {
    const { result } = renderHook(() => useTabsLayout());

    act(() => result.current.handleAddTransaction());

    expect(mockPush).not.toHaveBeenCalled();
    expect(useTransactionFormHostState.getState()).toMatchObject({
      mode: 'add',
      phase: 'preparing',
    });
    expect(result.current.state.fabHidden).toBe(true);
  });
});
