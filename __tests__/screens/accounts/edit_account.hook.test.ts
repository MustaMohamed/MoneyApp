import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useEditAccount } from '@/modules/accounts/screens/accounts/edit_account/edit_account.hook';
import { useEditAccountState } from '@/modules/accounts/screens/accounts/edit_account/edit_account.state';
import { useAccountStore, type Account } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

const mockBack = jest.fn();
const mockDismissTo = jest.fn();
const mockRouter = { back: mockBack, dismissTo: mockDismissTo };
let mockParams: { id: string } = { id: 'acc-1' };

jest.mock('zustand/react/shallow', () => ({ useShallow: <T>(sel: T) => sel }));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => mockRouter,
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

const bank = makeTestAccount({
  id: 'acc-1',
  name: 'CIB',
  type: AccountType.Bank,
  currency: Currency.EGP,
  opening_balance: 40000,
  current_balance: 40000,
  color: '#1B2B4B',
});

const card = makeTestAccount({
  id: 'card-1',
  name: 'CIB Visa',
  type: AccountType.CreditCard,
  currency: Currency.EGP,
  color: '#1B2B4B',
  credit_limit: 1500.5,
  minimum_payment: 200,
  statement_due_day: 15,
  interest_tracking: 1,
  apr: 24.5,
  current_balance: 900,
});

const paidDownCard = makeTestAccount({
  id: 'card-2',
  name: 'NBE Mastercard',
  type: AccountType.CreditCard,
  currency: Currency.EGP,
  credit_limit: 20000,
  minimum_payment: 500,
  current_balance: 100,
});

const archived = makeTestAccount({ id: 'arch-1', name: 'Old Savings', is_archived: 1 });

const mockUpdateAccount = jest.fn<Promise<void>, [string, unknown]>();
let accounts: Account[] = [];
let archivedAccounts: Account[] = [];
let loadError = false;

function setup() {
  jest.clearAllMocks();
  mockParams = { id: 'acc-1' };
  accounts = [bank, card, paidDownCard];
  archivedAccounts = [archived];
  loadError = false;
  mockUpdateAccount.mockResolvedValue(undefined);
  useEditAccountState.getState().reset();
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts,
    archivedAccounts,
    loadError,
    updateAccount: mockUpdateAccount,
  }));
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

type Hook = Awaited<ReturnType<typeof renderHook<ReturnType<typeof useEditAccount>, unknown>>>;

async function edit(hook: Hook, values: { name?: string; color?: string }) {
  await act(async () => {
    if (values.name !== undefined) hook.result.current.form.setValue('name', values.name);
    if (values.color !== undefined) hook.result.current.form.setValue('color', values.color);
  });
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.submit();
  });
}

describe('useEditAccount', () => {
  beforeEach(setup);

  it('sends a bank name and colour with its stored credit columns, then returns', async () => {
    const hook = await renderHook(() => useEditAccount());

    await edit(hook, { name: 'CIB Payroll', color: '#7A2E3B' });
    await submit(hook);

    expect(mockUpdateAccount).toHaveBeenCalledWith('acc-1', {
      name: 'CIB Payroll',
      color: '#7A2E3B',
      credit_limit: null,
      minimum_payment: null,
      statement_due_day: null,
      interest_tracking: 0,
      apr: null,
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
    expect(mockDismissTo).not.toHaveBeenCalled();
  });

  it('sends a card colour change with its stored credit values unchanged', async () => {
    mockParams = { id: 'card-1' };
    const hook = await renderHook(() => useEditAccount());

    await edit(hook, { color: '#7A2E3B' });
    await submit(hook);

    expect(mockUpdateAccount).toHaveBeenCalledWith('card-1', {
      name: 'CIB Visa',
      color: '#7A2E3B',
      credit_limit: 1500.5,
      minimum_payment: 200,
      statement_due_day: 15,
      interest_tracking: 1,
      apr: 24.5,
    });
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('keeps every value and shows the failure line when the write is rejected', async () => {
    const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
    mockUpdateAccount.mockRejectedValueOnce(new Error('disk full'));
    const hook = await renderHook(() => useEditAccount());

    await edit(hook, { name: 'CIB Payroll', color: '#7A2E3B' });
    await submit(hook);

    expect(mockUpdateAccount).toHaveBeenCalledTimes(1);
    expect(hook.result.current.form.getValues('name')).toBe('CIB Payroll');
    expect(hook.result.current.form.getValues('color')).toBe('#7A2E3B');
    expect(hook.result.current.state.statusMessage).toBe(Strings.editAccountSaveError);
    expect(hook.result.current.state.saving).toBe(false);
    expect(mockBack).not.toHaveBeenCalled();
    consoleError.mockRestore();
  });

  it('dismisses to the accounts list when the write landed and the reload failed', async () => {
    mockUpdateAccount.mockImplementationOnce(() => {
      loadError = true;
      return Promise.resolve();
    });
    const hook = await renderHook(() => useEditAccount());

    await edit(hook, { name: 'CIB Payroll' });
    await submit(hook);

    expect(mockDismissTo).toHaveBeenCalledWith('/accounts');
    expect(mockBack).not.toHaveBeenCalled();
    expect(hook.result.current.state.statusMessage).toBeUndefined();
  });

  it('is idle before any save', async () => {
    const hook = await renderHook(() => useEditAccount());

    expect(hook.result.current.state.statusMessage).toBeUndefined();
    expect(hook.result.current.state.saving).toBe(false);
    expect(hook.result.current.state.account).toBe(bank);
  });

  it('marks an empty name and counts one field to fix', async () => {
    const hook = await renderHook(() => useEditAccount());

    await edit(hook, { name: '' });
    await submit(hook);

    expect(hook.result.current.form.formState.errors.name?.message).toBe(Strings.errNameRequired);
    expect(hook.result.current.state.statusMessage).toBe('Fix the 1 fields marked above.');
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it('marks a name over 30 characters with the add form line', async () => {
    const hook = await renderHook(() => useEditAccount());

    await edit(hook, { name: 'A'.repeat(31) });
    await submit(hook);

    expect(hook.result.current.form.formState.errors.name?.message).toBe(Strings.errNameTooLong);
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it('marks a name an archived account already uses', async () => {
    const hook = await renderHook(() => useEditAccount());

    await edit(hook, { name: 'Old Savings' });
    await submit(hook);

    expect(hook.result.current.form.formState.errors.name?.message).toBe(
      Strings.errNameDuplicateNamed('Old Savings'),
    );
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it('refuses a paid-down card with one field to fix and no name fault', async () => {
    mockParams = { id: 'card-2' };
    const hook = await renderHook(() => useEditAccount());

    await edit(hook, { name: 'NBE Platinum' });
    await submit(hook);

    expect(hook.result.current.state.statusMessage).toBe('Fix the 1 fields marked above.');
    expect(hook.result.current.form.formState.errors.name).toBeUndefined();
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it('returns on mount for an id no active account holds', async () => {
    mockParams = { id: 'acc-missing' };
    const hook = await renderHook(() => useEditAccount());

    expect(mockBack).toHaveBeenCalled();
    await submit(hook);
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it('returns on mount for an archived id, which only the name check reads', async () => {
    mockParams = { id: 'arch-1' };
    const hook = await renderHook(() => useEditAccount());

    expect(mockBack).toHaveBeenCalled();
    await submit(hook);
    expect(mockUpdateAccount).not.toHaveBeenCalled();
  });

  it('writes once when Save is tapped again while the first save is in flight', async () => {
    const pending = deferred<void>();
    mockUpdateAccount.mockReturnValue(pending.promise);
    const hook = await renderHook(() => useEditAccount());
    await edit(hook, { name: 'CIB Payroll' });
    let first: Promise<void> | undefined;
    let second: Promise<void> | undefined;

    await act(async () => {
      first = hook.result.current.submit();
      second = hook.result.current.submit();
    });

    expect(mockUpdateAccount).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state.saving).toBe(true);

    await act(async () => {
      pending.resolve();
      await Promise.all([first, second]);
    });

    expect(mockUpdateAccount).toHaveBeenCalledTimes(1);
    expect(hook.result.current.state.saving).toBe(false);
  });

  it('releases its own entry on unmount', async () => {
    const hook = await renderHook(() => useEditAccount());

    expect(Object.keys(useEditAccountState.getState().entries)).toHaveLength(1);

    await hook.unmount();

    expect(useEditAccountState.getState().entries).toEqual({});
  });
});
