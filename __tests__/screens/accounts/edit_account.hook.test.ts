import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useEditAccount } from '@/modules/accounts/screens/accounts/edit_account/edit_account.hook';
import { useEditAccountState } from '@/modules/accounts/screens/accounts/edit_account/edit_account.state';
import { useAccountStore, type Account } from '@/modules/accounts/store/account.store';
import type { EditAccountFormData } from '@/modules/accounts/utils/edit_account.schema';
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

const untrackedCard = makeTestAccount({
  id: 'card-3',
  name: 'QNB Classic',
  type: AccountType.CreditCard,
  currency: Currency.EGP,
  credit_limit: 20000,
  minimum_payment: 200,
  current_balance: 900,
  interest_tracking: 0,
  apr: null,
});

const archived = makeTestAccount({ id: 'arch-1', name: 'Old Savings', is_archived: 1 });

const mockUpdateAccount = jest.fn<Promise<void>, [string, unknown]>();
let accounts: Account[] = [];
let archivedAccounts: Account[] = [];
let loadError = false;

function setup() {
  jest.clearAllMocks();
  mockParams = { id: 'acc-1' };
  accounts = [bank, card, paidDownCard, untrackedCard];
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

const FORM_FIELDS = [
  'name',
  'color',
  'credit_limit',
  'min_payment',
  'due_day',
  'interest_tracking',
  'apr',
] as const satisfies readonly (keyof EditAccountFormData)[];

// Fails `tsc` when a form field is missing from `FORM_FIELDS`, which `edit()` would otherwise skip.
const EVERY_FORM_FIELD_LISTED: Exclude<
  keyof EditAccountFormData,
  (typeof FORM_FIELDS)[number]
> extends never
  ? true
  : never = true;
void EVERY_FORM_FIELD_LISTED;

async function edit(hook: Hook, values: Partial<EditAccountFormData>) {
  await act(async () => {
    for (const field of FORM_FIELDS) {
      const value = values[field];
      if (value !== undefined) hook.result.current.form.setValue(field, value);
    }
  });
}

async function submit(hook: Hook) {
  await act(async () => {
    await hook.result.current.submit();
  });
}

describe('useEditAccount', () => {
  beforeEach(setup);

  it('sends a bank name and colour with its stored credit columns, then dismisses to its detail', async () => {
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
    expect(mockDismissTo).toHaveBeenCalledWith('/accounts/acc-1');
    expect(mockDismissTo).toHaveBeenCalledTimes(1);
    expect(mockBack).not.toHaveBeenCalled();
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
    expect(mockDismissTo).toHaveBeenCalledWith('/accounts/card-1');
    expect(mockBack).not.toHaveBeenCalled();
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
    expect(mockDismissTo).not.toHaveBeenCalled();
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

  describe('a card credit block', () => {
    beforeEach(() => {
      mockParams = { id: 'card-1' };
    });

    it('sends every edited credit value with name and colour unchanged, then dismisses to its detail', async () => {
      const hook = await renderHook(() => useEditAccount());

      await edit(hook, {
        credit_limit: '12,000.00',
        min_payment: '300',
        due_day: '5',
        apr: '19.9',
      });
      await submit(hook);

      expect(mockUpdateAccount).toHaveBeenCalledWith('card-1', {
        name: 'CIB Visa',
        color: '#1B2B4B',
        credit_limit: 12000,
        minimum_payment: 300,
        statement_due_day: 5,
        interest_tracking: 1,
        apr: 19.9,
      });
      expect(mockDismissTo).toHaveBeenCalledWith('/accounts/card-1');
    });

    it('saves a limit below what the card owes', async () => {
      const hook = await renderHook(() => useEditAccount());

      await edit(hook, { credit_limit: '500' });
      await submit(hook);

      expect(mockUpdateAccount).toHaveBeenCalledWith(
        'card-1',
        expect.objectContaining({ credit_limit: 500 }),
      );
    });

    it('sends tracking off with an empty APR', async () => {
      const hook = await renderHook(() => useEditAccount());

      await edit(hook, { interest_tracking: false });
      await submit(hook);

      expect(mockUpdateAccount).toHaveBeenCalledWith(
        'card-1',
        expect.objectContaining({ interest_tracking: 0, apr: null }),
      );
    });

    it('drops the APR fault and its count when tracking is turned off after a refused save', async () => {
      const hook = await renderHook(() => useEditAccount());

      await edit(hook, { apr: '' });
      await submit(hook);

      expect(hook.result.current.state.statusMessage).toBe('Fix the 1 fields marked above.');

      await edit(hook, { interest_tracking: false });

      expect(hook.result.current.form.formState.errors.apr).toBeUndefined();
      expect(hook.result.current.state.statusMessage).toBeUndefined();
      expect(mockUpdateAccount).not.toHaveBeenCalled();
    });

    it('requires an APR once tracking is turned on and counts one field to fix', async () => {
      mockParams = { id: 'card-3' };
      const hook = await renderHook(() => useEditAccount());

      await edit(hook, { interest_tracking: true });
      await submit(hook);

      expect(hook.result.current.form.formState.errors.apr?.message).toBe(Strings.errAprRequired);
      expect(hook.result.current.state.statusMessage).toBe('Fix the 1 fields marked above.');
      expect(mockUpdateAccount).not.toHaveBeenCalled();
    });

    it('marks a due day outside 1 to 31', async () => {
      const hook = await renderHook(() => useEditAccount());

      await edit(hook, { due_day: '45' });
      await submit(hook);

      expect(hook.result.current.form.formState.errors.due_day?.message).toBe(
        Strings.errDueDayRange,
      );
      expect(mockUpdateAccount).not.toHaveBeenCalled();
    });

    it('marks a minimum payment above what the card owes', async () => {
      const hook = await renderHook(() => useEditAccount());

      await edit(hook, { min_payment: '950' });
      await submit(hook);

      expect(hook.result.current.form.formState.errors.min_payment?.message).toBe(
        Strings.errMinPaymentExceedsOwed,
      );
      expect(mockUpdateAccount).not.toHaveBeenCalled();
    });

    it('counts an empty name and an out-of-range due day as two fields to fix (D3)', async () => {
      const hook = await renderHook(() => useEditAccount());

      await edit(hook, { name: '', due_day: '45' });
      await submit(hook);

      expect(hook.result.current.state.statusMessage).toBe('Fix the 2 fields marked above.');
      expect(mockUpdateAccount).not.toHaveBeenCalled();
    });
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
