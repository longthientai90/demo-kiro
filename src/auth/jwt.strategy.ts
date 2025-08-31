import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './interfaces/auth-response.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'your-secret-key',
    });
  }

  async validate(payload: JwtPayload) {
    // Verify that the payload exists and contains required fields
    if (!payload || !payload.sub || !payload.userName || !payload.userId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    // Return user object that will be attached to the request
    return {
      id: payload.sub,
      userName: payload.userName,
      userId: payload.userId,
    };
  }
}