export class DatabaseError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class NotFoundError extends DatabaseError {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}
