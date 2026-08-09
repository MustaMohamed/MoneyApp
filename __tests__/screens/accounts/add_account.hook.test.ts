import { act, renderHook } from '@testing-library/react-native';

import { useAccountFormState } from '@/modules/accounts/components/account_form/account_form.state';
import { useAddAccountApp } from '@/modules/accounts/screens/accounts/add_account/add_account.hook';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';

// Hoisted to module scope (MA-008 T1): the suite's previous
// `useRouter: () => ({ push: jest.fn(), back: jest.fn() })` mints a new fn
// per call, so a call-count assertion against it is vacuous — the same
// lesson already applied to mockLoadAccounts below. jest allows referencing
// `mock`-prefixed identifiers inside jest.mock's factory (babel-plugin-jest-hoist).
const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, back: mockBack }),
}));
jest.mock('@/modules/accounts/store/account.store', () => ({
  EMPTY_ACCOUNTS: [],
  useAccountStore: jest.fn(),
}));

// Hoisted to module scope: attachMockSelectorStore's factory is re-invoked
// on every getState() call, so a `jest.fn()` built inside the factory would
// give the test and the hook two different references — a
// `not.toHaveBeenCalled()` assertion against that would pass vacuously, even
// with the redundant load still in place.
const mockLoadAccounts = jest.fn().mockResolvedValue(undefined);

// MA-008 T1: must republish mockAccounts, mirroring the real store's own
// loadAccounts() republication (account.store.ts:82-91) — otherwise a
// second submit() re-validates against an empty accounts array and the test
// proves nothing about the post-completion bypass.
const mockAddAccount = jest.fn();
let mockAccounts: { id: string; name: string }[] = [];

function setup() {
  mockAccounts = [];
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => ({
    accounts: mockAccounts,
    addAccount: mockAddAccount,
    loadAccounts: mockLoadAccounts,
  }));
}

async function fillValidDraft(result: { current: ReturnType<typeof useAddAccountApp> }) {
  await act(() => {
    result.current.form.setValue('name', 'New Account');
    result.current.form.setValue('balance', '100');
  });
}

describe('useAddAccountApp', () => {
  beforeEach(() => {
    mockPush.mockClear();
    mockBack.mockClear();
    mockAddAccount.mockReset();
    mockLoadAccounts.mockClear();
    useAccountFormState.getState().reset();
    setup();
  });

  it('renders without throwing', async () => {
    await expect(renderHook(() => useAddAccountApp())).resolves.toBeDefined();
  });

  it('returns form, handleSave, onBack and state', async () => {
    const { result } = await renderHook(() => useAddAccountApp());
    expect(result.current.form).toBeDefined();
    expect(typeof result.current.handleSave).toBe('function');
    expect(typeof result.current.onBack).toBe('function');
    expect(result.current.state).toHaveProperty('saving');
    expect(result.current.state).toHaveProperty('errorMessage');
  });

  it('does not reload the account list on mount', async () => {
    await renderHook(() => useAddAccountApp());
    expect(mockLoadAccounts).not.toHaveBeenCalled();
  });

  it('a re-tap after a completed save does not pop twice (MA-008 D10, T1)', async () => {
    mockAddAccount.mockImplementation(async () => {
      mockAccounts = [...mockAccounts, { id: 'new', name: 'New Account' }];
    });
    const { result } = await renderHook(() => useAddAccountApp());
    await fillValidDraft(result);

    await act(async () => {
      await result.current.handleSave();
    });
    await act(async () => {
      await result.current.handleSave();
    });

    expect(mockAddAccount).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });
});
