import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

  async validateUser(usernameOrEmail: string, password: string): Promise<any> {
    let user;
    
    // 嘗試用用戶名查找
    try {
      user = await this.usersService.findByUsername(usernameOrEmail);
    } catch {
      // 如果用戶名查找失敗，嘗試用電子郵件查找
      try {
        user = await this.usersService.findByEmail(usernameOrEmail);
      } catch {
        return null;
      }
    }

    if (user && await this.usersService.validatePassword(user, password)) {
      const { passwordHash, ...result } = user;
      return result;
    }
    
    return null;
  }

  async login(user: any) {
    const payload: JwtPayload = {
      sub: user.id,
      username: user.username,
      email: user.email,
    };

    const accessToken = this.jwtService.sign(payload);

    return {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: '1d',
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.userRole,
        isActive: user.isActive,
        hasCharacter: !!user.gameCharacter,
      },
    };
  }

  async register(registerDto: RegisterDto) {
    // 檢查用戶名是否已存在
    try {
      await this.usersService.findByUsername(registerDto.username);
      throw new ConflictException('用戶名已存在');
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // 用戶名不存在，繼續檢查電子郵件
    }

    // 檢查電子郵件是否已存在
    try {
      await this.usersService.findByEmail(registerDto.email);
      throw new ConflictException('電子郵件已存在');
    } catch (error) {
      if (error instanceof ConflictException) {
        throw error;
      }
      // 電子郵件不存在，可以創建用戶
    }

    // 創建用戶
    const user = await this.usersService.create({
      username: registerDto.username,
      email: registerDto.email,
      password: registerDto.password,
    });

    const { passwordHash, ...result } = user;
    return result;
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findOne(userId);
    const { passwordHash, ...profile } = user;
    
    return {
      ...profile,
      hasCharacter: !!user.gameCharacter,
    };
  }

  async refreshToken(user: any) {
    return this.login(user);
  }
}