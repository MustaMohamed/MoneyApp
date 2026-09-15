export class CategoryNameTakenError extends Error {
  constructor() {
    super('A category of this type already holds this name');
    this.name = 'CategoryNameTakenError';
  }
}
