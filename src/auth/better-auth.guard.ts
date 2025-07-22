import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class BetterAuthGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    // 從 cookies 或 Authorization header 獲取 token
    const token = this.extractToken(request);
    
    if (!token) {
      throw new UnauthorizedException('No authentication token provided');
    }

    try {
      // 驗證 Better Auth session token
      const session = await this.prisma.session.findUnique({
        where: { token },
        include: {
          user: {
            include: {
              gameCharacter: true,
            },
          },
        },
      });

      if (!session) {
        throw new UnauthorizedException('Invalid session token');
      }

      // 檢查 session 是否過期
      if (session.expiresAt < new Date()) {
        // 刪除過期的 session
        await this.prisma.session.delete({
          where: { id: session.id },
        });
        throw new UnauthorizedException('Session expired');
      }

      // 檢查用戶是否啟用
      if (!session.user.isActive) {
        throw new UnauthorizedException('User account is disabled');
      }

      // 將用戶資訊附加到請求物件
      request.user = session.user;
      request.session = session;

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractToken(request: any): string | null {
    // 1. 從 Authorization header 提取
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. 從 cookies 提取 (Better Auth 默認使用 cookies)
    const cookies = request.headers.cookie;
    if (cookies) {
      const tokenMatch = cookies.match(/better-auth\.session_token=([^;]+)/);
      if (tokenMatch) {
        return decodeURIComponent(tokenMatch[1]);
      }
    }

    // 3. 從 query parameters 提取
    if (request.query && request.query.token) {
      return request.query.token;
    }

    return null;
  }
}