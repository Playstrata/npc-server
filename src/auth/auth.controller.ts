import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: '用戶註冊' })
  @ApiResponse({ 
    status: 201, 
    description: '註冊成功',
    example: {
      id: 'uuid',
      username: 'player123',
      email: 'player@example.com',
      isActive: true,
      userRole: 'PLAYER',
      createdAt: '2023-12-01T00:00:00.000Z'
    }
  })
  @ApiResponse({ status: 409, description: '用戶名或電子郵件已存在' })
  @ApiResponse({ status: 400, description: '輸入資料格式錯誤' })
  async register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @UseGuards(LocalAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用戶登入' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ 
    status: 200, 
    description: '登入成功',
    example: {
      access_token: 'jwt-token-string',
      token_type: 'Bearer',
      expires_in: '1d',
      user: {
        id: 'uuid',
        username: 'player123',
        email: 'player@example.com',
        role: 'PLAYER',
        hasCharacter: false
      }
    }
  })
  @ApiResponse({ status: 401, description: '用戶名或密碼錯誤' })
  async login(@Request() req) {
    return this.authService.login(req.user);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: '取得用戶資訊' })
  @ApiResponse({ 
    status: 200, 
    description: '成功取得用戶資訊',
    example: {
      id: 'uuid',
      username: 'player123',
      email: 'player@example.com',
      isActive: true,
      userRole: 'PLAYER',
      hasCharacter: true,
      gameCharacter: {
        id: 'uuid',
        characterName: 'DragonSlayer',
        characterLevel: 5
      }
    }
  })
  @ApiResponse({ status: 401, description: '未授權訪問' })
  async getProfile(@Request() req) {
    return this.authService.getProfile(req.user.userId);
  }

  @Post('refresh')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '刷新 Token' })
  @ApiResponse({ 
    status: 200, 
    description: '成功刷新 Token',
    example: {
      access_token: 'new-jwt-token-string',
      token_type: 'Bearer',
      expires_in: '1d'
    }
  })
  @ApiResponse({ status: 401, description: '無效的 Token' })
  async refreshToken(@Request() req) {
    return this.authService.refreshToken(req.user);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: '用戶登出' })
  @ApiResponse({ status: 200, description: '登出成功' })
  async logout() {
    // JWT 是無狀態的，登出主要靠客戶端刪除 token
    // 這裡可以加入 token 黑名單邏輯（如果需要的話）
    return {
      message: '登出成功',
      timestamp: new Date().toISOString(),
    };
  }
}