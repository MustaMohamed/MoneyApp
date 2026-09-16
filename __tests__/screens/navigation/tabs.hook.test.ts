import { act, renderHook } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockFocusEffect = jest.fn<void, [() => void | (() => void)]>();

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => mockFocusEffect(effect),
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

import { useToastClearanceState } from '@/components/ui/toast_clearance.state';
import { resolveTabsGeometry } from '@/modules/navigation/screens/tabs/tabs.helpers';
import { useTabsLayout } from '@/modules/navigation/screens/tabs/tabs.hook';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';

describe('useTabsLayout', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFocusEffect.mockClear();
    useTransactionFormState.getState().reset();
    useToastClearanceState.getState().reset();
  });

  function runLatestFocusEffect(): void | (() => void) {
    const effect = mockFocusEffect.mock.calls.at(-1)?.[0];
    if (effect === undefined) throw new Error('useFocusEffect was never called');
    return effect();
  }

  it('opens Add globally without navigating away from the current tab', async () => {
    const { result } = await renderHook(() => useTabsLayout());

    await act(() => result.current.handleAddTransaction());

    expect(mockPush).not.toHaveBeenCalled();
    expect(useTransactionFormState.getState()).toMatchObject({
      mode: 'add',
      phase: 'open',
    });
    expect(result.current.state.fabHidden).toBe(true);
  });

  it('offsets the + button from the tab layout geometry', async () => {
    const { result } = await renderHook(() => useTabsLayout());

    expect(result.current.state.fabBottomOffset).toBe(resolveTabsGeometry(12).fabBottomOffset);
  });

  it('holds the toast clearance while the tabs are focused and drops it on blur', async () => {
    await renderHook(() => useTabsLayout());

    const release = runLatestFocusEffect();
    expect(useToastClearanceState.getState().bottomClearance).toBe(
      resolveTabsGeometry(12).toastClearance,
    );

    if (typeof release !== 'function') throw new Error('the focus effect returned no cleanup');
    release();
    expect(useToastClearanceState.getState().bottomClearance).toBeUndefined();
  });
});
