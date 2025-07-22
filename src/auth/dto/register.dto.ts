import { IsEmail, IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ description: '用戶名', example: 'player123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(3, { message: '用戶名至少需要3個字符' })
  @MaxLength(50, { message: '用戶名最多50個字符' })
  username: string;

  @ApiProperty({ description: '電子郵件', example: 'player@example.com' })
  @IsNotEmpty()
  @IsEmail({}, { message: '請輸入有效的電子郵件地址' })
  @MaxLength(100, { message: '電子郵件最多100個字符' })
  email: string;

  @ApiProperty({ description: '密碼', example: 'password123' })
  @IsNotEmpty()
  @IsString()
  @MinLength(8, { message: '密碼至少需要8個字符' })
  @MaxLength(255, { message: '密碼最多255個字符' })
  password: string;
}