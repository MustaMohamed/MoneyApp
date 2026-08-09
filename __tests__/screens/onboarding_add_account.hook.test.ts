import { renderHook, act } from '@testing-library/react-native';

import { AccountType, Currency, OnboardingStep } from '@/constants/enums';
import { Strings } from '@/constants/strings';
import { AcctTokens } from '@/constants/theme_tokens';
import { useAccountFormState } from '@/modules/accounts/components/account_form/account_form.state';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useAddAccount } from '@/modules/onboarding/screens/onboarding/add_account/add_account.hook';
import { useAddAccountTransitionState } from '@/modules/onboarding/screens/onboarding/add_account/add_account.state';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

jest.mock('expo-router', () => ({
  useLocalSearchParams: jest.fn(() => ({})),
  useRouter: jest.fn(() => ({ replace: jest.fn() })),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));
jest.mock('@/modules/onboarding/store/onboarding.store', () => ({ useOnboardingStore: jest.fn() }));

const mockSetStep = jest.fn().mockResolvedValue(undefined);
const mockAddAccount = jest.fn().mockResolvedValue(undefined);
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);
const mockReplace = jest.fn();

let mockAccounts: { id: string; name: string }[] = [];

function setup(isAddingMore?: string) {
  mockAccounts = [];
  const { useLocalSearchParams, useRouter } = require('expo-router');
  (useLocalSearchParams as jest.Mock).mockReturnValue(
    isAddingMore === undefined ? {} : { isAddingMore },
  );
  (useRouter as jest.Mock).mockReturnValue({ replace: mockReplace });

  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: mockAccounts,
    addAccount: mockAddAccount,
    loadAccounts: mockLoadAccounts,
  }));
  const { useOnboardingStore } = require('@/modules/onboarding/store/onboarding.store');
  const storeState = {
    baseCurrency: Currency.EGP,
    setStep: mockSetStep,
  };
  (useOnboardingStore as jest.Mock).mockImplementation(
    (selector?: (state: typeof storeState) => unknown) =>
      selector ? selector(storeState) : storeState,
  );
  (useOnboardingStore as jest.Mock & { getState: jest.Mock }).getState = jest.fn(() => storeState);
}

// mockAddAccount republishes mockAccounts to reproduce the real store's own
// loadAccounts() republication (account.store.ts:82-91) — the mechanism D9
// exists for. Same name fillAndSubmit types, and `name` present so a second
// validation's superRefine duplicate check doesn't throw on a missing field.
function republishOnAdd() {
  mockAddAccount.mockImplementation(async () => {
    mockAccounts = [...mockAccounts, { id: 'new', name: 'CIB Savings' }];
  });
}

async function fillAndSubmit(result: { current: ReturnType<typeof useAddAccount> }) {
  await act(() => {
    result.current.form.setValue('name', 'CIB Savings');
    result.current.form.setValue('balance', '100');
  });
  await act(async () => {
    await result.current.handleSave();
  });
}

describe('useAddAccount', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAddAccount.mockResolvedValue(undefined);
    useAddAccountTransitionState.getState().reset();
    useAccountFormState.getState().reset();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useAddAccount())).resolves.toBeDefined();
  });

  it('the draft starts on the onboarding base currency', async () => {
    const { result } = await renderHook(() => useAddAccount());
    expect(result.current.form.getValues('currency')).toBe(Currency.EGP);
  });

  it("the draft's defaults are unchanged by the adoption", async () => {
    const { result } = await renderHook(() => useAddAccount());
    expect(result.current.form.getValues('selected_color')).toBe(AcctTokens.midnight.rich);
    expect(result.current.form.getValues('selected_type')).toBe(AccountType.Bank);
  });

  it('does not load the account list on mount', async () => {
    await renderHook(() => useAddAccount());
    expect(mockLoadAccounts).not.toHaveBeenCalled();
  });

  it('a successful save writes the step before it navigates, and replaces', async () => {
    republishOnAdd();
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N3);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/more_accounts');
    expect(mockSetStep.mock.invocationCallOrder[0]).toBeLessThan(
      mockReplace.mock.invocationCallOrder[0],
    );
  });

  it('a rejecting insert writes no step, does not navigate, and shows n2SaveError', async () => {
    mockAddAccount.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);

    expect(mockSetStep).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.statusMessage).toBe(Strings.n2SaveError);
    expect(result.current.state.saving).toBe(false);
  });

  it('a rejecting step write after a resolved insert retries into the next step without inserting again', async () => {
    republishOnAdd();
    mockSetStep.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useAddAccount());

    await fillAndSubmit(result);
    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
    expect(result.current.state.statusMessage).toBe(Strings.n2SaveError);
    expect(result.current.state.saving).toBe(false);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockSetStep).toHaveBeenCalledTimes(2);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/more_accounts');
    expect(result.current.state.statusMessage).toBeFalsy();
    expect(result.current.form.formState.errors.name).toBeUndefined();
  });

  it('?isAddingMore=true saves without writing a step', async () => {
    setup('true');
    republishOnAdd();
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockSetStep).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/more_accounts');
  });

  it('?isAddingMore=false saves like a first account', async () => {
    setup('false');
    republishOnAdd();
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);

    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N3);
  });

  it('onBack with no param writes N1 and replaces to welcome', async () => {
    const { result } = await renderHook(() => useAddAccount());
    await act(async () => {
      await result.current.onBack();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N1);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/welcome');
  });

  it('onBack with ?isAddingMore=true writes no step and replaces to more_accounts', async () => {
    setup('true');
    const { result } = await renderHook(() => useAddAccount());
    await act(async () => {
      await result.current.onBack();
    });
    expect(mockSetStep).not.toHaveBeenCalled();
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/more_accounts');
  });

  it('onBack with ?isAddingMore=false writes N1 and replaces to welcome', async () => {
    setup('false');
    const { result } = await renderHook(() => useAddAccount());
    await act(async () => {
      await result.current.onBack();
    });
    expect(mockSetStep).toHaveBeenCalledWith(OnboardingStep.N1);
    expect(mockReplace).toHaveBeenCalledWith('/(onboarding)/welcome');
  });

  it('onBack is ignored while a save is in flight', async () => {
    const { result } = await renderHook(() => useAddAccount());
    useAccountFormState.setState({ saving: true });

    await act(async () => {
      await result.current.onBack();
    });

    expect(mockSetStep).not.toHaveBeenCalled();
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('the CTA is ignored while a back transition is in flight', async () => {
    const { result } = await renderHook(() => useAddAccount());
    useAddAccountTransitionState.getState().begin();

    await fillAndSubmit(result);

    expect(mockAddAccount).not.toHaveBeenCalled();
  });

  it('a back failure replaces a stale save-failure message', async () => {
    mockAddAccount.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);
    expect(result.current.state.statusMessage).toBe(Strings.n2SaveError);

    mockSetStep.mockRejectedValueOnce(new Error('boom'));
    await act(async () => {
      await result.current.onBack();
    });

    expect(result.current.state.statusMessage).toBe(Strings.onboardingBackSaveError);
  });

  it('a save failure replaces a stale back-failure message', async () => {
    mockSetStep.mockRejectedValueOnce(new Error('boom'));
    const { result } = await renderHook(() => useAddAccount());
    await act(async () => {
      await result.current.onBack();
    });
    expect(result.current.state.statusMessage).toBe(Strings.onboardingBackSaveError);

    mockAddAccount.mockRejectedValueOnce(new Error('boom'));
    await fillAndSubmit(result);

    expect(result.current.state.statusMessage).toBe(Strings.n2SaveError);
  });

  it('a back that starts inside the save validation window does not navigate twice', async () => {
    republishOnAdd();
    const { result } = await renderHook(() => useAddAccount());
    await act(() => {
      result.current.form.setValue('name', 'CIB Savings');
      result.current.form.setValue('balance', '100');
    });

    let savePromise!: Promise<void>;
    await act(async () => {
      savePromise = result.current.handleSave();
      useAddAccountTransitionState.getState().begin();
      await savePromise;
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockSetStep).not.toHaveBeenCalledWith(OnboardingStep.N3);
    expect(mockReplace).not.toHaveBeenCalledWith('/(onboarding)/more_accounts');
  });

  it('a re-tap after a completed save does not re-write the step or navigate twice (MA-008 D10, T2)', async () => {
    republishOnAdd();
    const { result } = await renderHook(() => useAddAccount());
    await fillAndSubmit(result);

    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockSetStep).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });
});
