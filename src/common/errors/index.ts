// Export all error types and classes
export * from './app-error';

// Export error response helpers
export * from './error-response';

// Export error handler
export * from './error-handler';

// Export validation handler
export * from './validation-handler';

// Re-export commonly used items for convenience
export {
  AppError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  BusinessLogicError,
  ExternalServiceError,
  DatabaseError,
  InternalServerError,
  RateLimitError,
  ConflictError,
  ErrorSeverity,
  ErrorCategory,
  isAppError,
  isClientError,
  isServerError,
} from './app-error';

export {
  createErrorResponse,
  createSuccessResponse,
  createEnvironmentAwareErrorResponse,
  formatValidationError,
  isErrorResponse,
  isSuccessResponse,
} from './error-response';

export {
  ErrorHandler,
  defaultErrorHandler,
  ConsoleLogger,
} from './error-handler';

export {
  ValidationHandler,
  validationHandler,
  throwValidationError,
  createValidationErrorFromContext,
} from './validation-handler';

export type {
  IAppError,
} from './app-error';

export type {
  ErrorResponse,
  SuccessResponse,
  ApiResponse,
} from './error-response';

export type {
  ILogger,
  ErrorHandlerConfig,
  RequestContext,
} from './error-handler';

export type {
  ValidationErrorDetail,
} from './validation-handler';