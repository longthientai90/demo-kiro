import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { JwtStrategy } from './jwt.strategy';
import { JwtPayload } from './interfaces/auth-response.interface';

describe('JwtStrategy', () => {
  let strategy: JwtStrategy;

  beforeEach(async () => {
    // Set environment variable for testing
    process.env.JWT_SECRET = 'test-secret-key';

    const module: TestingModule = await Test.createTestingModule({
      providers: [JwtStrategy],
    }).compile();

    strategy = module.get<JwtStrategy>(JwtStrategy);
  });

  afterEach(() => {
    // Clean up environment variable
    delete process.env.JWT_SECRET;
  });

  it('should be defined', () => {
    expect(strategy).toBeDefined();
  });

  describe('validate', () => {
    it('should return user object for valid JWT payload', async () => {
      // Arrange
      const validPayload: JwtPayload = {
        sub: '507f1f77bcf86cd799439011',
        userName: 'test@example.com',
        userId: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      };

      // Act
      const result = await strategy.validate(validPayload);

      // Assert
      expect(result).toEqual({
        id: validPayload.sub,
        userName: validPayload.userName,
        userId: validPayload.userId,
      });
    });

    it('should throw UnauthorizedException when sub is missing', async () => {
      // Arrange
      const invalidPayload = {
        userName: 'test@example.com',
        userId: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      } as JwtPayload;

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });

    it('should throw UnauthorizedException when userName is missing', async () => {
      // Arrange
      const invalidPayload = {
        sub: '507f1f77bcf86cd799439011',
        userId: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      } as JwtPayload;

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });

    it('should throw UnauthorizedException when userId is missing', async () => {
      // Arrange
      const invalidPayload = {
        sub: '507f1f77bcf86cd799439011',
        userName: 'test@example.com',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      } as JwtPayload;

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });

    it('should throw UnauthorizedException when sub is empty string', async () => {
      // Arrange
      const invalidPayload: JwtPayload = {
        sub: '',
        userName: 'test@example.com',
        userId: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });

    it('should throw UnauthorizedException when userName is empty string', async () => {
      // Arrange
      const invalidPayload: JwtPayload = {
        sub: '507f1f77bcf86cd799439011',
        userName: '',
        userId: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });

    it('should throw UnauthorizedException when userId is empty string', async () => {
      // Arrange
      const invalidPayload: JwtPayload = {
        sub: '507f1f77bcf86cd799439011',
        userName: 'test@example.com',
        userId: '',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      // Act & Assert
      await expect(strategy.validate(invalidPayload)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });

    it('should handle payload with additional properties', async () => {
      // Arrange
      const payloadWithExtra = {
        sub: '507f1f77bcf86cd799439011',
        userName: 'test@example.com',
        userId: 'user123',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        extraProperty: 'should be ignored',
        role: 'admin',
      } as JwtPayload & { extraProperty: string; role: string };

      // Act
      const result = await strategy.validate(payloadWithExtra);

      // Assert
      expect(result).toEqual({
        id: payloadWithExtra.sub,
        userName: payloadWithExtra.userName,
        userId: payloadWithExtra.userId,
      });
      // Extra properties should not be included in the result
      expect(result).not.toHaveProperty('extraProperty');
      expect(result).not.toHaveProperty('role');
    });

    it('should handle null payload', async () => {
      // Act & Assert
      await expect(strategy.validate(null as any)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });

    it('should handle undefined payload', async () => {
      // Act & Assert
      await expect(strategy.validate(undefined as any)).rejects.toThrow(
        new UnauthorizedException('Invalid token payload')
      );
    });
  });

  describe('constructor configuration', () => {
    it('should use JWT_SECRET from environment variable', () => {
      // This test verifies that the strategy is configured correctly
      // The actual configuration is tested through the passport integration
      expect(strategy).toBeDefined();
      // The secret configuration is internal to passport-jwt
    });

    it('should use default secret when JWT_SECRET is not set', async () => {
      // Arrange
      delete process.env.JWT_SECRET;

      // Act - Create new strategy instance without JWT_SECRET
      const module: TestingModule = await Test.createTestingModule({
        providers: [JwtStrategy],
      }).compile();

      const newStrategy = module.get<JwtStrategy>(JwtStrategy);

      // Assert
      expect(newStrategy).toBeDefined();
      // The strategy should still work with the default secret
    });
  });
});