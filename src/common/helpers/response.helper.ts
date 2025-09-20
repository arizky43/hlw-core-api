// Type definitions for standardized API responses
export interface ApiResponse<T = any> {
  code: number;
  message: string;
  data?: T;
}

// Type for response parameters
export interface ResponseParams<T = any> {
  code: number;
  message: string;
  data?: T;
}

/**
 * Creates a standardized API response object
 * @param params - Response parameters including code, message, and optional data
 * @returns Formatted response object
 */
export function createResponse<T = any>(params: ResponseParams<T>): ApiResponse<T> {
  const response: ApiResponse<T> = {
    code: params.code,
    message: params.message,
  };

  // Only include data property if it's provided
  if (params.data !== undefined) {
    response.data = params.data;
  }

  return response;
}

/**
 * Creates a success response with status code 200
 * @param message - Success message
 * @param data - Optional data payload
 * @returns Formatted success response
 */
export function successResponse<T = any>(message: string, data?: T): ApiResponse<T> {
  return createResponse({
    code: 200,
    message,
    data,
  });
}

/**
 * Creates an error response with specified status code
 * @param code - HTTP status code
 * @param message - Error message
 * @param data - Optional error data
 * @returns Formatted error response
 */
export function errorResponse<T = any>(code: number, message: string, data?: T): ApiResponse<T> {
  return createResponse({
    code,
    message,
    data,
  });
}

/**
 * Creates a validation error response (400)
 * @param message - Validation error message
 * @param data - Optional validation error details
 * @returns Formatted validation error response
 */
export function validationErrorResponse<T = any>(message: string = 'Validation failed', data?: T): ApiResponse<T> {
  return errorResponse(400, message, data);
}

/**
 * Creates an unauthorized error response (401)
 * @param message - Unauthorized error message
 * @param data - Optional error data
 * @returns Formatted unauthorized error response
 */
export function unauthorizedResponse<T = any>(message: string = 'Unauthorized', data?: T): ApiResponse<T> {
  return errorResponse(401, message, data);
}

/**
 * Creates a forbidden error response (403)
 * @param message - Forbidden error message
 * @param data - Optional error data
 * @returns Formatted forbidden error response
 */
export function forbiddenResponse<T = any>(message: string = 'Forbidden', data?: T): ApiResponse<T> {
  return errorResponse(403, message, data);
}

/**
 * Creates a not found error response (404)
 * @param message - Not found error message
 * @param data - Optional error data
 * @returns Formatted not found error response
 */
export function notFoundResponse<T = any>(message: string = 'Not found', data?: T): ApiResponse<T> {
  return errorResponse(404, message, data);
}

/**
 * Creates an internal server error response (500)
 * @param message - Internal server error message
 * @param data - Optional error data
 * @returns Formatted internal server error response
 */
export function internalServerErrorResponse<T = any>(message: string = 'Internal server error', data?: T): ApiResponse<T> {
  return errorResponse(500, message, data);
}