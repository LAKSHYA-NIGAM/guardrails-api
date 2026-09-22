export class GuardrailException extends Error {
  constructor(message) {
    super(message);
    this.name = 'GuardrailException';
    this.status = 429;
    this.errorCode = 'TOO_MANY_REQUESTS';
  }
}

export class DuplicateLikeException extends Error {
  constructor(message) {
    super(message);
    this.name = 'DuplicateLikeException';
    this.status = 409;
    this.errorCode = 'DUPLICATE_LIKE';
  }
}

export class NotFoundException extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundException';
    this.status = 404;
    this.errorCode = 'NOT_FOUND';
  }
}

export class ValidationException extends Error {
  constructor(message, fieldErrors = {}) {
    super(message);
    this.name = 'ValidationException';
    this.status = 400;
    this.errorCode = 'VALIDATION_FAILED';
    this.fieldErrors = fieldErrors;
  }
}

export function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();

  // Guardrail 429
  if (err instanceof GuardrailException || err.status === 429) {
    console.warn(`[Guardrail] 429 Rejected: ${err.message}`);
    return res.status(429).json({
      status: 429,
      error: 'TOO_MANY_REQUESTS',
      message: err.message,
      timestamp
    });
  }

  // Duplicate Like 409
  if (err instanceof DuplicateLikeException || err.code === 11000 || err.status === 409) {
    console.warn(`[Like] 409 Duplicate: ${err.message}`);
    return res.status(409).json({
      status: 409,
      error: 'DUPLICATE_LIKE',
      message: err.message || 'Duplicate entry',
      timestamp
    });
  }

  // Not Found 404
  if (err instanceof NotFoundException || err.status === 404) {
    return res.status(404).json({
      status: 404,
      error: 'NOT_FOUND',
      message: err.message,
      timestamp
    });
  }

  // Validation 400
  if (err instanceof ValidationException || err.name === 'ValidationError') {
    const fieldErrors = err.fieldErrors || {};
    if (err.errors) {
      Object.keys(err.errors).forEach(key => {
        fieldErrors[key] = err.errors[key].message;
      });
    }
    return res.status(400).json({
      status: 400,
      error: 'VALIDATION_FAILED',
      message: err.message || 'Request validation failed',
      fieldErrors,
      timestamp
    });
  }

  // 500 Unhandled
  console.error('[Internal Error]', err);
  return res.status(500).json({
    status: 500,
    error: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred',
    timestamp
  });
}
