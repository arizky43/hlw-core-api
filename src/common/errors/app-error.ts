// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Error categories for classification
export enum ErrorCategory {
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  NOT_FOUND = 'not_found',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  DATABASE = 'database',
  INTERNAL = 'internal',
}

// Base error interface
export interface IAppError {
  message: string;
  code: string;
  statusCode: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  details?: any;
  timestamp: string;
  requestId?: string;
}

// Base application error class
export class AppError extends Error implements IAppError {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly category: ErrorCategory;
  public readonly severity: ErrorSeverity;
  public readonly details?: any;
  public readonly timestamp: string;
  public readonly requestId?: string;

  constructor(
    message: string,
    code: string,
    statusCode: number,
    category: ErrorCategory,
    severity: ErrorSeverity = ErrorSeverity.MEDIUM,
    details?: any,
    requestId?: string
  ) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.statusCode = statusCode;
    this.category = category;
    this.severity = severity;
    this.details = details;
    this.timestamp = new Date().toISOString();
    this.requestId = requestId;

    // Maintains proper stack trace for where our error was thrown
    Error.captureStackTrace(this, this.constructor);
  }

  toJSON(): IAppError {
    return {
      message: this.message,
      code: this.code,
      statusCode: this.statusCode,
      category: this.category,
      severity: this.severity,
      details: this.details,
      timestamp: this.timestamp,
      requestId: this.requestId,
    };
  }
}

// Validation error class
export class ValidationError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      message,
      'VALIDATION_ERROR',
      400,
      ErrorCategory.VALIDATION,
      ErrorSeverity.LOW,
      details,
      requestId
    );
  }
}

// Authentication error class
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed', details?: any, requestId?: string) {
    super(
      message,
      'AUTHENTICATION_ERROR',
      401,
      ErrorCategory.AUTHENTICATION,
      ErrorSeverity.MEDIUM,
      details,
      requestId
    );
  }
}

// Authorization error class
export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied', details?: any, requestId?: string) {
    super(
      message,
      'AUTHORIZATION_ERROR',
      403,
      ErrorCategory.AUTHORIZATION,
      ErrorSeverity.MEDIUM,
      details,
      requestId
    );
  }
}

// Not found error class
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', details?: any, requestId?: string) {
    super(
      `${resource} not found`,
      'NOT_FOUND_ERROR',
      404,
      ErrorCategory.NOT_FOUND,
      ErrorSeverity.LOW,
      details,
      requestId
    );
  }
}

// Business logic error class
export class BusinessLogicError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      message,
      'BUSINESS_LOGIC_ERROR',
      422,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      details,
      requestId
    );
  }
}

// External service error class
export class ExternalServiceError extends AppError {
  constructor(service: string, message: string, details?: any, requestId?: string) {
    super(
      `External service error (${service}): ${message}`,
      'EXTERNAL_SERVICE_ERROR',
      502,
      ErrorCategory.EXTERNAL_SERVICE,
      ErrorSeverity.HIGH,
      details,
      requestId
    );
  }
}

// Database error class
export class DatabaseError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      `Database error: ${message}`,
      'DATABASE_ERROR',
      500,
      ErrorCategory.DATABASE,
      ErrorSeverity.HIGH,
      details,
      requestId
    );
  }
}

// Internal server error class
export class InternalServerError extends AppError {
  constructor(message: string = 'Internal server error', details?: any, requestId?: string) {
    super(
      message,
      'INTERNAL_SERVER_ERROR',
      500,
      ErrorCategory.INTERNAL,
      ErrorSeverity.CRITICAL,
      details,
      requestId
    );
  }
}

// Rate limiting error class
export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded', details?: any, requestId?: string) {
    super(
      message,
      'RATE_LIMIT_ERROR',
      429,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.LOW,
      details,
      requestId
    );
  }
}

// Conflict error class
export class ConflictError extends AppError {
  constructor(message: string, details?: any, requestId?: string) {
    super(
      message,
      'CONFLICT_ERROR',
      409,
      ErrorCategory.BUSINESS_LOGIC,
      ErrorSeverity.MEDIUM,
      details,
      requestId
    );
  }
}

// Type guard to check if error is an AppError
export function isAppError(error: any): error is AppError {
  return error instanceof AppError;
}

// Type guard to check if error is a client error (4xx)
export function isClientError(error: AppError): boolean {
  return error.statusCode >= 400 && error.statusCode < 500;
}

// Type guard to check if error is a server error (5xx)
export function isServerError(error: AppError): boolean {
  return error.statusCode >= 500;
}