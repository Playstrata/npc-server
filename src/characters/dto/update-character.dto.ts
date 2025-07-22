import { IsOptional, IsNumber, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCharacterDto {
  @ApiProperty({ description: '當前生命值', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  hp?: number;

  @ApiProperty({ description: '當前魔力值', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  mp?: number;

  @ApiProperty({ description: '當前地圖', required: false })
  @IsOptional()
  @IsString()
  currentMap?: string;

  @ApiProperty({ description: 'X座標', required: false })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiProperty({ description: 'Y座標', required: false })
  @IsOptional()
  @IsNumber()
  positionY?: number;
}

export class AllocateStatsDto {
  @ApiProperty({ description: '力量點數分配', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  strength?: number;

  @ApiProperty({ description: '敏捷點數分配', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  dexterity?: number;

  @ApiProperty({ description: '智力點數分配', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  intelligence?: number;

  @ApiProperty({ description: '體質點數分配', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  vitality?: number;

  @ApiProperty({ description: '幸運點數分配', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  luck?: number;
}