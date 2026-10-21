export class CommitmentUndoRefusedError extends Error {
  constructor(commitmentId: string) {
    super(`Undo refused: commitment ${commitmentId} was stopped`);
    this.name = 'CommitmentUndoRefusedError';
  }
}
