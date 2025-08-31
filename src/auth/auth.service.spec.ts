import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { getModelToken } from '@nestjs/mongoose';
import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Account } from '../accounts/accounts.model';
import { SignupDto, LoginDto } from './dto';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;
  let accountModel: any;

  const mockAccount = {
    id: '507f1f77bcf86cd799439011',
    userId: 'user123',
    userName: 'test@example.com',
    password: 'hashedPassword123',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn(),
    comparePassword: jest.fn(),
  };

  // Create a proper mock constructor function
  const MockAccountModel: any = jest.fn().mockImplementation(() => ({
    ...mockAccount,
    save: jest.fn().mockResolvedValue(mockAccount),
  }));
  
  // Add static methods to the constructor
  MockAccountModel.findOne = jest.fn();

  const mockJwtService = {
    sign: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: getModelToken('Account'),
          useValue: MockAccountModel,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
    accountModel = module.get(getModelToken('Account'));

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('signup', () => {
    const validSignupDto: SignupDto = {
      userName: 'test@example.com',
      password: 'password123',
      userId: 'user123',
    };

    it('should successfully create a new user and return auth response', async () => {
      // Arrange
      MockAccountModel.findOne.mockResolvedValue(null); // No existing user
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await service.signup(validSignupDto);

      // Assert
      expect(MockAccountModel.findOne).toHaveBeenCalledTimes(2);
      expect(MockAccountModel.findOne).toHaveBeenCalledWith({ userName: 'test@example.com' });
      expect(MockAccountModel.findOne).toHaveBeenCalledWith({ userId: 'user123' });
      expect(MockAccountModel).toHaveBeenCalledWith({
        userName: 'test@example.com',
        password: 'password123',
        userId: 'user123',
      });
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          id: mockAccount.id,
          userName: mockAccount.userName,
          userId: mockAccount.userId,
        },
      });
    });

    it('should throw ConflictException when user with email already exists', async () => {
      // Arrange
      MockAccountModel.findOne.mockResolvedValueOnce(mockAccount); // Existing user by email

      // Act & Assert
      await expect(service.signup(validSignupDto)).rejects.toThrow(
        new ConflictException('User with this email already exists')
      );
      expect(MockAccountModel.findOne).toHaveBeenCalledWith({ userName: 'test@example.com' });
    });

    it('should throw ConflictException when user with userId already exists', async () => {
      // Arrange
      MockAccountModel.findOne
        .mockResolvedValueOnce(null) // No user by email
        .mockResolvedValueOnce(mockAccount); // Existing user by userId

      // Act & Assert
      await expect(service.signup(validSignupDto)).rejects.toThrow(
        new ConflictException('User with this userId already exists')
      );
      expect(MockAccountModel.findOne).toHaveBeenCalledWith({ userId: 'user123' });
    });

    it('should handle JWT token generation failure', async () => {
      // Arrange
      MockAccountModel.findOne.mockResolvedValue(null);
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      // Act & Assert
      await expect(service.signup(validSignupDto)).rejects.toThrow('Failed to generate JWT token');
    });
  });

  describe('login', () => {
    const validLoginDto: LoginDto = {
      userName: 'test@example.com',
      password: 'password123',
    };

    it('should successfully login user and return auth response', async () => {
      // Arrange
      const mockUserWithCompare = {
        ...mockAccount,
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      MockAccountModel.findOne.mockResolvedValue(mockUserWithCompare);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      // Act
      const result = await service.login(validLoginDto);

      // Assert
      expect(MockAccountModel.findOne).toHaveBeenCalledWith({ userName: 'test@example.com' });
      expect(mockUserWithCompare.comparePassword).toHaveBeenCalledWith('password123');
      expect(mockJwtService.sign).toHaveBeenCalled();
      expect(result).toEqual({
        access_token: 'mock-jwt-token',
        user: {
          id: mockAccount.id,
          userName: mockAccount.userName,
          userId: mockAccount.userId,
        },
      });
    });

    it('should throw UnauthorizedException when user does not exist', async () => {
      // Arrange
      MockAccountModel.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(service.login(validLoginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );
      expect(MockAccountModel.findOne).toHaveBeenCalledWith({ userName: 'test@example.com' });
    });

    it('should throw UnauthorizedException when password is incorrect', async () => {
      // Arrange
      const mockUserWithCompare = {
        ...mockAccount,
        comparePassword: jest.fn().mockResolvedValue(false),
      };
      MockAccountModel.findOne.mockResolvedValue(mockUserWithCompare);

      // Act & Assert
      await expect(service.login(validLoginDto)).rejects.toThrow(
        new UnauthorizedException('Invalid credentials')
      );
      expect(mockUserWithCompare.comparePassword).toHaveBeenCalledWith('password123');
    });

    it('should handle JWT token generation failure during login', async () => {
      // Arrange
      const mockUserWithCompare = {
        ...mockAccount,
        comparePassword: jest.fn().mockResolvedValue(true),
      };
      MockAccountModel.findOne.mockResolvedValue(mockUserWithCompare);
      mockJwtService.sign.mockImplementation(() => {
        throw new Error('JWT signing failed');
      });

      // Act & Assert
      await expect(service.login(validLoginDto)).rejects.toThrow('Failed to generate JWT token');
    });
  });

  describe('generateJwtToken (private method testing through public methods)', () => {
    it('should generate JWT token with correct payload structure', async () => {
      // Arrange
      MockAccountModel.findOne.mockResolvedValue(null);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const signupDto: SignupDto = {
        userName: 'test@example.com',
        password: 'password123',
        userId: 'user123',
      };

      // Act
      await service.signup(signupDto);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: mockAccount.id,
          userName: mockAccount.userName,
          userId: mockAccount.userId,
          iat: expect.any(Number),
          exp: expect.any(Number),
        }),
        {
          expiresIn: '24h',
          issuer: 'auth-api',
        }
      );
    });

    it('should set correct expiration time (24 hours)', async () => {
      // Arrange
      const mockTime = 1640995200; // Mock timestamp
      jest.spyOn(Date, 'now').mockReturnValue(mockTime * 1000);
      
      MockAccountModel.findOne.mockResolvedValue(null);
      mockJwtService.sign.mockReturnValue('mock-jwt-token');

      const signupDto: SignupDto = {
        userName: 'test@example.com',
        password: 'password123',
        userId: 'user123',
      };

      // Act
      await service.signup(signupDto);

      // Assert
      expect(mockJwtService.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          iat: mockTime,
          exp: mockTime + (24 * 60 * 60), // 24 hours later
        }),
        expect.any(Object)
      );

      // Restore Date.now
      jest.restoreAllMocks();
    });
  });
});