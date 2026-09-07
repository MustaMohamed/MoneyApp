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
});
