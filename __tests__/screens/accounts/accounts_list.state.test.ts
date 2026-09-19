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
    store.getState().setUnarchiveError(error);

    store.getState().resetArchivedCard();

    expect(store.getState().isArchivedExpanded).toBe(false);
    expect(store.getState().unarchiveError).toBeUndefined();
    expect(store.getState().selectedType).toBe(AccountType.Bank);
    expect(store.getState().isRetrying).toBe(true);
  });

  it('resetArchivedCard leaves a restore in flight locked', () => {
    const store = createAccountsListState();
    store.getState().setUnarchivingId('arch-1');

    store.getState().resetArchivedCard();

    expect(store.getState().unarchivingId).toBe('arch-1');
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

describe('accountsListState — the reorder write', () => {
  const order = ['acc-2', 'acc-1'];

  it('starts with no pending order and no write in flight', () => {
    const store = createAccountsListState();
    expect(store.getState()).toHaveProperty('pendingOrder', undefined);
    expect(store.getState().isReordering).toBe(false);
  });

  it('round-trips the pending order', () => {
    const store = createAccountsListState();
    store.getState().setPendingOrder(order);
    expect(store.getState().pendingOrder).toEqual(order);
    store.getState().setPendingOrder(undefined);
    expect(store.getState().pendingOrder).toBeUndefined();
  });

  it('round-trips the write lock', () => {
    const store = createAccountsListState();
    store.getState().setReordering(true);
    expect(store.getState().isReordering).toBe(true);
    store.getState().setReordering(false);
    expect(store.getState().isReordering).toBe(false);
  });

  it('reset clears the pending order and the lock', () => {
    const store = createAccountsListState();
    store.getState().setPendingOrder(order);
    store.getState().setReordering(true);

    store.getState().reset();

    expect(store.getState().pendingOrder).toBeUndefined();
    expect(store.getState().isReordering).toBe(false);
  });

  it('resetArchivedCard leaves a write in flight locked, with its pending order', () => {
    const store = createAccountsListState();
    store.getState().setPendingOrder(order);
    store.getState().setReordering(true);

    store.getState().resetArchivedCard();

    expect(store.getState().pendingOrder).toEqual(order);
    expect(store.getState().isReordering).toBe(true);
  });
});

describe('accountsListState — the lifted row', () => {
  it('starts with no row lifted', () => {
    const store = createAccountsListState();
    expect(store.getState()).toHaveProperty('liftedId', undefined);
  });

  it('round-trips the lifted id', () => {
    const store = createAccountsListState();
    store.getState().setLiftedId('acc-1');
    expect(store.getState().liftedId).toBe('acc-1');
    store.getState().setLiftedId(undefined);
    expect(store.getState().liftedId).toBeUndefined();
  });

  it('reset clears the lifted id', () => {
    const store = createAccountsListState();
    store.getState().setLiftedId('acc-1');

    store.getState().reset();

    expect(store.getState()).toHaveProperty('liftedId', undefined);
  });

  it('resetArchivedCard leaves a lifted row lifted', () => {
    const store = createAccountsListState();
    store.getState().setLiftedId('acc-1');

    store.getState().resetArchivedCard();

    expect(store.getState().liftedId).toBe('acc-1');
  });
});
