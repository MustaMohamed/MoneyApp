export class AccountNotFoundError extends Error {
  constructor() {
    super('Account not found');
    this.name = 'AccountNotFoundError';
  }
}

export class AccountNotArchivedError extends Error {
  constructor(message = 'Only an archived account can be deleted') {
    super(message);
    this.name = 'AccountNotArchivedError';
  }
}

export class AccountNameTakenError extends Error {
  constructor() {
    super('An active account already holds this name');
    this.name = 'AccountNameTakenError';
  }
}
