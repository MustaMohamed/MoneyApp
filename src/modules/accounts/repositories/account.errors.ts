export class AccountNotFoundError extends Error {
  constructor() {
    super('Account not found');
    this.name = 'AccountNotFoundError';
  }
}

export class AccountNotArchivedError extends Error {
  constructor() {
    super('Only an archived account can be deleted');
    this.name = 'AccountNotArchivedError';
  }
}
