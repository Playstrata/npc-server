import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCharacterDto {
  @ApiProperty({ 
    description: '角色名稱（每個帳號只能創建一個角色，請謹慎選擇）', 
    example: 'DragonSlayer',
    minLength: 2,
    maxLength: 50 
  })
  @IsNotEmpty()
  @IsString()
  @MinLength(2, { message: '角色名稱至少需要2個字符' })
  @MaxLength(50, { message: '角色名稱最多50個字符' })
  name: string;
}