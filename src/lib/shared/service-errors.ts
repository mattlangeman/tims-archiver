/**
 * Service Error Classes
 *
 * Typed errors for service layer operations.
 * Routes catch these and return appropriate HTTP responses.
 */

export interface ValidationIssue {
	field: string;
	message: string;
}

/**
 * Base class for service errors
 */
class ServiceErrorBase extends Error {
	constructor(message: string) {
		super(message);
		this.name = this.constructor.name;
	}
}

/**
 * Resource not found
 * Routes should return 404
 */
class NotFoundError extends ServiceErrorBase {
	constructor(message = 'Resource not found') {
		super(message);
	}
}

/**
 * User is not authorized to perform this action
 * Routes should return 403
 */
class NotAuthorizedError extends ServiceErrorBase {
	constructor(message = 'Not authorized') {
		super(message);
	}
}

/**
 * Validation failed
 * Routes should return 400 with issues
 */
class ValidationError extends ServiceErrorBase {
	issues: ValidationIssue[];

	constructor(issues: ValidationIssue[]) {
		super('Validation failed');
		this.issues = issues;
	}
}

/**
 * Conflict - resource already exists or state prevents action
 * Routes should return 409
 */
class ConflictError extends ServiceErrorBase {
	constructor(message = 'Conflict') {
		super(message);
	}
}

/**
 * Rate limited - too many requests
 * Routes should return 429
 */
class RateLimitedError extends ServiceErrorBase {
	retryAfter?: number;

	constructor(message = 'Rate limited', retryAfter?: number) {
		super(message);
		this.retryAfter = retryAfter;
	}
}

/**
 * External service error (e.g., Archive.org API failure)
 * Routes should return 502 or 503
 */
class ExternalServiceError extends ServiceErrorBase {
	service: string;

	constructor(service: string, message: string) {
		super(`${service}: ${message}`);
		this.service = service;
	}
}

/**
 * ServiceError namespace for clean imports
 *
 * Usage:
 * ```typescript
 * import { ServiceError } from '$lib/shared/service-errors';
 *
 * throw new ServiceError.NotFound('Article not found');
 * throw new ServiceError.NotAuthorized('Cannot edit this article');
 * throw new ServiceError.Validation([{ field: 'url', message: 'Invalid URL' }]);
 * ```
 */
export const ServiceError = {
	NotFound: NotFoundError,
	NotAuthorized: NotAuthorizedError,
	Validation: ValidationError,
	Conflict: ConflictError,
	RateLimited: RateLimitedError,
	ExternalService: ExternalServiceError
} as const;

// Type exports for instanceof checks
export type ServiceErrorNotFound = NotFoundError;
export type ServiceErrorNotAuthorized = NotAuthorizedError;
export type ServiceErrorValidation = ValidationError;
export type ServiceErrorConflict = ConflictError;
export type ServiceErrorRateLimited = RateLimitedError;
export type ServiceErrorExternalService = ExternalServiceError;
