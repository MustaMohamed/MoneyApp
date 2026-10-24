import { renderHook } from '@testing-library/react-native';

import type { Account } from '@/modules/accounts/entities/account.entity';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import { useAccountsById } from '@/modules/accounts/store/use_accounts_by_id.hook';
import { attachMockSelectorStore } from '@/test_helpers/mock_zustand_selectors';
import { makeTestAccount } from '@/test_helpers/transaction';

jest.mock('@/modules/accounts/store/account.store', () => ({ useAccountStore: jest.fn() }));

interface MockAccountState {
  accounts: Account[];
  archivedAccounts: Account[];
  accountLookupById: Record<string, Account>;
  accountLookupError: boolean;
}

const active = makeTestAccount({ id: 'acc-active', name: 'Cash' });
const archived = makeTestAccount({ id: 'acc-archived', name: 'Old savings', is_archived: 1 });
const deleted = makeTestAccount({ id: 'acc-deleted', name: 'Closed card', is_deleted: 1 });

let mockState: MockAccountState;

beforeEach(() => {
  mockState = {
    accounts: [active],
    archivedAccounts: [archived],
    accountLookupById: { [deleted.id]: deleted },
    accountLookupError: false,
  };
  attachMockSelectorStore(useAccountStore as unknown as jest.Mock, () => mockState);
});

describe('useAccountsById', () => {
  it('resolves the active, the archived and the cache-only id', async () => {
    const { result } = await renderHook(() => useAccountsById());

    expect(result.current.accountsById.get(active.id)).toBe(active);
    expect(result.current.accountsById.get(archived.id)).toBe(archived);
    expect(result.current.accountsById.get(deleted.id)).toBe(deleted);
  });

  it('keeps the identity of accountsById across a render where only accountLookupError flips', async () => {
    const hook = await renderHook(() => useAccountsById());
    const before = hook.result.current.accountsById;

    mockState = { ...mockState, accountLookupError: true };
    await hook.rerender({});

    expect(hook.result.current.lookupFailed).toBe(true);
    expect(hook.result.current.accountsById).toBe(before);
  });

  it('reads the lists again when one of them changes', async () => {
    const hook = await renderHook(() => useAccountsById());
    const before = hook.result.current.accountsById;
    const added = makeTestAccount({ id: 'acc-added', name: 'Wallet' });

    mockState = { ...mockState, accounts: [active, added] };
    await hook.rerender({});

    expect(hook.result.current.accountsById).not.toBe(before);
    expect(hook.result.current.accountsById.get(added.id)).toBe(added);
  });

  it('lookupFailed follows accountLookupError', async () => {
    const hook = await renderHook(() => useAccountsById());
    expect(hook.result.current.lookupFailed).toBe(false);

    mockState = { ...mockState, accountLookupError: true };
    await hook.rerender({});
    expect(hook.result.current.lookupFailed).toBe(true);

    mockState = { ...mockState, accountLookupError: false };
    await hook.rerender({});
    expect(hook.result.current.lookupFailed).toBe(false);
  });
});
