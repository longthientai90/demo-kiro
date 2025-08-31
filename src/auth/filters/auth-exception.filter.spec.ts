import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus, BadRequestException, UnauthorizedException, ConflictException } from '@nestjs/common';
import { AuthExceptionFilter } from './auth-exception.filter';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { MongoError } from 'mongodb';

describe('AuthExceptionFilter', () => {
  let filter: AuthExceptionFilter;
  let mockResponse: any;
  let mockRequest: any;
  let mockHost: any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AuthExceptionFilter],
    }).compile();

    filter = module.get<AuthExceptionFilter>(AuthExceptionFilter);

    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock request object
    mockRequest = {
      url: '/auth/login',
      method: 'POST',
    };

    // Mock ArgumentsHost
    mockHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: jest.fn().mockReturnValue(mockResponse),
        getRequest: jest.fn().mockReturnValue(mockRequest),
      }),
    };
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  describe('HTTP Exceptions', () => {
    it('should handle BadRequestException with validation errors', () => {
      const exception = new BadRequestException({
        message: ['Email is required', 'Password must be at least 8 characters'],
        error: 'Bad Request',
        statusCode: 400,
      });

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.BAD_REQUEST,
          message: 'Validation failed',
          errors: expect.any(Array),
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });

    it('should handle UnauthorizedException with generic message', () => {
      const exception = new UnauthorizedException('Invalid credentials');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Authentication failed',
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });

    it('should handle ConflictException', () => {
      const exception = new ConflictException('User with this email already exists');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'User with this email already exists',
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });
  });

  describe('JWT Exceptions', () => {
    it('should handle JsonWebTokenError', () => {
      const exception = new JsonWebTokenError('invalid signature');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Authentication failed',
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });

    it('should handle TokenExpiredError', () => {
      const exception = new TokenExpiredError('jwt expired', new Date());

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.UNAUTHORIZED,
          message: 'Authentication failed',
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });
  });

  describe('Database Exceptions', () => {
    it('should handle MongoDB duplicate key error', () => {
      const exception = new MongoError('E11000 duplicate key error');
      (exception as any).code = 11000;
      (exception as any).keyValue = { userName: 'test@example.com' };

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.CONFLICT,
          message: 'User with this email already exists',
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });

    it('should handle generic MongoDB errors', () => {
      const exception = new MongoError('Connection failed');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Database operation failed',
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });
  });

  describe('Generic Exceptions', () => {
    it('should handle generic Error', () => {
      const exception = new Error('Something went wrong');

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });

    it('should handle unknown exceptions', () => {
      const exception = 'unknown error';

      filter.catch(exception, mockHost);

      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          timestamp: expect.any(String),
          path: '/auth/login',
        })
      );
    });
  });
});