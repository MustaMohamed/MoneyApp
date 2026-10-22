export class CommitmentUndoRefusedError extends Error {
  constructor(commitmentId: string) {
    super(`Undo refused: commitment ${commitmentId} was stopped`);
    this.name = 'CommitmentUndoRefusedError';
  }
}

export class CommitmentNotFoundError extends Error {
  constructor(commitmentId: string) {
    super(`Commitment not found: ${commitmentId}`);
    this.name = 'CommitmentNotFoundError';
  }
}

export class CommitmentPaymentNotFoundError extends Error {
  constructor(paymentId: string) {
    super(`Commitment payment not found: ${paymentId}`);
    this.name = 'CommitmentPaymentNotFoundError';
  }
}

export class CommitmentPaymentNotSkippedError extends Error {
  constructor(paymentId: string) {
    super(`Commitment payment cannot be unskipped: ${paymentId}`);
    this.name = 'CommitmentPaymentNotSkippedError';
  }
}
