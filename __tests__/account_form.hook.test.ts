import { act, renderHook } from '@testing-library/react-native';

import { AccountType, Currency } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { useAccountFormState } from '@/modules/accounts/components/account_form/account_form.state';
import {
  useAccountForm,
  type UseAccountFormOptions,
} from '@/modules/accounts/components/account_form/use_account_form.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { BALANCE_REFUSES_ZERO } from '@/modules/accounts/utils/add_account.schema';
import {
  APR_REFUSES_ZERO,
  CREDIT_LIMIT_REFUSES_ZERO,
  MIN_PAYMENT_REFUSES_ZERO,
} from '@/modules/accounts/utils/credit_fields.schema';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { holdStillTypingDecimal } from '@/utils/use_zod_form.hook';

jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

const mockAddAccount = jest.fn();
let mockAccounts: { id: string; name: string; sort_order: number }[] = [];
let mockArchivedAccounts: { id: string; name: string }[] = [];

function setup() {
  mockAccounts = [{ id: 'a1', name: 'Existing', sort_order: 0 }];
  mockArchivedAccounts = [];
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: mockAccounts,
    archivedAccounts: mockArchivedAccounts,
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

  it('a re-tap after a completed save does nothing (MA-008 D10, T5)', async () => {
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
    expect(onSaved).toHaveBeenCalledTimes(1);
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
    // Republishing `mockAccounts` reproduces the real store's own `loadAccounts()` republication.
    mockAddAccount.mockImplementation(async () => {
      mockAccounts = [...mockAccounts, { id: 'new', name: 'New Account', sort_order: 1 }];
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

  it('a declined onSaved leaves the session retryable (MA-008 D10, T3)', async () => {
    // A decline (`onSaved` returns false) must not set `completed`, or N2 becomes unsaveable.
    const onSaved = jest.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(undefined);
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
    // Draft left blank: name and balance both fail validation.

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

  it('sortOrder is one past the highest active position, read at submit time', async () => {
    const { result } = await renderHook(() => useAccountForm(makeOptions()));
    await fillValidDraft(result);

    // A gap over the count: the active list is 3 long but its highest position is 7.
    mockAccounts = [
      ...mockAccounts,
      { id: 'a2', name: 'Two', sort_order: 7 },
      { id: 'a3', name: 'Three', sort_order: 4 },
    ];

    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddAccount).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 8 }));
  });

  it('sortOrder is 0 when no active account is left', async () => {
    mockAccounts = [];
    const { result } = await renderHook(() => useAccountForm(makeOptions()));
    await fillValidDraft(result);

    await act(async () => {
      await result.current.submit();
    });

    expect(mockAddAccount).toHaveBeenCalledWith(expect.objectContaining({ sort_order: 0 }));
  });

  describe('MA-115 half-typed amounts on a card with tracking on', () => {
    type FormHook = { result: { current: ReturnType<typeof useAccountForm> } };

    // Each field with the `refusesZero` constant its input reads.
    const FIELDS = [
      ['balance', BALANCE_REFUSES_ZERO],
      ['credit_limit', CREDIT_LIMIT_REFUSES_ZERO],
      ['min_payment', MIN_PAYMENT_REFUSES_ZERO],
      ['apr', APR_REFUSES_ZERO],
    ] as const;

    type AmountField = (typeof FIELDS)[number][0];
    const TYPED = { shouldDirty: true, shouldValidate: true } as const;

    const fieldError = (hook: FormHook, name: AmountField) =>
      hook.result.current.form.getFieldState(name).error?.message;

    // What a field's handler does on a keystroke: hold it, or make the shipped validating call.
    async function typeField(
      hook: FormHook,
      name: AmountField,
      text: string,
      refusesZero: boolean,
    ) {
      let held: boolean | undefined;
      await act(async () => {
        held = holdStillTypingDecimal(hook.result.current.form, name, text, refusesZero);
        if (!held) hook.result.current.form.setValue(name, text, TYPED);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
      return held;
    }

    // The shipped validating call alone, for values the hold never takes.
    async function setTyped(hook: FormHook, name: AmountField, text: string) {
      await act(async () => {
        hook.result.current.form.setValue(name, text, TYPED);
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    }

    async function mountCard(): Promise<FormHook> {
      const hook = await renderHook(() => useAccountForm(makeOptions()));
      await act(() => {
        hook.result.current.form.setValue('selected_type', AccountType.CreditCard);
        hook.result.current.form.setValue('interest_tracking', true);
      });
      return hook;
    }

    async function mountRefused() {
      const hook = await mountCard();
      await act(async () => {
        await hook.result.current.submit();
      });
      expect(mockAddAccount).not.toHaveBeenCalled();
      expect(fieldError(hook, 'balance')).toBe(Strings.errAmountRequired);
      expect(fieldError(hook, 'credit_limit')).toBe(Strings.errCreditLimitRequired);
      expect(fieldError(hook, 'min_payment')).toBeUndefined();
      expect(fieldError(hook, 'apr')).toBe(Strings.errAprRequired);
      return hook;
    }

    it.each(FIELDS)(
      'after a refused Save "48." is held on %s and leaves it without an error',
      async (name, refusesZero) => {
        const hook = await mountRefused();

        const held = await typeField(hook, name, '48.', refusesZero);

        expect(held).toBe(true);
        expect(hook.result.current.form.getValues(name)).toBe('48.');
        expect(fieldError(hook, name)).toBeUndefined();
      },
    );

    it.each(['0', '0.', '0.0'])(
      'after a refused Save %p is held on the credit limit, which refuses zero',
      async (text) => {
        const hook = await mountRefused();

        const held = await typeField(hook, 'credit_limit', text, CREDIT_LIMIT_REFUSES_ZERO);

        expect(held).toBe(true);
        expect(hook.result.current.form.getValues('credit_limit')).toBe(text);
        expect(fieldError(hook, 'credit_limit')).toBeUndefined();
      },
    );

    it.each(FIELDS.filter(([, refusesZero]) => !refusesZero))(
      'after a refused Save "0" is not held on %s, and the shipped call validates it clean',
      async (name, refusesZero) => {
        const hook = await mountRefused();

        const held = await typeField(hook, name, '0', refusesZero);

        expect(held).toBe(false);
        expect(hook.result.current.form.getValues(name)).toBe('0');
        expect(fieldError(hook, name)).toBeUndefined();
      },
    );

    it('a cleared credit limit reads required, and a cleared minimum payment reads nothing', async () => {
      const hook = await mountRefused();
      expect(await typeField(hook, 'credit_limit', '5', CREDIT_LIMIT_REFUSES_ZERO)).toBe(false);
      expect(fieldError(hook, 'credit_limit')).toBeUndefined();
      expect(await typeField(hook, 'min_payment', '5', MIN_PAYMENT_REFUSES_ZERO)).toBe(false);

      expect(await typeField(hook, 'credit_limit', '', CREDIT_LIMIT_REFUSES_ZERO)).toBe(false);
      expect(await typeField(hook, 'min_payment', '', MIN_PAYMENT_REFUSES_ZERO)).toBe(false);

      expect(fieldError(hook, 'credit_limit')).toBe(Strings.errCreditLimitRequired);
      expect(fieldError(hook, 'min_payment')).toBeUndefined();
    });

    it.each(FIELDS)(
      'before any Save a held "48." leaves %s without an error',
      async (name, refusesZero) => {
        const hook = await mountCard();

        let held: boolean | undefined;
        await act(async () => {
          held = holdStillTypingDecimal(hook.result.current.form, name, '48.', refusesZero);
          await new Promise((resolve) => setTimeout(resolve, 0));
        });

        expect(held).toBe(true);
        expect(hook.result.current.form.getValues(name)).toBe('48.');
        expect(fieldError(hook, name)).toBeUndefined();
      },
    );

    it('a complete value a field refuses shows its fault as typed', async () => {
      const hook = await mountRefused();

      await setTyped(hook, 'credit_limit', '0.001');
      expect(fieldError(hook, 'credit_limit')).toBe(Strings.errAmountInvalid);

      await setTyped(hook, 'apr', '101');
      expect(fieldError(hook, 'apr')).toBe(Strings.errAprRange);

      await setTyped(hook, 'balance', '0.001');
      expect(fieldError(hook, 'balance')).toBe(Strings.errAmountInvalid);

      await setTyped(hook, 'balance', '100');
      await setTyped(hook, 'min_payment', '150');
      expect(fieldError(hook, 'min_payment')).toBe(Strings.errMinPaymentExceedsOwed);
    });
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
