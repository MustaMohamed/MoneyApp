export class CategoryNameTakenError extends Error {
  constructor() {
    super('A category of this type already holds this name');
    this.name = 'CategoryNameTakenError';
  }
}

export class CategoryReloadError extends Error {
  constructor(cause: unknown) {
    super('The category list could not reload after a committed save');
    this.name = 'CategoryReloadError';
    this.cause = cause;
  }
}
