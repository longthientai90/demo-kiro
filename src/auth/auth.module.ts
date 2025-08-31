import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { JwtAuthGuard } from './auth.guard';
import { AuthExceptionFilter } from './filters';
import { AccountSchema } from '../accounts/accounts.model';

@Module({
  imports: [
    // Configure Passport module
    PassportModule.register({ defaultStrategy: 'jwt' }),
    
    // Configure JWT module with secret and expiration settings
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: {
        expiresIn: process.env.JWT_EXPIRES_IN || '24h',
      },
    }),
    
    // Configure MongooseModule for Account model
    MongooseModule.forFeature([
      { name: 'Account', schema: AccountSchema }
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    AuthExceptionFilter,
  ],
  exports: [
    AuthService, // Export AuthService for use in other modules
    JwtAuthGuard, // Export guard for use in other modules
    AuthExceptionFilter, // Export exception filter for use in other modules
  ],
})
export class AuthModule {}