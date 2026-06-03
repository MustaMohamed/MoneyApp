import { makeAutoObservable, observable, runInAction } from 'mobx';

import type { Account } from '../entities/account.entity';
import {
  accountRepository,
  type IAccountRepository,
  type NewAccountInput,
  type UpdateAccountInput,
} from '../repositories/account.repository';

export type { Account, NewAccountInput, UpdateAccountInput };

export const EMPTY_ACCOUNTS: Account[] = [];
Object.freeze(EMPTY_ACCOUNTS);
const INITIAL_ACCOUNTS = EMPTY_ACCOUNTS;

export class AccountStore {
  accounts: Account[] = INITIAL_ACCOUNTS;

  private loadRequestId = 0;

  constructor(private readonly repository: IAccountRepository = accountRepository) {
    makeAutoObservable<AccountStore, 'loadRequestId' | 'repository'>(
      this,
      {
        accounts: observable.ref,
        loadRequestId: false,
        repository: false,
      },
      { autoBind: true },
    );
  }

  async init(): Promise<void> {
    await this.syncAccounts();
  }

  private async syncAccounts(): Promise<void> {
    const requestId = ++this.loadRequestId;

    try {
      const accounts = await this.repository.getAll();
      runInAction(() => {
        if (requestId === this.loadRequestId) {
          this.accounts = accounts;
        }
      });
    } catch (err) {
      console.error('[accountStore] init failed:', err);
      throw err;
    }
  }

  async addAccount(data: NewAccountInput): Promise<Account> {
    try {
      const account = await this.repository.add(data);
      await this.syncAccounts();
      return account;
    } catch (err) {
      console.error('[accountStore] addAccount failed:', err);
      throw err;
    }
  }

  async updateAccount(id: string, data: UpdateAccountInput): Promise<void> {
    try {
      await this.repository.update(id, data);
      await this.syncAccounts();
    } catch (err) {
      console.error('[accountStore] updateAccount failed:', err);
      throw err;
    }
  }

  async archiveAccount(id: string): Promise<void> {
    try {
      await this.repository.archive(id);
      await this.syncAccounts();
    } catch (err) {
      console.error('[accountStore] archiveAccount failed:', err);
      throw err;
    }
  }

  async adjustBalance(id: string, newBalance: number): Promise<void> {
    try {
      await this.repository.adjustBalance(id, newBalance);
      await this.syncAccounts();
    } catch (err) {
      console.error('[accountStore] adjustBalance failed:', err);
      throw err;
    }
  }

  reset(): void {
    this.loadRequestId += 1;
    this.accounts = INITIAL_ACCOUNTS;
  }
}

export const accountStore = new AccountStore(accountRepository);

export function useAccountStore(): AccountStore {
  return accountStore;
}
