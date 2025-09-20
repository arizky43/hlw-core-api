import { Context } from 'elysia';
import { 
  AppError, 
  isAppError, 
  ErrorSeverity, 
  ErrorCategory,
  ValidationError,
  InternalServerError 
} from './app-error';
import { 
  createEnvironmentAwareErrorResponse, 
  formatValidationError,
  ErrorResponse,
  createHelperErrorResponse,
  createHelperValidationErrorResponse,
  createHelperSuccessResponse
} from './error-response';
import { ValidationHandler } from './validation-handler';
import { ApiResponse as HelperApiResponse } from '../helpers/response.helper';

// Logger interface for dependency injection
export interface ILogger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

// Default console logger implementation
export class ConsoleLogger implements ILogger {
  error(message: string, meta?: any): void {
    console.error(`[ERROR] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  warn(message: string, meta?: any): void {
    console.warn(`[WARN] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  info(message: string, meta?: any): void {
    console.info(`[INFO] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }

  debug(message: string, meta?: any): void {
    console.debug(`[DEBUG] ${message}`, meta ? JSON.stringify(meta, null, 2) : '');
  }
}

// Error handler configuration
export interface ErrorHandlerConfig {
  logger?: ILogger;
  isProduction?: boolean;
  enableDetailedLogging?: boolean;
  enableStackTrace?: boolean;
  logLevel?: 'error' | 'warn' | 'info' | 'debug';
  customErrorHandlers?: Map<string, (error: AppError, context: Context) => ErrorResponse>;
}

// Request context interface
export interface RequestContext {
  requestId: string;
  method: string;
  path: string;
  userAgent?: string;
  ip?: string;
  userId?: string;
  timestamp: string;
}

// Error handler class
export class ErrorHandler {
  private logger: ILogger;
  private config: Required<ErrorHandlerConfig>;

  constructor(config: ErrorHandlerConfig = {}) {
    this.logger = config.logger || new ConsoleLogger();
    this.config = {
      logger: this.logger,
      isProduction: config.isProduction ?? process.env.NODE_ENV === 'production',
      enableDetailedLogging: config.enableDetailedLogging ?? !config.isProduction,
      enableStackTrace: config.enableStackTrace ?? !config.isProduction,
      logLevel: config.logLevel ?? 'error',
      customErrorHandlers: config.customErrorHandlers ?? new Map(),
    };
  }

  // Generate unique request ID
  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Extract request context from Elysia context
  private extractRequestContext(context: Context): RequestContext {
    const request = context.request;
    return {
      requestId: this.generateRequestId(),
      method: request.method,
      path: new URL(request.url).pathname,
      userAgent: request.headers.get('user-agent') || undefined,
      ip: request.headers.get('x-forwarded-for') || 
          request.headers.get('x-real-ip') || 
          'unknown',
      userId: (context as any).user?.id || undefined,
      timestamp: new Date().toISOString(),
    };
  }

  // Log error with appropriate level and details
  private logError(error: AppError | Error, requestContext: RequestContext): void {
    const baseLogData = {
      requestId: requestContext.requestId,
      method: requestContext.method,
      path: requestContext.path,
      userAgent: requestContext.userAgent,
      ip: requestContext.ip,
      userId: requestContext.userId,
      timestamp: requestContext.timestamp,
    };

    if (isAppError(error)) {
      const logData = {
        ...baseLogData,
        error: {
          name: error.name,
          message: error.message,
          code: error.code,
          statusCode: error.statusCode,
          category: error.category,
          severity: error.severity,
          stack: this.config.enableStackTrace ? error.stack : undefined,
          details: this.config.enableDetailedLogging ? error.details : undefined,
        },
      };

      // Log based on severity
      switch (error.severity) {
        case ErrorSeverity.CRITICAL:
          this.logger.error(`Critical error occurred`, logData);
          break;
        case ErrorSeverity.HIGH:
          this.logger.error(`High severity error occurred`, logData);
          break;
        case ErrorSeverity.MEDIUM:
          this.logger.warn(`Medium severity error occurred`, logData);
          break;
        case ErrorSeverity.LOW:
          if (this.config.logLevel === 'debug' || this.config.logLevel === 'info') {
            this.logger.info(`Low severity error occurred`, logData);
          }
          break;
      }
    } else {
      // Unknown error - always log as error
      const logData = {
        ...baseLogData,
        error: {
          name: error.name,
          message: error.message,
          stack: this.config.enableStackTrace ? error.stack : undefined,
        },
      };
      this.logger.error(`Unknown error occurred`, logData);
    }
  }

  // Handle validation errors
  private handleValidationError(error: ValidationError | any, context: Context): ErrorResponse {
    const requestContext = this.extractRequestContext(context);
    let validationError: ValidationError;
    
    // Check if it's already a ValidationError or needs conversion from Elysia error
    if (error instanceof ValidationError) {
      validationError = error;
    } else if (ValidationHandler.isValidationError(error)) {
      validationError = ValidationHandler.fromElysiaError(error);
    } else {
      // Fallback for unknown validation error format
      validationError = new ValidationError('Validation failed', [{
        field: 'unknown',
        message: error?.message || 'Validation failed',
        code: 'validation_error',
      }]);
    }

    this.logError(validationError, requestContext);

    return createEnvironmentAwareErrorResponse(
      validationError,
      requestContext.requestId,
      this.config.isProduction
    );
  }

  // Handle database errors
  private handleDatabaseError(error: Error, requestContext: RequestContext): AppError {
    // Common database error patterns
    if (error.message.includes('duplicate key') || error.message.includes('UNIQUE constraint')) {
      return new ValidationError(
        'A record with this information already exists',
        { originalError: error.message },
        requestContext.requestId
      );
    }

    if (error.message.includes('foreign key constraint')) {
      return new ValidationError(
        'Referenced record does not exist',
        { originalError: error.message },
        requestContext.requestId
      );
    }

    if (error.message.includes('connection') || error.message.includes('timeout')) {
      return new InternalServerError(
        'Database connection error',
        { originalError: error.message },
        requestContext.requestId
      );
    }

    // Generic database error
    return new InternalServerError(
      'Database operation failed',
      { originalError: error.message },
      requestContext.requestId
    );
  }

  // Classify unknown errors
  private classifyUnknownError(error: Error, requestContext: RequestContext): AppError {
    const message = error.message.toLowerCase();

    // Network/external service errors
    if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
      return new InternalServerError(
        'External service error',
        { originalError: error.message },
        requestContext.requestId
      );
    }

    // File system errors
    if (message.includes('enoent') || message.includes('file') || message.includes('directory')) {
      return new InternalServerError(
        'File system error',
        { originalError: error.message },
        requestContext.requestId
      );
    }

    // Permission errors
    if (message.includes('permission') || message.includes('access denied')) {
      return new InternalServerError(
        'Permission error',
        { originalError: error.message },
        requestContext.requestId
      );
    }

    // Default to internal server error
    return new InternalServerError(
      error.message || 'An unexpected error occurred',
      { originalError: error.message },
      requestContext.requestId
    );
  }

  // Main error handling method
  public async handleError(error: any, context: Context): Promise<ErrorResponse> {
    const requestContext = this.extractRequestContext(context);

    try {
      // Handle AppError instances
      if (isAppError(error)) {
        this.logError(error, requestContext);
        
        // Check for custom handlers
        const customHandler = this.config.customErrorHandlers.get(error.code);
        if (customHandler) {
          return customHandler(error, context);
        }

        return createEnvironmentAwareErrorResponse(
          error,
          requestContext.requestId,
          this.config.isProduction
        );
      }

      // Handle validation errors (both custom ValidationError and Elysia validation errors)
      if (error instanceof ValidationError || ValidationHandler.isValidationError(error)) {
        return this.handleValidationError(error, context);
      }

      // Handle database errors (common patterns)
      if (error.name?.includes('Database') || 
          error.code?.startsWith('ER_') || 
          error.code?.startsWith('SQLITE_')) {
        const dbError = this.handleDatabaseError(error, requestContext);
        this.logError(dbError, requestContext);
        return createEnvironmentAwareErrorResponse(
          dbError,
          requestContext.requestId,
          this.config.isProduction
        );
      }

      // Classify and handle unknown errors
      const classifiedError = this.classifyUnknownError(error, requestContext);
      this.logError(classifiedError, requestContext);
      
      return createEnvironmentAwareErrorResponse(
        classifiedError,
        requestContext.requestId,
        this.config.isProduction
      );

    } catch (handlerError) {
      // If error handling itself fails, create a safe fallback response
      const errorMessage = handlerError instanceof Error ? handlerError.message : 'Unknown handler error';
      this.logger.error('Error handler failed', {
        requestId: requestContext.requestId,
        originalError: error.message,
        handlerError: errorMessage,
      });

      const fallbackError = new InternalServerError(
        'Error processing request',
        undefined,
        requestContext.requestId
      );

      return createEnvironmentAwareErrorResponse(
        fallbackError,
        requestContext.requestId,
        this.config.isProduction
      );
    }
  }

  // Add custom error handler
  public addCustomHandler(errorCode: string, handler: (error: AppError, context: Context) => ErrorResponse): void {
    this.config.customErrorHandlers.set(errorCode, handler);
  }

  // Remove custom error handler
  public removeCustomHandler(errorCode: string): void {
    this.config.customErrorHandlers.delete(errorCode);
  }

  // Update configuration
  public updateConfig(newConfig: Partial<ErrorHandlerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.logger) {
      this.logger = newConfig.logger;
    }
  }

  // Helper format error handling methods
  
  /**
   * Handle error and return response.helper format
   * @param error - Error to handle
   * @param context - Elysia context
   * @returns Helper format response
   */
  public async handleErrorHelper(error: any, context: Context): Promise<HelperApiResponse> {
    console.log('🔍 handleErrorHelper called with error type:', error?.constructor?.name);
    console.log('🔍 handleErrorHelper error message:', error?.message);
    console.log('🔍 isAppError(error):', isAppError(error));
    console.log('🔍 error instanceof ValidationError:', error instanceof ValidationError);
    
    const requestContext = this.extractRequestContext(context);

    try {
      // Handle AppError instances
      if (isAppError(error)) {
        console.log('🔍 Handling as AppError');
        this.logError(error, requestContext);
        const result = createHelperErrorResponse(error, requestContext.requestId);
        console.log('🔍 createHelperErrorResponse returned:', JSON.stringify(result, null, 2));
        return result;
      }

      // Handle validation errors
      if (error instanceof ValidationError || ValidationHandler.isValidationError(error)) {
        console.log('🔍 Handling as ValidationError');
        let validationError: ValidationError;
        
        if (error instanceof ValidationError) {
          validationError = error;
        } else if (ValidationHandler.isValidationError(error)) {
          validationError = ValidationHandler.fromElysiaError(error);
        } else {
          validationError = new ValidationError('Validation failed', [{
            field: 'unknown',
            message: error?.message || 'Validation failed',
            code: 'validation_error',
          }]);
        }

        this.logError(validationError, requestContext);
        const result = createHelperValidationErrorResponse(
          validationError.message,
          validationError.details,
          requestContext.requestId
        );
        console.log('🔍 createHelperValidationErrorResponse returned:', JSON.stringify(result, null, 2));
        return result;
      }

      // Handle database errors
      if (error.name?.includes('Database') || 
          error.code?.startsWith('ER_') || 
          error.code?.startsWith('SQLITE_')) {
        const dbError = this.handleDatabaseError(error, requestContext);
        this.logError(dbError, requestContext);
        return createHelperErrorResponse(dbError, requestContext.requestId);
      }

      // Classify and handle unknown errors
      console.log('🔍 Handling as unknown error, creating classified error');
      const classifiedError = this.classifyUnknownError(error, requestContext);
      this.logError(classifiedError, requestContext);
      const result = createHelperErrorResponse(classifiedError, requestContext.requestId);
      console.log('🔍 createHelperErrorResponse (unknown) returned:', JSON.stringify(result, null, 2));
      return result;

    } catch (handlerError) {
      // Fallback error handling
      const errorMessage = handlerError instanceof Error ? handlerError.message : 'Unknown handler error';
      this.logger.error('Error handler failed', {
        requestId: requestContext.requestId,
        originalError: error.message,
        handlerError: errorMessage,
      });

      const fallbackError = new InternalServerError(
        'Error processing request',
        undefined,
        requestContext.requestId
      );

      return createHelperErrorResponse(fallbackError, requestContext.requestId);
    }
  }

  /**
   * Create a success response using helper format
   * @param message - Success message
   * @param data - Optional data payload
   * @param context - Optional Elysia context for request ID
   * @returns Helper format success response
   */
  public createSuccessHelper<T>(
    message: string,
    data?: T,
    context?: Context
  ): HelperApiResponse<T> {
    const requestId = context ? this.extractRequestContext(context).requestId : undefined;
    return createHelperSuccessResponse(message, data, requestId);
  }
}

// Create default error handler instance
export const defaultErrorHandler = new ErrorHandler();

// Create default helper format error handler instance
export const defaultHelperErrorHandler = new ErrorHandler();

// Elysia error handler function (helper format)
export function createElysiaHelperErrorHandler(config?: ErrorHandlerConfig) {
  console.log('🔍 createElysiaHelperErrorHandler function created');
  const errorHandler = new ErrorHandler(config);
  
  return async (context: any) => {
    console.log('🔍 ===== ELYSIA HELPER ERROR HANDLER CALLED =====');
    console.log('🔍 createElysiaHelperErrorHandler called with error:', context.error?.constructor?.name, context.error?.message);
    
    const helperResponse = await errorHandler.handleErrorHelper(context.error, context);
    
    console.log('🔍 handleErrorHelper returned:', JSON.stringify(helperResponse, null, 2));
    console.log('🔍 Response has keys:', Object.keys(helperResponse));
    console.log('🔍 Response has code:', 'code' in helperResponse);
    console.log('🔍 Response has success:', 'success' in helperResponse);
    console.log('🔍 ===== END ELYSIA HELPER ERROR HANDLER =====');
    
    context.set.status = helperResponse.code;
    return helperResponse;
  };
}