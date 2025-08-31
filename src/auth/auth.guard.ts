import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    // Add custom logic here if needed before calling the parent
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any) {
    // Handle different types of JWT errors
    if (err || !user) {
      // Handle any validation errors from the strategy first
      if (err) {
        throw new UnauthorizedException('Authentication failed');
      }
      
      // Handle missing token
      if (info && info.message === 'No auth token') {
        throw new UnauthorizedException('No token provided');
      }
      
      // Handle expired token
      if (info && info.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token has expired');
      }
      
      // Handle invalid token format or signature
      if (info && info.name === 'JsonWebTokenError') {
        throw new UnauthorizedException('Invalid token');
      }
      
      // Handle malformed token
      if (info && info.message === 'jwt malformed') {
        throw new UnauthorizedException('Invalid token format');
      }
      
      // Handle invalid signature
      if (info && info.message === 'invalid signature') {
        throw new UnauthorizedException('Invalid token signature');
      }
      
      // Generic error for any other authentication failure
      throw new UnauthorizedException('Authentication required');
    }
    
    return user;
  }
}