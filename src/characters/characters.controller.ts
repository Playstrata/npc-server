import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { CharactersService } from './characters.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto, AllocateStatsDto } from './dto/update-character.dto';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { CurrentUser, UserId } from '../auth/better-auth.decorator';
import { CHARACTER_CLASSES, CLASS_DISPLAY_NAMES } from './character-classes.types';

@ApiTags('characters')
@Controller('characters')
@UseGuards(BetterAuthGuard)
@ApiBearerAuth()
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  @Post()
  @ApiOperation({ summary: '創建新角色（每個帳號只能創建一個角色）' })
  @ApiResponse({ status: 201, description: '角色創建成功' })
  @ApiResponse({ status: 400, description: '用戶已有角色或角色名稱重複' })
  create(@UserId() userId: string, @Body() createCharacterDto: CreateCharacterDto) {
    return this.charactersService.create(userId, createCharacterDto);
  }

  @Get()
  @ApiOperation({ summary: '取得用戶的角色' })
  @ApiResponse({ status: 200, description: '成功取得角色資訊' })
  @ApiResponse({ status: 404, description: '用戶尚未創建角色' })
  findByUser(@UserId() userId: string) {
    return this.charactersService.findByUser(userId);
  }

  @Get('can-create')
  @ApiOperation({ summary: '檢查用戶是否可以創建角色' })
  @ApiResponse({ status: 200, description: '返回是否可以創建角色' })
  canCreateCharacter(@UserId() userId: string) {
    return this.charactersService.canCreateCharacter(userId);
  }

  @Get('classes')
  @ApiOperation({ summary: '獲取所有可選角色職業' })
  @ApiResponse({ status: 200, description: '成功獲取職業列表' })
  getCharacterClasses() {
    return {
      success: true,
      data: Object.values(CHARACTER_CLASSES).map(classData => ({
        classType: classData.classType,
        name: classData.name,
        description: classData.description,
        baseStats: classData.baseStats,
        specialAbilities: classData.specialAbilities,
        startingSkills: classData.startingSkills,
        preferredWeapons: classData.preferredWeapons
      }))
    };
  }

  @Get(':id')
  @ApiOperation({ summary: '根據ID取得角色詳細資訊' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功取得角色資訊' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  findOne(@Param('id') id: string) {
    return this.charactersService.findOne(id);
  }

  @Get(':id/stats')
  @ApiOperation({ summary: '取得角色完整屬性資訊' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功取得角色屬性' })
  getStats(@Param('id') id: string) {
    return this.charactersService.getCharacterStats(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '更新角色基本資訊' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '角色資訊更新成功' })
  update(@Param('id') id: string, @Body() updateCharacterDto: UpdateCharacterDto) {
    return this.charactersService.update(id, updateCharacterDto);
  }

  @Post(':id/allocate-stats')
  @ApiOperation({ summary: '分配角色屬性點' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '屬性點分配成功' })
  @ApiResponse({ status: 400, description: '屬性點不足或分配無效' })
  allocateStats(@Param('id') id: string, @Body() allocateStatsDto: AllocateStatsDto) {
    return this.charactersService.allocateStats(id, allocateStatsDto);
  }

  @Post(':id/gain-exp')
  @ApiOperation({ summary: '角色獲得經驗值' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '經驗值獲得成功' })
  gainExperience(@Param('id') id: string, @Body() body: { amount: number }) {
    return this.charactersService.gainExperience(id, body.amount);
  }

  @Post(':id/heal')
  @ApiOperation({ summary: '角色回復血量和魔力' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '回復成功' })
  heal(@Param('id') id: string, @Body() body: { hp?: number; mp?: number }) {
    return this.charactersService.heal(id, body.hp || 0, body.mp || 0);
  }

  @Post(':id/damage')
  @ApiOperation({ summary: '角色受到傷害' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '傷害計算成功' })
  takeDamage(@Param('id') id: string, @Body() body: { damage: number }) {
    return this.charactersService.takeDamage(id, body.damage);
  }

  @Delete(':id')
  @ApiOperation({ summary: '刪除角色' })
  @ApiParam({ name: 'id', description: '角色ID' })
  @ApiResponse({ status: 200, description: '角色刪除成功' })
  remove(@Param('id') id: string) {
    return this.charactersService.remove(id);
  }
}