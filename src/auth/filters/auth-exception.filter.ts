import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { Response } from 'express';
import { ValidationError } from 'class-validator';
import { MongoError } from 'mongodb';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Catch()
export class AuthExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(AuthExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let errors: any = null;

    // Handle HTTP exceptions (NestJS built-in exceptions)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (exception instanceof BadRequestException) {
        // Handle validation errors
        if (typeof exceptionResponse === 'object' && 'message' in exceptionResponse) {
          const responseMessage = (exceptionResponse as any).message;
          if (Array.isArray(responseMessage)) {
            // Detailed validation error messages (Requirement 5.2)
            message = 'Validation failed';
            errors = this.formatValidationErrors(responseMessage);
          } else {
            message = responseMessage;
          }
        } else {
          message = 'Bad request';
        }
      } else if (exception instanceof UnauthorizedException) {
        // Generic error messages for authentication failures (Requirement 5.3)
        message = 'Authentication failed';
      } else if (exception instanceof ConflictException) {
        // Handle duplicate user errors
        message = exception.message;
      } else {
        message = typeof exceptionResponse === 'string' 
          ? exceptionResponse 
          : (exceptionResponse as any).message || exception.message;
      }
    }
    // Handle JWT-specific errors
    else if (exception instanceof JsonWebTokenError) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Authentication failed'; // Generic message (Requirement 5.3)
      this.logger.warn(`JWT Error: ${exception.message}`, {
        path: request.url,
        method: request.method,
      });
    }
    else if (exception instanceof TokenExpiredError) {
      status = HttpStatus.UNAUTHORIZED;
      message = 'Authentication failed'; // Generic message (Requirement 5.3)
      this.logger.warn(`Token expired: ${exception.message}`, {
        path: request.url,
        method: request.method,
      });
    }
    // Handle MongoDB/Database errors
    else if (exception instanceof MongoError) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Database operation failed';
      
      // Handle specific MongoDB errors
      if (exception.code === 11000) {
        // Duplicate key error
        status = HttpStatus.CONFLICT;
        message = this.formatDuplicateKeyError(exception);
      }
      
      // Log detailed error for server errors (Requirement 5.4)
      this.logger.error(`Database Error: ${exception.message}`, {
        code: exception.code,
        path: request.url,
        method: request.method,
        stack: exception.stack,
      });
    }
    // Handle validation errors from class-validator
    else if (Array.isArray(exception) && exception[0] instanceof ValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Validation failed';
      errors = this.formatClassValidatorErrors(exception as ValidationError[]);
    }
    // Handle generic errors
    else if (exception instanceof Error) {
      // Log detailed error for server errors (Requirement 5.4)
      this.logger.error(`Unexpected Error: ${exception.message}`, {
        path: request.url,
        method: request.method,
        stack: exception.stack,
      });
      
      // Return generic error response (Requirement 5.4)
      message = 'Internal server error';
    }
    // Handle unknown exceptions
    else {
      this.logger.error(`Unknown Exception:`, {
        exception,
        path: request.url,
        method: request.method,
      });
      message = 'Internal server error';
    }

    // Construct error response with appropriate HTTP status codes (Requirement 5.1)
    const errorResponse: any = {
      statusCode: status,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    // Include detailed errors for validation failures (Requirement 5.2)
    if (errors) {
      errorResponse.errors = errors;
    }

    response.status(status).json(errorResponse);
  }

  /**
   * Format validation errors from NestJS ValidationPipe
   */
  private formatValidationErrors(validationErrors: string[]): any {
    return validationErrors.map(error => ({
      message: error,
    }));
  }

  /**
   * Format validation errors from class-validator
   */
  private formatClassValidatorErrors(validationErrors: ValidationError[]): any {
    const errors: any = {};
    
    validationErrors.forEach(error => {
      if (error.constraints) {
        errors[error.property] = Object.values(error.constraints);
      }
      
      // Handle nested validation errors
      if (error.children && error.children.length > 0) {
        errors[error.property] = this.formatClassValidatorErrors(error.children);
      }
    });
    
    return errors;
  }

  /**
   * Format MongoDB duplicate key errors
   */
  private formatDuplicateKeyError(error: MongoError): string {
    const keyValue = (error as any).keyValue;
    
    if (keyValue) {
      if (keyValue.userName) {
        return 'User with this email already exists';
      }
      if (keyValue.userId) {
        return 'User with this userId already exists';
      }
    }
    
    return 'Duplicate entry detected';
  }
}