import type { TransactionPolicyIssue } from '../domain/transaction_policy';

export class TransactionNotFoundError extends Error {
  constructor() {
    super('Transaction not found');
    this.name = 'TransactionNotFoundError';
  }
}

export class TransactionValidationError extends Error {
  readonly issues: readonly TransactionPolicyIssue[];

  constructor(message: string, issues: readonly TransactionPolicyIssue[] = []) {
    super(message);
    this.name = 'TransactionValidationError';
    this.issues = issues;
  }
}

export class TransactionOwnershipError extends Error {
  constructor() {
    super('This transaction is managed by its commitment');
    this.name = 'TransactionOwnershipError';
  }
}

export class TransactionBalanceError extends TransactionValidationError {
  constructor(message: string, issues: readonly TransactionPolicyIssue[] = []) {
    super(message, issues);
    this.name = 'TransactionBalanceError';
  }
}
