import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtAuthGuard } from './auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtAuthGuard],
    }).compile();

    guard = module.get<JwtAuthGuard>(JwtAuthGuard);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  describe('canActivate', () => {
    it('should call parent canActivate method', () => {
      // Arrange
      const mockContext = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue({
            headers: {
              authorization: 'Bearer valid-token',
            },
          }),
        }),
      } as unknown as ExecutionContext;

      // Mock the parent canActivate method
      const parentCanActivateSpy = jest.spyOn(Object.getPrototypeOf(Object.getPrototypeOf(guard)), 'canActivate');
      parentCanActivateSpy.mockReturnValue(true);

      // Act
      const result = guard.canActivate(mockContext);

      // Assert
      expect(parentCanActivateSpy).toHaveBeenCalledWith(mockContext);
      expect(result).toBe(true);

      // Cleanup
      parentCanActivateSpy.mockRestore();
    });
  });

  describe('handleRequest', () => {
    it('should return user when authentication is successful', () => {
      // Arrange
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        userName: 'test@example.com',
        userId: 'user123',
      };

      // Act
      const result = guard.handleRequest(null, mockUser, null);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should throw UnauthorizedException when no token is provided', () => {
      // Arrange
      const info = { message: 'No auth token' };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('No token provided')
      );
    });

    it('should throw UnauthorizedException when token is expired', () => {
      // Arrange
      const info = { name: 'TokenExpiredError' };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Token has expired')
      );
    });

    it('should throw UnauthorizedException for invalid token format', () => {
      // Arrange
      const info = { name: 'JsonWebTokenError' };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should throw UnauthorizedException for malformed token', () => {
      // Arrange
      const info = { message: 'jwt malformed' };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Invalid token format')
      );
    });

    it('should throw UnauthorizedException for invalid signature', () => {
      // Arrange
      const info = { message: 'invalid signature' };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Invalid token signature')
      );
    });

    it('should throw UnauthorizedException when error is present', () => {
      // Arrange
      const error = new Error('Authentication error');

      // Act & Assert
      expect(() => guard.handleRequest(error, null, null)).toThrow(
        new UnauthorizedException('Authentication failed')
      );
    });

    it('should throw UnauthorizedException when user is null without specific info', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should throw UnauthorizedException when user is undefined', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, undefined, null)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should handle multiple error conditions with error taking precedence', () => {
      // Arrange
      const error = new Error('Primary error');
      const info = { message: 'No auth token' };

      // Act & Assert
      expect(() => guard.handleRequest(error, null, info)).toThrow(
        new UnauthorizedException('Authentication failed')
      );
    });

    it('should handle info with unknown error type', () => {
      // Arrange
      const info = { message: 'Unknown JWT error', name: 'UnknownError' };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should return user even when info is present but user exists', () => {
      // Arrange
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        userName: 'test@example.com',
        userId: 'user123',
      };
      const info = { message: 'Some info message' };

      // Act
      const result = guard.handleRequest(null, mockUser, info);

      // Assert
      expect(result).toEqual(mockUser);
    });

    it('should handle empty info object', () => {
      // Arrange
      const info = {};

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should handle info with empty message', () => {
      // Arrange
      const info = { message: '' };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should handle info with empty name', () => {
      // Arrange
      const info = { name: '' };

      // Act & Assert
      expect(() => guard.handleRequest(null, null, info)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should prioritize specific JWT error messages over generic ones', () => {
      // Test that specific error messages are handled correctly
      const testCases = [
        { info: { message: 'No auth token' }, expectedMessage: 'No token provided' },
        { info: { name: 'TokenExpiredError' }, expectedMessage: 'Token has expired' },
        { info: { name: 'JsonWebTokenError' }, expectedMessage: 'Invalid token' },
        { info: { message: 'jwt malformed' }, expectedMessage: 'Invalid token format' },
        { info: { message: 'invalid signature' }, expectedMessage: 'Invalid token signature' },
      ];

      testCases.forEach(({ info, expectedMessage }) => {
        expect(() => guard.handleRequest(null, null, info)).toThrow(
          new UnauthorizedException(expectedMessage)
        );
      });
    });
  });

  describe('Error handling edge cases', () => {
    it('should handle null error and null user with null info', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, null, null)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should handle false user value', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, false as any, null)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should handle empty string user value', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, '' as any, null)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should handle zero user value', () => {
      // Act & Assert
      expect(() => guard.handleRequest(null, 0 as any, null)).toThrow(
        new UnauthorizedException('Authentication required')
      );
    });

    it('should return valid user object even if it has falsy properties', () => {
      // Arrange
      const mockUser = {
        id: '507f1f77bcf86cd799439011',
        userName: '',  // Empty string but user object exists
        userId: 'user123',
      };

      // Act
      const result = guard.handleRequest(null, mockUser, null);

      // Assert
      expect(result).toEqual(mockUser);
    });
  });
});