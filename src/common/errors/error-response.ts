import { AppError, isAppError, isClientError, isServerError, ErrorSeverity } from './app-error';
import { 
  ApiResponse as HelperApiResponse,
  successResponse,
  errorResponse,
  validationErrorResponse,
  unauthorizedResponse,
  forbiddenResponse,
  notFoundResponse,
  internalServerErrorResponse
} from '../helpers/response.helper';

// Standard error response interface
export interface ErrorResponse {
  success: false;
  error: {
    message: string;
    code: string;
    statusCode: number;
    category: string;
    timestamp: string;
    requestId?: string;
    details?: any;
  };
  meta?: {
    severity: ErrorSeverity;
    isClientError: boolean;
    isServerError: boolean;
  };
}

// Success response interface for consistency
export interface SuccessResponse<T = any> {
  success: true;
  data: T;
  meta?: {
    timestamp: string;
    requestId?: string;
  };
}

// Union type for all responses
export type ApiResponse<T = any> = SuccessResponse<T> | ErrorResponse;

// Helper function to create standardized error responses
export function createErrorResponse(
  error: AppError | Error,
  requestId?: string,
  includeStack: boolean = false
): ErrorResponse {
  if (isAppError(error)) {
    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        category: error.category,
        timestamp: error.timestamp,
        requestId: error.requestId || requestId,
        details: includeStack ? { ...error.details, stack: error.stack } : error.details,
      },
      meta: {
        severity: error.severity,
        isClientError: isClientError(error),
        isServerError: isServerError(error),
      },
    };
  }

  // Handle generic errors
  return {
    success: false,
    error: {
      message: error.message || 'An unexpected error occurred',
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      category: 'internal',
      timestamp: new Date().toISOString(),
      requestId,
      details: includeStack ? { stack: error.stack } : undefined,
    },
    meta: {
      severity: ErrorSeverity.CRITICAL,
      isClientError: false,
      isServerError: true,
    },
  };
}

// Helper function to create standardized success responses
export function createSuccessResponse<T>(
  data: T,
  requestId?: string
): SuccessResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString(),
      requestId,
    },
  };
}

// Helper function to format validation errors
export function formatValidationError(
  validationErrors: any[],
  requestId?: string
): ErrorResponse {
  const formattedErrors = validationErrors.map((err) => ({
    field: err.path || err.property || 'unknown',
    message: err.message || 'Invalid value',
    value: err.value,
    constraints: err.constraints || err.errors,
  }));

  return {
    success: false,
    error: {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      category: 'validation',
      timestamp: new Date().toISOString(),
      requestId,
      details: {
        errors: formattedErrors,
        count: formattedErrors.length,
      },
    },
    meta: {
      severity: ErrorSeverity.LOW,
      isClientError: true,
      isServerError: false,
    },
  };
}

// Helper function to sanitize error details for production
export function sanitizeErrorDetails(error: AppError, isProduction: boolean): any {
  if (!isProduction) {
    return error.details;
  }

  // In production, only include safe details for client errors
  if (isClientError(error)) {
    return error.details;
  }

  // For server errors in production, don't expose internal details
  return undefined;
}

// Helper function to determine if stack trace should be included
export function shouldIncludeStack(error: AppError, isProduction: boolean): boolean {
  // Never include stack traces in production
  if (isProduction) {
    return false;
  }

  // In development, include stack traces for server errors and critical issues
  return isServerError(error) || error.severity === ErrorSeverity.CRITICAL;
}

// Helper function to create error response with environment-aware details
export function createEnvironmentAwareErrorResponse(
  error: AppError | Error,
  requestId?: string,
  isProduction: boolean = process.env.NODE_ENV === 'production'
): ErrorResponse {
  if (isAppError(error)) {
    const sanitizedDetails = sanitizeErrorDetails(error, isProduction);
    const includeStack = shouldIncludeStack(error, isProduction);

    return {
      success: false,
      error: {
        message: error.message,
        code: error.code,
        statusCode: error.statusCode,
        category: error.category,
        timestamp: error.timestamp,
        requestId: error.requestId || requestId,
        details: includeStack ? { ...sanitizedDetails, stack: error.stack } : sanitizedDetails,
      },
      meta: {
        severity: error.severity,
        isClientError: isClientError(error),
        isServerError: isServerError(error),
      },
    };
  }

  // Handle generic errors with production safety
  const message = isProduction ? 'An unexpected error occurred' : error.message;
  const details = isProduction ? undefined : { stack: error.stack };

  return {
    success: false,
    error: {
      message,
      code: 'UNKNOWN_ERROR',
      statusCode: 500,
      category: 'internal',
      timestamp: new Date().toISOString(),
      requestId,
      details,
    },
    meta: {
      severity: ErrorSeverity.CRITICAL,
      isClientError: false,
      isServerError: true,
    },
  };
}

// Type guards for response types
export function isErrorResponse(response: ApiResponse): response is ErrorResponse {
  return response.success === false;
}

export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

// Bridge functions to integrate with response.helper
// These functions provide a consistent interface while maintaining detailed error structure

/**
 * Creates a standardized success response using response.helper format
 * @param message - Success message
 * @param data - Optional data payload
 * @param requestId - Optional request ID for tracking
 * @returns Helper format response
 */
export function createHelperSuccessResponse<T>(
  message: string,
  data?: T,
  requestId?: string
): HelperApiResponse<T> {
  return successResponse(message, data);
}

/**
 * Creates a standardized error response using response.helper format
 * @param error - AppError or generic Error
 * @param requestId - Optional request ID for tracking
 * @returns Helper format response
 */
export function createHelperErrorResponse(
  error: AppError | Error,
  requestId?: string
): HelperApiResponse {
  if (isAppError(error)) {
    // Map AppError to appropriate helper function based on status code
    switch (error.statusCode) {
      case 400:
        return validationErrorResponse(error.message, error.details);
      case 401:
        return unauthorizedResponse(error.message, error.details);
      case 403:
        return forbiddenResponse(error.message, error.details);
      case 404:
        return notFoundResponse(error.message, error.details);
      case 500:
      default:
        return internalServerErrorResponse(error.message, error.details);
    }
  }

  // Handle generic errors
  return internalServerErrorResponse(
    error.message || 'An unexpected error occurred',
    { requestId }
  );
}

/**
 * Creates a validation error response using response.helper format
 * @param message - Validation error message
 * @param validationErrors - Array of validation error details
 * @param requestId - Optional request ID for tracking
 * @returns Helper format validation error response
 */
export function createHelperValidationErrorResponse(
  message: string = 'Validation failed',
  validationErrors?: any[],
  requestId?: string
): HelperApiResponse {
  return validationErrorResponse(message, {
    errors: validationErrors,
    requestId,
  });
}

/**
 * Converts detailed ErrorResponse to helper format
 * @param detailedErrorResponse - Detailed error response
 * @returns Helper format response
 */
export function convertToHelperFormat(detailedErrorResponse: ErrorResponse): HelperApiResponse {
  return errorResponse(
    detailedErrorResponse.error.statusCode,
    detailedErrorResponse.error.message,
    {
      code: detailedErrorResponse.error.code,
      category: detailedErrorResponse.error.category,
      details: detailedErrorResponse.error.details,
      requestId: detailedErrorResponse.error.requestId,
      timestamp: detailedErrorResponse.error.timestamp,
      meta: detailedErrorResponse.meta,
    }
  );
}

/**
 * Converts helper format response to detailed format
 * @param helperResponse - Helper format response
 * @param requestId - Optional request ID
 * @returns Detailed format response
 */
export function convertFromHelperFormat<T>(
  helperResponse: HelperApiResponse<T>,
  requestId?: string
): ApiResponse<T> {
  if (helperResponse.code >= 200 && helperResponse.code < 300) {
    // Success response
    return createSuccessResponse(helperResponse.data as T, requestId);
  } else {
    // Error response - create a generic AppError-like structure
    const errorData = helperResponse.data as any;
    return {
      success: false,
      error: {
        message: helperResponse.message,
        code: errorData?.code || 'GENERIC_ERROR',
        statusCode: helperResponse.code,
        category: errorData?.category || 'client',
        timestamp: errorData?.timestamp || new Date().toISOString(),
        requestId: errorData?.requestId || requestId,
        details: errorData?.details,
      },
      meta: errorData?.meta || {
        severity: ErrorSeverity.MEDIUM,
        isClientError: helperResponse.code >= 400 && helperResponse.code < 500,
        isServerError: helperResponse.code >= 500,
      },
    } as ErrorResponse;
  }
}