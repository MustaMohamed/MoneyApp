import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useTransactionFormHost } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.hook';
import { useTransactionFormState } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.state';
import { makeTestTransaction } from '@/test_helpers/transaction';

const mockPush = jest.fn();
const mockToast = { show: jest.fn() };

// The wrapper, not HeroUI, so `show` sees exactly what the hook passed.
jest.mock('@/components/ui/toast', () => ({
  useToast: () => ({ toast: mockToast, isToastVisible: false }),
}));
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const SAVED_TOAST = { label: Strings.transactionSavedToast, variant: 'success' };

describe('useTransactionFormHost saved toast', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockToast.show.mockClear();
    useTransactionFormState.getState().reset();
    useAccountStore.setState({ accounts: [], accountLookupById: {}, hasLoaded: false });
    useCategoryStore.setState({ categories: [], hasLoaded: false });
  });

  it('shows Transaction saved once, after the add sheet has closed', async () => {
    const { result } = await renderHook(() => useTransactionFormHost());
    await act(() => useTransactionFormState.getState().openAdd());
    const sessionId = result.current.state.sessionId;

    await act(() => result.current.handleSaved(sessionId));
    expect(result.current.state.phase).toBe('closing');
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(() => result.current.handleCloseComplete());
    expect(result.current.state.phase).toBe('closed');
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(SAVED_TOAST);

    await act(() => result.current.handleCloseComplete());
    expect(mockToast.show).toHaveBeenCalledTimes(1);
  });

  it('shows Transaction saved once, after the edit sheet has closed, with onEditSaved called once', async () => {
    const onEditSaved = jest.fn();
    const { result } = await renderHook(() => useTransactionFormHost());
    await act(() =>
      useTransactionFormState.getState().openEdit(makeTestTransaction(), onEditSaved),
    );
    const sessionId = result.current.state.sessionId;

    await act(() => result.current.handleSaved(sessionId));
    expect(onEditSaved).toHaveBeenCalledTimes(1);
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(() => result.current.handleCloseComplete());
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(SAVED_TOAST);
    expect(onEditSaved).toHaveBeenCalledTimes(1);
  });

  it('shows nothing for a close without a save, and the toast for the next saved close', async () => {
    const { result } = await renderHook(() => useTransactionFormHost());
    await act(() => useTransactionFormState.getState().openAdd());

    await act(() => result.current.handleClose());
    await act(() => result.current.handleCloseComplete());
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(() => useTransactionFormState.getState().openAdd());
    await act(() => result.current.handleSaved(result.current.state.sessionId));
    await act(() => result.current.handleCloseComplete());
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(SAVED_TOAST);
  });

  it('pushes Add Account with no toast on the account-creation close, and the toast for a saved close', async () => {
    const { result } = await renderHook(() => useTransactionFormHost());
    await act(() => useTransactionFormState.getState().openAdd());

    await act(() => result.current.handleRequestAccountCreation(result.current.state.sessionId));
    await act(() => result.current.handleCloseComplete());
    expect(mockPush).toHaveBeenCalledWith('/accounts/add_account');
    expect(mockToast.show).not.toHaveBeenCalled();

    await act(() => useTransactionFormState.getState().openAdd());
    await act(() => result.current.handleSaved(result.current.state.sessionId));
    await act(() => result.current.handleCloseComplete());
    expect(mockToast.show).toHaveBeenCalledTimes(1);
    expect(mockToast.show).toHaveBeenCalledWith(SAVED_TOAST);
    expect(mockPush).toHaveBeenCalledTimes(1);
  });
});
