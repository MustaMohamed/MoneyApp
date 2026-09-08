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
