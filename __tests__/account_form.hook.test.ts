import { act, renderHook } from '@testing-library/react-native';

import { Currency } from '@/constants/enums';
import { useAccountFormState } from '@/modules/accounts/components/account_form/account_form.state';
import {
  useAccountForm,
  type UseAccountFormOptions,
} from '@/modules/accounts/components/account_form/use_account_form.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

const mockAddAccount = jest.fn();
let mockAccounts: { id: string; name: string }[] = [];

function setup() {
  mockAccounts = [{ id: 'a1', name: 'Existing' }];
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: mockAccounts,
    addAccount: mockAddAccount,
  }));
}

const SAVE_ERROR = 'Save failed';

function makeOptions(overrides: Partial<UseAccountFormOptions> = {}): UseAccountFormOptions {
  return {
    initialCurrency: Currency.EGP,
    saveErrorMessage: SAVE_ERROR,
    onSaved: jest.fn(),
    ...overrides,
  };
}

async function fillValidDraft(result: { current: ReturnType<typeof useAccountForm> }) {
  await act(() => {
    result.current.form.setValue('name', 'New Account');
    result.current.form.setValue('balance', '100');
  });
}

describe('useAccountForm', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddAccount.mockResolvedValue({ id: 'new' });
    useAccountFormState.getState().reset();
    setup();
  });

  it('a double tap inserts exactly once', async () => {
    const { result } = await renderHook(() => useAccountForm(makeOptions()));
    await fillValidDraft(result);

    await act(async () => {
      await Promise.all([result.current.submit(), result.current.submit()]);
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
  });

  it('a sequential re-tap after success inserts once but re-runs onSaved', async () => {
    const onSaved = jest.fn();
    const { result } = await renderHook(() => useAccountForm(makeOptions({ onSaved })));
    await fillValidDraft(result);

    await act(async () => {
      await result.current.submit();
    });
    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(2);
  });

  it('a rejecting onSaved reports the error, inserts once, and the retry finishes', async () => {
    const onSaved = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);
    const { result } = await renderHook(() => useAccountForm(makeOptions({ onSaved })));
    await fillValidDraft(result);

    await act(async () => {
      await result.current.submit();
    });
    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(result.current.state.errorMessage).toBe(SAVE_ERROR);
    expect(result.current.state.saving).toBe(false);

    await act(async () => {
      await result.current.submit();
    });
    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(2);
    expect(result.current.state.errorMessage).toBeUndefined();
  });

  it('the retry does not re-validate against the row it just inserted', async () => {
    // D9: addAccount republishing mockAccounts reproduces the real store's
    // own loadAccounts() republication (account.store.ts:82-91), which
    // rebuilds the schema from an accounts array that now contains the row
    // this very submit() just wrote. A retry that re-validates against that
    // schema fails errNameDuplicate against its own account and never
    // reaches onSaved — this is the defect D9 exists to close.
    mockAddAccount.mockImplementation(async () => {
      mockAccounts = [...mockAccounts, { id: 'new', name: 'New Account' }];
    });
    const onSaved = jest
      .fn()
      .mockRejectedValueOnce(new Error('boom'))
      .mockResolvedValueOnce(undefined);
    const { result } = await renderHook(() => useAccountForm(makeOptions({ onSaved })));
    await fillValidDraft(result);

    await act(async () => {
      await result.current.submit();
    });
    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(onSaved).toHaveBeenCalledTimes(2);
    expect(result.current.state.errorMessage).toBeUndefined();
  });

  it('a rejecting addAccount reports the error and stays retryable', async () => {
    mockAddAccount.mockRejectedValueOnce(new Error('db down'));
    const { result } = await renderHook(() => useAccountForm(makeOptions()));
    await fillValidDraft(result);

    await act(async () => {
      await result.current.submit();
    });
    expect(result.current.state.errorMessage).toBe(SAVE_ERROR);

    mockAddAccount.mockResolvedValueOnce({ id: 'new' });
    await act(async () => {
      await result.current.submit();
    });
    expect(mockAddAccount).toHaveBeenCalledTimes(2);
  });

  it('a validation failure never enters the guard', async () => {
    const { result } = await renderHook(() => useAccountForm(makeOptions()));
    // draft left blank — name and balance both fail validation.

    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddAccount).not.toHaveBeenCalled();
    expect(result.current.state.saving).toBe(false);
    expect(result.current.state.errorMessage).toBeUndefined();
  });

  it('initialCurrency reaches the draft', async () => {
    const { result } = await renderHook(() =>
      useAccountForm(makeOptions({ initialCurrency: Currency.USD })),
    );
    expect(result.current.form.getValues('currency')).toBe(Currency.USD);
  });

  it('sortOrder is read at submit time, not at mount', async () => {
    const { result } = await renderHook(() => useAccountForm(makeOptions()));
    await fillValidDraft(result);

    mockAccounts = [...mockAccounts, { id: 'a2', name: 'Two' }, { id: 'a3', name: 'Three' }];

    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddAccount).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 3 }));
  });

  it('a fresh mount starts clean even if a previous session had already inserted', async () => {
    useAccountFormState.getState().beginSave();
    useAccountFormState.getState().markInserted();
    useAccountFormState.getState().finishSave();
    expect(useAccountFormState.getState().inserted).toBe(true);

    const { result } = await renderHook(() => useAccountForm(makeOptions()));
    await fillValidDraft(result);

    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
  });
});
