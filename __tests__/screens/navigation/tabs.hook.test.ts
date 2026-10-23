import { act, renderHook } from '@testing-library/react-native';

const mockPush = jest.fn();
const mockFocusEffect = jest.fn<void, [() => void | (() => void)]>();
let mockPathname = '/dashboard';
let mockAnySheetOpen = false;

jest.mock('expo-router', () => ({
  useFocusEffect: (effect: () => void | (() => void)) => mockFocusEffect(effect),
  usePathname: () => mockPathname,
  useRouter: () => ({ push: mockPush }),
}));

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 12, left: 0 }),
}));

jest.mock('@/components/ui/sheet_visibility.state', () => ({
  useAnySheetOpen: () => mockAnySheetOpen,
}));

import { useToastClearanceState } from '@/components/ui/toast_clearance.state';
import { Size, Spacing } from '@/constants/theme';
import { useCommitmentFormHostState } from '@/modules/commitments/store/commitment_form_host.state';
import { useTabsLayout } from '@/modules/navigation/screens/tabs/tabs.hook';
import { useTransactionFormState } from '@/modules/transactions/store/transaction_form_host.state';

const FAB_BOTTOM_OFFSET = 12 + Size.tabBarHeight + Spacing.md;
const SHOWN_CLEARANCE = FAB_BOTTOM_OFFSET + Size.fab + Spacing.md;
const HIDDEN_CLEARANCE = FAB_BOTTOM_OFFSET;

describe('useTabsLayout', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockFocusEffect.mockClear();
    mockPathname = '/dashboard';
    mockAnySheetOpen = false;
    useTransactionFormState.getState().reset();
    useCommitmentFormHostState.getState().reset();
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

  it('opens the add commitment sheet over the current tab without a push, hiding the + button', async () => {
    const { result } = await renderHook(() => useTabsLayout());

    await act(() => result.current.handleAddCommitment());

    expect(mockPush).not.toHaveBeenCalled();
    expect(useCommitmentFormHostState.getState().phase).toBe('open');
    expect(result.current.state.fabHidden).toBe(true);
  });

  it('hides the + button while the edit commitment sheet is open over the current tab', async () => {
    const { result } = await renderHook(() => useTabsLayout());

    await act(() => useCommitmentFormHostState.getState().openEdit('c-1'));

    expect(mockPush).not.toHaveBeenCalled();
    expect(useCommitmentFormHostState.getState().phase).toBe('open');
    expect(result.current.state.fabHidden).toBe(true);
  });

  it('keeps the + button hidden while the commitment sheet closes', async () => {
    const { result } = await renderHook(() => useTabsLayout());

    await act(() => {
      useCommitmentFormHostState.getState().openAdd();
      useCommitmentFormHostState.getState().requestClose();
    });

    expect(useCommitmentFormHostState.getState().phase).toBe('closing');
    expect(result.current.state.fabHidden).toBe(true);
  });

  it('offsets the + button from the tab layout geometry', async () => {
    const { result } = await renderHook(() => useTabsLayout());

    expect(result.current.state.fabBottomOffset).toBe(FAB_BOTTOM_OFFSET);
  });

  it('holds the toast clearance while the tabs are focused and drops it on blur', async () => {
    await renderHook(() => useTabsLayout());

    const release = runLatestFocusEffect();
    expect(useToastClearanceState.getState().bottomClearance).toBe(SHOWN_CLEARANCE);

    if (typeof release !== 'function') throw new Error('the focus effect returned no cleanup');
    release();
    expect(useToastClearanceState.getState().bottomClearance).toBeUndefined();
  });

  it('holds the lower clearance on a path that hides the + button', async () => {
    mockPathname = '/transactions/detail/tx-1';
    await renderHook(() => useTabsLayout());

    runLatestFocusEffect();
    expect(useToastClearanceState.getState().bottomClearance).toBe(HIDDEN_CLEARANCE);
  });

  it('keeps the path figure while a sheet is open, on /dashboard and on the detail path', async () => {
    mockAnySheetOpen = true;
    const { rerender } = await renderHook(() => useTabsLayout());

    runLatestFocusEffect();
    expect(useToastClearanceState.getState().bottomClearance).toBe(SHOWN_CLEARANCE);

    mockPathname = '/transactions/detail/tx-1';
    await rerender({});
    runLatestFocusEffect();
    expect(useToastClearanceState.getState().bottomClearance).toBe(HIDDEN_CLEARANCE);
  });
});
