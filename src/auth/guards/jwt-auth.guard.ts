import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any, info: any) {
    if (info instanceof TokenExpiredError) {
      throw new UnauthorizedException('Token 已過期，請重新登入');
    }
    
    if (info instanceof JsonWebTokenError) {
      throw new UnauthorizedException('無效的 Token');
    }
    
    if (err || !user) {
      throw new UnauthorizedException('認證失敗');
    }
    
    return user;
  }
}