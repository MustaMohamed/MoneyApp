import { act, renderHook } from '@testing-library/react-native';

import { Strings } from '@/constants/strings';
import { useAccountStore } from '@/modules/accounts/store/account.store';
import {
  useCommitmentFormBodyPickers,
  useCommitmentFormStripAccounts,
  useCommitmentFormStripError,
} from '@/modules/commitments/screens/commitments/components/commitment_form_body.hook';
import { useCommitmentFormBodyState } from '@/modules/commitments/screens/commitments/components/commitment_form_body.state';
import { makeTestAccount } from '@/test_helpers/transaction';

const entries = () => useCommitmentFormBodyState.getState().entries;

// Mounts the lower copy first, so each copy's owner is read off the key its mount added.
async function mountTwoCopies() {
  const lower = await renderHook(() => useCommitmentFormBodyPickers());
  const [lowerOwner] = Object.keys(entries());
  const upper = await renderHook(() => useCommitmentFormBodyPickers());
  return { lower, lowerOwner, upper };
}

beforeEach(() => {
  useCommitmentFormBodyState.getState().reset();
});

describe('useCommitmentFormBodyPickers', () => {
  it('a picker or date picker opened on one mounted copy stays closed on the other', async () => {
    const { lower, upper } = await mountTwoCopies();

    await act(async () => lower.result.current.setCategoryPickerVisible(true));
    await act(async () => upper.result.current.setShowStartDatePicker(true));

    expect(lower.result.current.state.categoryPickerVisible).toBe(true);
    expect(upper.result.current.state.categoryPickerVisible).toBe(false);
    expect(upper.result.current.state.showStartDatePicker).toBe(true);
    expect(lower.result.current.state.showStartDatePicker).toBe(false);
  });

  it('unmounting one copy leaves the other copy open picker as it was', async () => {
    const { lower, lowerOwner, upper } = await mountTwoCopies();
    await act(async () => lower.result.current.setCategoryPickerVisible(true));
    const shown = entries()[lowerOwner];

    expect(Object.keys(entries())).toHaveLength(2);

    await upper.unmount();

    expect(Object.keys(entries())).toEqual([lowerOwner]);
    expect(entries()[lowerOwner]).toBe(shown);
    expect(lower.result.current.state.categoryPickerVisible).toBe(true);
  });

  it('unmounting both copies leaves no entry behind', async () => {
    const { lower, upper } = await mountTwoCopies();
    await act(async () => upper.result.current.setShowEndDatePicker(true));

    await upper.unmount();
    await lower.unmount();

    expect(entries()).toEqual({});
  });
});

describe('useCommitmentFormStripAccounts', () => {
  const originalLoadAccountLookup = useAccountStore.getState().loadAccountLookup;
  const active = makeTestAccount({ id: 'acc-active', name: 'Cash' });
  const archived = makeTestAccount({ id: 'acc-archived', name: 'Old savings', is_archived: 1 });
  const deleted = makeTestAccount({ id: 'acc-deleted', name: 'Closed card', is_deleted: 1 });
  let loadAccountLookup: jest.Mock;

  beforeEach(() => {
    useAccountStore.getState().reset();
    loadAccountLookup = jest.fn().mockResolvedValue(undefined);
    useAccountStore.setState({
      accounts: [active],
      archivedAccounts: [archived],
      accountLookupById: { [deleted.id]: deleted },
      loadAccountLookup,
    });
  });

  afterEach(async () => {
    await act(async () => {
      useAccountStore.setState({ loadAccountLookup: originalLoadAccountLookup });
      useAccountStore.getState().reset();
    });
  });

  it('resolves the active, the archived and the lookup-held deleted account by id', async () => {
    const { result } = await renderHook(() => useCommitmentFormStripAccounts(deleted.id));

    expect(result.current.get(active.id)).toBe(active);
    expect(result.current.get(archived.id)).toBe(archived);
    expect(result.current.get(deleted.id)).toBe(deleted);
  });

  it("looks up the commitment's account when it has one", async () => {
    await renderHook(() => useCommitmentFormStripAccounts(deleted.id));

    expect(loadAccountLookup).toHaveBeenCalledWith([deleted.id]);
  });

  it('looks up nothing for a commitment with no account', async () => {
    await renderHook(() => useCommitmentFormStripAccounts(undefined));

    expect(loadAccountLookup).not.toHaveBeenCalled();
  });
});

describe('useCommitmentFormStripError', () => {
  const active = makeTestAccount({ id: 'acc-active', name: 'Cash' });
  const archived = makeTestAccount({ id: 'acc-archived', name: 'Old savings', is_archived: 1 });
  const deleted = makeTestAccount({ id: 'acc-deleted', name: 'Closed card', is_deleted: 1 });
  const missingId = 'acc-missing';

  beforeEach(() => {
    useAccountStore.getState().reset();
    useAccountStore.setState({
      accounts: [active],
      archivedAccounts: [archived],
      accountLookupById: { [deleted.id]: deleted },
      accountLookupError: true,
    });
  });

  afterEach(async () => {
    await act(async () => useAccountStore.getState().reset());
  });

  it('names the lookup error while the lookup failed and the id is unresolved', async () => {
    const { result } = await renderHook(() => useCommitmentFormStripError(missingId));

    expect(result.current).toBe(Strings.transactionsAccountLookupError);
  });

  it('reads undefined for an id the shared read resolves, the cache-only one included', async () => {
    const { result } = await renderHook(() => useCommitmentFormStripError(deleted.id));

    expect(result.current).toBeUndefined();
  });

  it('reads undefined once the lookup no longer fails', async () => {
    const { result } = await renderHook(() => useCommitmentFormStripError(missingId));
    expect(result.current).toBe(Strings.transactionsAccountLookupError);

    await act(async () => useAccountStore.setState({ accountLookupError: false }));

    expect(result.current).toBeUndefined();
  });

  it('reads undefined for an undefined id', async () => {
    const hook = await renderHook(
      (props: { accountId: string | undefined }) => useCommitmentFormStripError(props.accountId),
      { initialProps: { accountId: missingId } },
    );
    expect(hook.result.current).toBe(Strings.transactionsAccountLookupError);

    await hook.rerender({ accountId: undefined });

    expect(hook.result.current).toBeUndefined();
  });
});
