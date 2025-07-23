import { IsNotEmpty, IsString, MinLength, MaxLength, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { CharacterClass } from '../character-classes.types';

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

  @ApiProperty({
    description: '角色職業',
    enum: CharacterClass,
    example: CharacterClass.WARRIOR,
    required: false
  })
  @IsOptional()
  @IsEnum(CharacterClass, { message: '無效的角色職業' })
  characterClass?: CharacterClass;
}