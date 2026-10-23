import { act, renderHook } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useCategoryStore } from '@/modules/categories/store/category.store';
import { useAddTransactionState } from '@/modules/transactions/screens/transactions/transaction_form/add_transaction.state';
import { useTransactionFormHost } from '@/modules/transactions/screens/transactions/transaction_form/transaction_form_host.hook';
import { useTransactionFormState } from '@/modules/transactions/store/transaction_form_host.state';
import { deferred } from '@/test_helpers/deferred';
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

type HostResult = { current: ReturnType<typeof useTransactionFormHost> };

const form = () => useTransactionFormState.getState();

const READY_FOOTER = { visible: true, saving: false, disabled: false };

function makeSubmit() {
  return jest.fn<Promise<void>, []>().mockResolvedValue(undefined);
}

async function openReady(): Promise<number> {
  await act(() => form().openAdd());
  const sessionId = form().sessionId;
  await act(() => form().publishFooter(sessionId, READY_FOOTER));
  return sessionId;
}

async function save(result: HostResult): Promise<void> {
  await act(async () => {
    result.current.handleSave();
  });
}

describe('useTransactionFormHost Save gate', () => {
  let addListenerSpy: jest.SpiedFunction<typeof BackHandler.addEventListener>;

  function pressBack(): boolean | null | undefined {
    const call = addListenerSpy.mock.calls.at(-1);
    if (call === undefined) throw new Error('no hardware back listener was added');
    expect(call[0]).toBe('hardwareBackPress');
    return call[1]({ type: 'hardwareBackPress', timeStamp: 0 });
  }

  beforeEach(() => {
    form().reset();
    useAccountStore.setState({ accounts: [], accountLookupById: {}, hasLoaded: false });
    useCategoryStore.setState({ categories: [], hasLoaded: false });
    addListenerSpy = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation(() => ({ remove: jest.fn() }));
  });

  afterEach(() => {
    addListenerSpy.mockRestore();
  });

  it('runs nothing on a Save while the sheet is closing', async () => {
    const { result } = await renderHook(() => useTransactionFormHost());
    const sessionId = await openReady();
    const submit = makeSubmit();
    await act(() => result.current.registerSubmit(sessionId, submit));
    await save(result);
    expect(submit).toHaveBeenCalledTimes(1);

    await act(() => result.current.handleClose());
    expect(form().phase).toBe('closing');
    await save(result);

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('runs nothing on a Save while the footer reads disabled', async () => {
    const { result } = await renderHook(() => useTransactionFormHost());
    const sessionId = await openReady();
    const submit = makeSubmit();
    await act(() => result.current.registerSubmit(sessionId, submit));
    await save(result);
    expect(submit).toHaveBeenCalledTimes(1);

    await act(() => form().publishFooter(sessionId, { ...READY_FOOTER, disabled: true }));
    await save(result);

    expect(submit).toHaveBeenCalledTimes(1);
  });

  it('runs the submit on the next Save after a rejected one', async () => {
    const { result } = await renderHook(() => useTransactionFormHost());
    const sessionId = await openReady();
    const pending = deferred();
    const submit = jest
      .fn<Promise<void>, []>()
      .mockReturnValueOnce(pending.promise)
      .mockResolvedValue(undefined);
    await act(() => result.current.registerSubmit(sessionId, submit));
    await save(result);
    expect(submit).toHaveBeenCalledTimes(1);

    await act(async () => pending.reject(new Error('save failed')));
    await save(result);

    expect(submit).toHaveBeenCalledTimes(2);
  });

  it('never runs a submit registered under an older session id', async () => {
    const { result } = await renderHook(() => useTransactionFormHost());
    const olderSession = await openReady();
    const stale = makeSubmit();
    await act(() => result.current.registerSubmit(olderSession, stale));
    const sessionId = await openReady();
    expect(sessionId).toBe(olderSession + 1);

    await save(result);

    expect(stale).not.toHaveBeenCalled();

    const current = makeSubmit();
    await act(() => result.current.registerSubmit(sessionId, current));
    await save(result);

    expect(current).toHaveBeenCalledTimes(1);
    expect(stale).not.toHaveBeenCalled();
  });

  it('leaves the sheet open on back and a close request while the add state saves, and reads not dismissable', async () => {
    const { result } = await renderHook(() => useTransactionFormHost());
    await openReady();
    expect(result.current.state.isDismissable).toBe(true);

    await act(() => useAddTransactionState.getState().setSaving(true));

    expect(result.current.state.isDismissable).toBe(false);
    let handled: boolean | null | undefined;
    await act(() => {
      handled = pressBack();
    });
    expect(handled).toBe(true);
    expect(form().phase).toBe('open');
    await act(() => result.current.handleOpenChange(false));
    expect(form().phase).toBe('open');
    await act(() => result.current.handleClose());
    expect(form().phase).toBe('open');

    await act(() => useAddTransactionState.getState().setSaving(false));

    expect(result.current.state.isDismissable).toBe(true);
    await act(() => result.current.handleClose());
    expect(form().phase).toBe('closing');
  });
});
