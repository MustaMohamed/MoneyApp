import { signal, type Signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';

import type { Account } from '../entities/account.entity';
import {
  AccountRepository,
  type IAccountRepository,
  type NewAccountInput,
  type UpdateAccountInput,
} from '../repositories/account.repository';

export type { Account, NewAccountInput, UpdateAccountInput };

const INITIAL_STATE = { accounts: [] as Account[], hasLoaded: false };

type AccountSignalState = {
  accounts: Signal<Account[]>;
  hasLoaded: Signal<boolean>;
};

type AccountStore = {
  state: AccountSignalState;
  loadAccounts: () => Promise<void>;
  addAccount: (data: NewAccountInput) => Promise<Account>;
  updateAccount: (id: string, data: UpdateAccountInput) => Promise<void>;
  archiveAccount: (id: string) => Promise<void>;
  adjustBalance: (id: string, newBalance: number) => Promise<void>;
  reset: () => void;
};

type AccountStoreSnapshot = {
  accounts: Account[];
  hasLoaded: boolean;
  loadAccounts: AccountStore['loadAccounts'];
  addAccount: AccountStore['addAccount'];
  updateAccount: AccountStore['updateAccount'];
  archiveAccount: AccountStore['archiveAccount'];
  adjustBalance: AccountStore['adjustBalance'];
  reset: AccountStore['reset'];
};

type AccountStoreCompatibility = {
  (): AccountStoreSnapshot;
  <T>(selector: (state: AccountStoreSnapshot) => T): T;
  getState: () => AccountStoreSnapshot;
  setState: (next: Partial<Pick<AccountStoreSnapshot, 'accounts' | 'hasLoaded'>>) => void;
  use: {
    loadAccounts: () => AccountStore['loadAccounts'];
    addAccount: () => AccountStore['addAccount'];
    updateAccount: () => AccountStore['updateAccount'];
    archiveAccount: () => AccountStore['archiveAccount'];
    adjustBalance: () => AccountStore['adjustBalance'];
    reset: () => AccountStore['reset'];
  };
  useState: {
    accounts: () => Account[];
    hasLoaded: () => boolean;
  };
};

function createAccountSignals(): AccountSignalState {
  return {
    accounts: signal(INITIAL_STATE.accounts),
    hasLoaded: signal(INITIAL_STATE.hasLoaded),
  };
}

function resetSignals(state: AccountSignalState) {
  state.accounts.value = INITIAL_STATE.accounts;
  state.hasLoaded.value = INITIAL_STATE.hasLoaded;
}

export function createAccountStore(
  repo: IAccountRepository,
  state: AccountSignalState = createAccountSignals(),
): AccountStore {
  const store: AccountStore = {
    state,

    loadAccounts: async () => {
      try {
        const accounts = await repo.getAll();
        state.accounts.value = accounts;
        state.hasLoaded.value = true;
      } catch (err) {
        console.error('[accountStore] loadAccounts failed:', err);
        throw err;
      }
    },

    addAccount: async (data) => {
      try {
        const account = await repo.add(data);
        await store.loadAccounts();
        return account;
      } catch (err) {
        console.error('[accountStore] addAccount failed:', err);
        throw err;
      }
    },

    updateAccount: async (id, data) => {
      try {
        await repo.update(id, data);
        await store.loadAccounts();
      } catch (err) {
        console.error('[accountStore] updateAccount failed:', err);
        throw err;
      }
    },

    archiveAccount: async (id) => {
      try {
        await repo.archive(id);
        await store.loadAccounts();
      } catch (err) {
        console.error('[accountStore] archiveAccount failed:', err);
        throw err;
      }
    },

    adjustBalance: async (id, newBalance) => {
      try {
        await repo.adjustBalance(id, newBalance);
        await store.loadAccounts();
      } catch (err) {
        console.error('[accountStore] adjustBalance failed:', err);
        throw err;
      }
    },

    reset: () => {
      resetSignals(state);
    },
  };

  return store;
}

const accountSignals = createAccountSignals();
const accountsStore = createAccountStore(new AccountRepository(), accountSignals);

export function useAccounts(): AccountStore {
  useSignals();
  return accountsStore;
}

function getSnapshot(store: AccountStore): AccountStoreSnapshot {
  return {
    accounts: store.state.accounts.value,
    hasLoaded: store.state.hasLoaded.value,
    loadAccounts: store.loadAccounts,
    addAccount: store.addAccount,
    updateAccount: store.updateAccount,
    archiveAccount: store.archiveAccount,
    adjustBalance: store.adjustBalance,
    reset: store.reset,
  };
}

function createCompatibilityStore(store: AccountStore): AccountStoreCompatibility {
  function useAccountStore(): AccountStoreSnapshot;
  function useAccountStore<T>(selector: (state: AccountStoreSnapshot) => T): T;
  function useAccountStore<T>(
    selector?: (state: AccountStoreSnapshot) => T,
  ): AccountStoreSnapshot | T {
    useSignals();
    const snapshot = getSnapshot(store);
    return selector ? selector(snapshot) : snapshot;
  }

  useAccountStore.getState = () => getSnapshot(store);
  useAccountStore.setState = (
    next: Partial<Pick<AccountStoreSnapshot, 'accounts' | 'hasLoaded'>>,
  ) => {
    if (next.accounts !== undefined) store.state.accounts.value = next.accounts;
    if (next.hasLoaded !== undefined) store.state.hasLoaded.value = next.hasLoaded;
  };
  useAccountStore.use = {
    loadAccounts: () => store.loadAccounts,
    addAccount: () => store.addAccount,
    updateAccount: () => store.updateAccount,
    archiveAccount: () => store.archiveAccount,
    adjustBalance: () => store.adjustBalance,
    reset: () => store.reset,
  };
  useAccountStore.useState = {
    accounts: () => {
      useSignals();
      return store.state.accounts.value;
    },
    hasLoaded: () => {
      useSignals();
      return store.state.hasLoaded.value;
    },
  };

  return useAccountStore;
}

export const useAccountStore = createCompatibilityStore(accountsStore);
