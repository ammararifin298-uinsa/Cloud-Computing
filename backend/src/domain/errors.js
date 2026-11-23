export class DomainError extends Error {
  constructor(message, statusCode = 400, headers = null) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.headers = headers;
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(message) {
    super(message, 409);
  }
}

export class NotFoundError extends DomainError {
  constructor(message) {
    super(message, 404);
  }
}

export class ConflictError extends DomainError {
  constructor(message) {
    super(message, 409);
  }
}

export class ForbiddenError extends DomainError {
  constructor(message) {
    super(message, 403);
  }
}

export class ValidationError extends DomainError {
  constructor(message) {
    super(message, 422);
  }
}

export class ServiceUnavailableError extends DomainError {
  constructor(message, retryAfterSeconds = 3) {
    super(message, 503, { "Retry-After": String(retryAfterSeconds) });
  }
}
