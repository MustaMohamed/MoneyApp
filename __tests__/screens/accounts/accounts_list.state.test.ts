import { AccountType } from '@/constants/enums';
import { createAccountsListState } from '@/modules/accounts/screens/accounts/list/accounts_list.state';

describe('accountsListState', () => {
  it('starts with no retry in flight', () => {
    const store = createAccountsListState();
    expect(store.getState().isRetrying).toBe(false);
  });

  it('round-trips the in-flight flag', () => {
    const store = createAccountsListState();

    store.getState().setRetrying(true);
    expect(store.getState().isRetrying).toBe(true);

    store.getState().setRetrying(false);
    expect(store.getState().isRetrying).toBe(false);
  });

  it('reset clears a retry left in flight', () => {
    const store = createAccountsListState();
    store.getState().setRetrying(true);

    store.getState().reset();

    expect(store.getState().isRetrying).toBe(false);
  });

  it('opens on All', () => {
    const store = createAccountsListState();
    expect(store.getState().selectedType).toBe('all');
  });

  it('round-trips the selected type without touching the retry flag', () => {
    const store = createAccountsListState();
    store.getState().setRetrying(true);

    store.getState().setSelectedType(AccountType.CreditCard);
    expect(store.getState().selectedType).toBe(AccountType.CreditCard);
    expect(store.getState().isRetrying).toBe(true);

    store.getState().setSelectedType('all');
    expect(store.getState().selectedType).toBe('all');
  });

  it('reset returns the selection to All', () => {
    const store = createAccountsListState();
    store.getState().setSelectedType(AccountType.Bank);

    store.getState().reset();

    expect(store.getState().selectedType).toBe('all');
  });
});

describe('accountsListState — the archived card', () => {
  const error = { id: 'arch-1', message: 'failed' };

  it('starts collapsed, with no unarchive in flight and no error', () => {
    const store = createAccountsListState();
    expect(store.getState().isArchivedExpanded).toBe(false);
    expect(store.getState().unarchivingId).toBeUndefined();
    expect(store.getState().unarchiveError).toBeUndefined();
  });

  it('round-trips the expanded flag', () => {
    const store = createAccountsListState();
    store.getState().setArchivedExpanded(true);
    expect(store.getState().isArchivedExpanded).toBe(true);
    store.getState().setArchivedExpanded(false);
    expect(store.getState().isArchivedExpanded).toBe(false);
  });

  it('round-trips the in-flight id', () => {
    const store = createAccountsListState();
    store.getState().setUnarchivingId('arch-1');
    expect(store.getState().unarchivingId).toBe('arch-1');
    store.getState().setUnarchivingId(undefined);
    expect(store.getState().unarchivingId).toBeUndefined();
  });

  it('round-trips the unarchive error', () => {
    const store = createAccountsListState();
    store.getState().setUnarchiveError(error);
    expect(store.getState().unarchiveError).toEqual(error);
    store.getState().setUnarchiveError(undefined);
    expect(store.getState().unarchiveError).toBeUndefined();
  });

  it('resetArchivedCard clears the card and leaves the type and the retry flag', () => {
    const store = createAccountsListState();
    store.getState().setSelectedType(AccountType.Bank);
    store.getState().setRetrying(true);
    store.getState().setArchivedExpanded(true);
    store.getState().setUnarchivingId('arch-1');
    store.getState().setUnarchiveError(error);

    store.getState().resetArchivedCard();

    expect(store.getState().isArchivedExpanded).toBe(false);
    expect(store.getState().unarchivingId).toBeUndefined();
    expect(store.getState().unarchiveError).toBeUndefined();
    expect(store.getState().selectedType).toBe(AccountType.Bank);
    expect(store.getState().isRetrying).toBe(true);
  });

  it('reset clears the card with everything else', () => {
    const store = createAccountsListState();
    store.getState().setArchivedExpanded(true);
    store.getState().setUnarchivingId('arch-1');
    store.getState().setUnarchiveError(error);

    store.getState().reset();

    expect(store.getState().isArchivedExpanded).toBe(false);
    expect(store.getState().unarchivingId).toBeUndefined();
    expect(store.getState().unarchiveError).toBeUndefined();
  });
});
