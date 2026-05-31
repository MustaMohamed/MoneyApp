import { signal, type Signal } from '@preact/signals-react';

import type { Account } from '../entities/account.entity';
import {
  AccountRepository,
  type IAccountRepository,
  type NewAccountInput,
  type UpdateAccountInput,
} from '../repositories/account.repository';

export type { Account, NewAccountInput, UpdateAccountInput };

const INITIAL_ACCOUNTS: Account[] | undefined = undefined;
export const EMPTY_ACCOUNTS: Account[] = [];

type AccountSignalState = {
  accounts: Signal<Account[] | undefined>;
};

export class AccountStore {
  readonly state: AccountSignalState = {
    accounts: signal(INITIAL_ACCOUNTS),
  };

  constructor(private readonly repository: IAccountRepository = new AccountRepository()) {}

  loadAccounts = async (): Promise<void> => {
    try {
      const accounts = await this.repository.getAll();
      this.state.accounts.value = accounts;
    } catch (err) {
      console.error('[accountStore] loadAccounts failed:', err);
      throw err;
    }
  };

  addAccount = async (data: NewAccountInput): Promise<Account> => {
    try {
      const account = await this.repository.add(data);
      await this.loadAccounts();
      return account;
    } catch (err) {
      console.error('[accountStore] addAccount failed:', err);
      throw err;
    }
  };

  updateAccount = async (id: string, data: UpdateAccountInput): Promise<void> => {
    try {
      await this.repository.update(id, data);
      await this.loadAccounts();
    } catch (err) {
      console.error('[accountStore] updateAccount failed:', err);
      throw err;
    }
  };

  archiveAccount = async (id: string): Promise<void> => {
    try {
      await this.repository.archive(id);
      await this.loadAccounts();
    } catch (err) {
      console.error('[accountStore] archiveAccount failed:', err);
      throw err;
    }
  };

  adjustBalance = async (id: string, newBalance: number): Promise<void> => {
    try {
      await this.repository.adjustBalance(id, newBalance);
      await this.loadAccounts();
    } catch (err) {
      console.error('[accountStore] adjustBalance failed:', err);
      throw err;
    }
  };

  reset = () => {
    this.state.accounts.value = INITIAL_ACCOUNTS;
  };
}

const accountsStore = new AccountStore(new AccountRepository());

export function useAccounts(): AccountStore {
  return accountsStore;
}
