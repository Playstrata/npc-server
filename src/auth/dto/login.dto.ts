import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: '用戶名或電子郵件', example: 'player123' })
  @IsNotEmpty()
  @IsString()
  username: string;

  @ApiProperty({ description: '密碼', example: 'password123' })
  @IsNotEmpty()
  @IsString()
  password: string;
}