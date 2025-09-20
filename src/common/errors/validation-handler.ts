import { ValidationError } from './app-error';

export interface ValidationErrorDetail {
  field: string;
  message: string;
  value?: any;
  code?: string;
}

export class ValidationHandler {
  // Extract validation errors from Elysia context
  static extractValidationErrors(error: any): ValidationErrorDetail[] {
    const errors: ValidationErrorDetail[] = [];

    // Handle Elysia validation errors
    if (error?.validator) {
      // Elysia uses TypeBox for validation
      if (error.validator.Errors) {
        for (const validationError of error.validator.Errors(error.value || {})) {
          errors.push({
            field: validationError.path.replace(/^\//, ''), // Remove leading slash
            message: validationError.message || 'Validation failed',
            value: validationError.value,
            code: validationError.type || 'validation_error',
          });
        }
      }
    }

    // Handle TypeBox validation errors directly
    if (error?.type === 'validation') {
      if (error.errors && Array.isArray(error.errors)) {
        for (const validationError of error.errors) {
          errors.push({
            field: validationError.path?.replace(/^\//, '') || 'unknown',
            message: validationError.message || 'Validation failed',
            value: validationError.value,
            code: validationError.type || 'validation_error',
          });
        }
      }
    }

    // Handle generic validation error structure
    if (error?.details && Array.isArray(error.details)) {
      for (const detail of error.details) {
        errors.push({
          field: detail.field || detail.path?.replace(/^\//, '') || 'unknown',
          message: detail.message || 'Validation failed',
          value: detail.value,
          code: detail.code || detail.type || 'validation_error',
        });
      }
    }

    return errors;
  }

  // Check if an error is a validation error
  static isValidationError(error: any): boolean {
    return (
      error?.type === 'validation' ||
      error?.validator ||
      (error?.details && Array.isArray(error.details)) ||
      error instanceof ValidationError
    );
  }

  // Convert Elysia validation error to ValidationError
  static fromElysiaError(error: any): ValidationError {
    const details = this.extractValidationErrors(error);
    
    if (details.length === 0) {
      // Fallback for unrecognized validation error format
      details.push({
        field: 'unknown',
        message: error?.message || 'Validation failed',
        code: 'validation_error',
      });
    }

    return new ValidationError(
      error?.message || 'Validation failed',
      details
    );
  }

  // Format validation errors for response
  static formatValidationErrors(errors: ValidationErrorDetail[]): {
    message: string;
    details: ValidationErrorDetail[];
    fieldCount: number;
  } {
    const fieldCount = new Set(errors.map(e => e.field)).size;
    const message = fieldCount === 1 
      ? `Validation failed for field: ${errors[0].field}`
      : `Validation failed for ${fieldCount} field${fieldCount > 1 ? 's' : ''}`;

    return {
      message,
      details: errors,
      fieldCount,
    };
  }
}

// Helper function to throw validation error
export function throwValidationError(errors: ValidationErrorDetail[]): never {
  throw new ValidationError('Validation failed', errors);
}

// Helper function to create validation error from Elysia context
export function createValidationErrorFromContext(error: any): ValidationError {
  return ValidationHandler.fromElysiaError(error);
}

// Default validation handler instance
export const validationHandler = new ValidationHandler();