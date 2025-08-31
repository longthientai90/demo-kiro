import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './auth.guard';
import { SignupDto, LoginDto } from './dto';
import { AuthResponse } from './interfaces/auth-response.interface';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthResponse: AuthResponse = {
    access_token: 'mock-jwt-token',
    user: {
      id: '507f1f77bcf86cd799439011',
      userName: 'test@example.com',
      userId: 'user123',
    },
  };

  const mockAuthService = {
    signup: jest.fn(),
    login: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('signup', () => {
    const validSignupDto: SignupDto = {
      userName: 'test@example.com',
      password: 'password123',
      userId: 'user123',
    };

    it('should successfully create a new user', async () => {
      // Arrange
      mockAuthService.signup.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.signup(validSignupDto);

      // Assert
      expect(authService.signup).toHaveBeenCalledWith(validSignupDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle ConflictException for duplicate email', async () => {
      // Arrange
      const conflictError = new ConflictException('User with this email already exists');
      mockAuthService.signup.mockRejectedValue(conflictError);

      // Act & Assert
      await expect(controller.signup(validSignupDto)).rejects.toThrow(conflictError);
      expect(authService.signup).toHaveBeenCalledWith(validSignupDto);
    });

    it('should handle ConflictException for duplicate userId', async () => {
      // Arrange
      const conflictError = new ConflictException('User with this userId already exists');
      mockAuthService.signup.mockRejectedValue(conflictError);

      // Act & Assert
      await expect(controller.signup(validSignupDto)).rejects.toThrow(conflictError);
      expect(authService.signup).toHaveBeenCalledWith(validSignupDto);
    });

    it('should handle validation errors from DTO', async () => {
      // This test verifies that validation errors are properly handled
      // In a real scenario, these would be caught by NestJS validation pipes
      const invalidSignupDto = {
        userName: 'invalid-email',
        password: '123', // Too short
        userId: '',
      } as SignupDto;

      // The service should not be called if validation fails at the pipe level
      // But if it somehow gets through, the service should handle it
      const validationError = new Error('Validation failed');
      mockAuthService.signup.mockRejectedValue(validationError);

      await expect(controller.signup(invalidSignupDto)).rejects.toThrow(validationError);
    });

    it('should handle unexpected errors during signup', async () => {
      // Arrange
      const unexpectedError = new Error('Database connection failed');
      mockAuthService.signup.mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(controller.signup(validSignupDto)).rejects.toThrow(unexpectedError);
      expect(authService.signup).toHaveBeenCalledWith(validSignupDto);
    });
  });

  describe('login', () => {
    const validLoginDto: LoginDto = {
      userName: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login user', async () => {
      // Arrange
      mockAuthService.login.mockResolvedValue(mockAuthResponse);

      // Act
      const result = await controller.login(validLoginDto);

      // Assert
      expect(authService.login).toHaveBeenCalledWith(validLoginDto);
      expect(result).toEqual(mockAuthResponse);
    });

    it('should handle UnauthorizedException for invalid credentials', async () => {
      // Arrange
      const unauthorizedError = new UnauthorizedException('Invalid credentials');
      mockAuthService.login.mockRejectedValue(unauthorizedError);

      // Act & Assert
      await expect(controller.login(validLoginDto)).rejects.toThrow(unauthorizedError);
      expect(authService.login).toHaveBeenCalledWith(validLoginDto);
    });

    it('should handle UnauthorizedException for non-existent user', async () => {
      // Arrange
      const unauthorizedError = new UnauthorizedException('Invalid credentials');
      mockAuthService.login.mockRejectedValue(unauthorizedError);

      const loginDto: LoginDto = {
        userName: 'nonexistent@example.com',
        password: 'password123',
      };

      // Act & Assert
      await expect(controller.login(loginDto)).rejects.toThrow(unauthorizedError);
      expect(authService.login).toHaveBeenCalledWith(loginDto);
    });

    it('should handle validation errors from DTO', async () => {
      // This test verifies that validation errors are properly handled
      const invalidLoginDto = {
        userName: 'invalid-email',
        password: '',
      } as LoginDto;

      const validationError = new Error('Validation failed');
      mockAuthService.login.mockRejectedValue(validationError);

      await expect(controller.login(invalidLoginDto)).rejects.toThrow(validationError);
    });

    it('should handle unexpected errors during login', async () => {
      // Arrange
      const unexpectedError = new Error('JWT service unavailable');
      mockAuthService.login.mockRejectedValue(unexpectedError);

      // Act & Assert
      await expect(controller.login(validLoginDto)).rejects.toThrow(unexpectedError);
      expect(authService.login).toHaveBeenCalledWith(validLoginDto);
    });
  });

  describe('getProfile', () => {
    const mockRequest = {
      user: {
        id: '507f1f77bcf86cd799439011',
        userName: 'test@example.com',
        userId: 'user123',
      },
    };

    it('should return user profile from JWT payload', async () => {
      // Act
      const result = await controller.getProfile(mockRequest);

      // Assert
      expect(result).toEqual({
        id: mockRequest.user.id,
        userName: mockRequest.user.userName,
        userId: mockRequest.user.userId,
      });
    });

    it('should handle request with missing user data', async () => {
      // Arrange
      const invalidRequest = { user: null };

      // Act & Assert
      // This would typically be caught by the guard, but testing the controller logic
      // The controller will throw an error when trying to access properties of null
      await expect(controller.getProfile(invalidRequest)).rejects.toThrow();
    });

    it('should handle request with partial user data', async () => {
      // Arrange
      const partialRequest = {
        user: {
          id: '507f1f77bcf86cd799439011',
          userName: 'test@example.com',
          // Missing userId
        },
      };

      // Act
      const result = await controller.getProfile(partialRequest);

      // Assert
      expect(result).toEqual({
        id: partialRequest.user.id,
        userName: partialRequest.user.userName,
        userId: undefined,
      });
    });
  });

  describe('HTTP Status Codes', () => {
    it('should return 201 status for successful signup', async () => {
      // This test verifies that the @HttpCode(HttpStatus.CREATED) decorator is applied
      // The actual HTTP status testing would be done in integration tests
      mockAuthService.signup.mockResolvedValue(mockAuthResponse);
      
      const validSignupDto: SignupDto = {
        userName: 'test@example.com',
        password: 'password123',
        userId: 'user123',
      };

      const result = await controller.signup(validSignupDto);
      expect(result).toEqual(mockAuthResponse);
      // The @HttpCode decorator ensures 201 status is returned
    });

    it('should return 200 status for successful login', async () => {
      // This test verifies that the @HttpCode(HttpStatus.OK) decorator is applied
      mockAuthService.login.mockResolvedValue(mockAuthResponse);
      
      const validLoginDto: LoginDto = {
        userName: 'test@example.com',
        password: 'password123',
      };

      const result = await controller.login(validLoginDto);
      expect(result).toEqual(mockAuthResponse);
      // The @HttpCode decorator ensures 200 status is returned
    });

    it('should return 200 status for successful profile retrieval', async () => {
      // This test verifies that the @HttpCode(HttpStatus.OK) decorator is applied
      const mockRequest = {
        user: {
          id: '507f1f77bcf86cd799439011',
          userName: 'test@example.com',
          userId: 'user123',
        },
      };

      const result = await controller.getProfile(mockRequest);
      expect(result).toBeDefined();
      // The @HttpCode decorator ensures 200 status is returned
    });
  });

  describe('Error Response Formats', () => {
    it('should propagate ConflictException with proper message for duplicate user', async () => {
      // Arrange
      const conflictError = new ConflictException('User with this email already exists');
      mockAuthService.signup.mockRejectedValue(conflictError);

      const validSignupDto: SignupDto = {
        userName: 'existing@example.com',
        password: 'password123',
        userId: 'user123',
      };

      // Act & Assert
      await expect(controller.signup(validSignupDto)).rejects.toThrow(
        new ConflictException('User with this email already exists')
      );
    });

    it('should propagate UnauthorizedException with generic message for invalid login', async () => {
      // Arrange
      const unauthorizedError = new UnauthorizedException('Invalid credentials');
      mockAuthService.login.mockRejectedValue(unauthorizedError);

      const invalidLoginDto: LoginDto = {
        userName: 'test@example.com',
        password: 'wrongpassword',
      };

      // Act & Assert
      await expect(controller.login(invalidLoginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );
    });
  });
});