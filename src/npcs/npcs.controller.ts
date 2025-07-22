import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { NpcsService } from './npcs.service';
import { BetterAuthGuard } from '../auth/better-auth.guard';
import { UserId } from '../auth/better-auth.decorator';

@ApiTags('npcs')
@Controller('npcs')
@UseGuards(BetterAuthGuard)
@ApiBearerAuth()
export class NpcsController {
  constructor(private readonly npcsService: NpcsService) {}

  @Get()
  @ApiOperation({ summary: '獲取所有NPC列表' })
  @ApiResponse({ status: 200, description: '成功獲取NPC列表' })
  @ApiQuery({ name: 'mapId', required: false, description: '過濾特定地圖的NPC' })
  async getAllNPCs(@Query('mapId') mapId?: string) {
    const npcs = await this.npcsService.getAllNPCs();
    
    if (mapId) {
      return npcs.filter(npc => npc.location.mapId === mapId);
    }
    
    return npcs;
  }

  @Get('nearby')
  @ApiOperation({ summary: '獲取附近的NPC' })
  @ApiResponse({ status: 200, description: '成功獲取附近NPC' })
  @ApiQuery({ name: 'mapId', required: true, description: '地圖ID' })
  @ApiQuery({ name: 'x', required: true, description: 'X座標' })
  @ApiQuery({ name: 'y', required: true, description: 'Y座標' })
  @ApiQuery({ name: 'radius', required: false, description: '搜索半徑，預設100' })
  async getNearbyNPCs(
    @Query('mapId') mapId: string,
    @Query('x') x: number,
    @Query('y') y: number,
    @Query('radius') radius?: number,
  ) {
    return this.npcsService.getNPCsByLocation(
      mapId,
      Number(x),
      Number(y),
      radius ? Number(radius) : 100,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: '獲取特定NPC詳細資訊' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '成功獲取NPC詳細資訊' })
  @ApiResponse({ status: 404, description: 'NPC 不存在' })
  async getNPCById(@Param('id') npcId: string) {
    const npc = await this.npcsService.getNPCById(npcId);
    
    if (!npc) {
      throw new Error('NPC 不存在');
    }
    
    // 不返回敏感資訊如完整的relationships
    const { relationships, ...publicNPCData } = npc;
    return publicNPCData;
  }

  @Post(':id/interact')
  @ApiOperation({ summary: '與NPC互動對話' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '成功與NPC互動' })
  @ApiResponse({ status: 404, description: 'NPC 不存在' })
  async interactWithNPC(
    @Param('id') npcId: string,
    @UserId() userId: string,
    @Body() interactionData: {
      dialogueId?: string;
      action?: string;
    },
  ) {
    const dialogueId = interactionData.dialogueId || 'greeting';
    
    const result = await this.npcsService.interactWithNPC(
      npcId,
      userId,
      dialogueId,
    );

    return {
      npc: {
        id: result.npc.id,
        name: result.npc.name,
        type: result.npc.type,
        appearance: result.npc.appearance,
        personality: result.npc.personality,
      },
      dialogue: result.dialogue,
      relationship: result.relationship,
    };
  }

  @Get(':id/shop')
  @ApiOperation({ summary: '獲取NPC商店資訊' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '成功獲取商店資訊' })
  @ApiResponse({ status: 400, description: '此NPC沒有商店' })
  @ApiResponse({ status: 404, description: 'NPC 不存在' })
  async getNPCShop(
    @Param('id') npcId: string,
    @UserId() userId: string,
  ) {
    return this.npcsService.getNPCShop(npcId, userId);
  }

  @Post(':id/shop/buy')
  @ApiOperation({ summary: '從NPC商店購買物品' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '購買成功' })
  @ApiResponse({ status: 400, description: '購買失敗（金錢不足、庫存不足等）' })
  async buyFromNPC(
    @Param('id') npcId: string,
    @UserId() userId: string,
    @Body() purchaseData: {
      itemId: string;
      quantity: number;
    },
  ) {
    return this.npcsService.buyFromNPC(
      npcId,
      userId,
      purchaseData.itemId,
      purchaseData.quantity,
    );
  }

  @Post(':id/dialogue/dynamic')
  @ApiOperation({ summary: '獲取AI生成的動態對話' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '成功生成動態對話' })
  async getDynamicDialogue(
    @Param('id') npcId: string,
    @UserId() userId: string,
    @Body() contextData: {
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      weather?: 'sunny' | 'rainy' | 'cloudy';
      playerLevel?: number;
      lastQuestCompleted?: string;
    },
  ) {
    const dialogue = await this.npcsService.generateDynamicDialogue(
      npcId,
      userId,
      contextData,
    );

    return { dialogue };
  }

  @Get(':id/quests')
  @ApiOperation({ summary: '獲取NPC提供的任務' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '成功獲取NPC任務' })
  async getNPCQuests(@Param('id') npcId: string) {
    const npc = await this.npcsService.getNPCById(npcId);
    
    if (!npc) {
      throw new Error('NPC 不存在');
    }

    // 返回NPC可提供的任務ID列表
    // 實際的任務資料應該通過 /quests 端點獲取
    return {
      npcId: npc.id,
      npcName: npc.name,
      availableQuests: npc.quests,
    };
  }

  @Post(':id/quests/generate')
  @ApiOperation({ summary: '基於NPC職業生成日常任務' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '成功生成職業相關任務' })
  async generateProfessionQuests(@Param('id') npcId: string) {
    const quests = await this.npcsService.generateProfessionBasedQuests(npcId);
    
    return {
      npcId,
      generatedQuests: quests,
      count: quests.length,
    };
  }

  @Get('statistics/summary')
  @ApiOperation({ summary: '獲取NPC統計摘要' })
  @ApiResponse({ status: 200, description: '成功獲取NPC統計' })
  async getNPCStatistics() {
    const npcs = await this.npcsService.getAllNPCs();
    
    const statistics = {
      totalNPCs: npcs.length,
      byType: npcs.reduce((acc, npc) => {
        acc[npc.type] = (acc[npc.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byProfession: npcs.reduce((acc, npc) => {
        if (npc.profession) {
          acc[npc.profession] = (acc[npc.profession] || 0) + 1;
        }
        return acc;
      }, {} as Record<string, number>),
      averageLevel: Math.round(
        npcs.reduce((sum, npc) => sum + npc.level, 0) / npcs.length
      ),
      withShops: npcs.filter(npc => npc.shop).length,
      questGivers: npcs.filter(npc => npc.quests.length > 0).length,
    };

    return statistics;
  }

  @Post('daily-update')
  @ApiOperation({ summary: '執行NPC每日狀態更新' })
  @ApiResponse({ status: 200, description: '每日更新完成' })
  async performDailyUpdate() {
    await this.npcsService.updateDailyStatus();
    
    return {
      message: 'NPC 每日狀態更新完成',
      timestamp: new Date(),
    };
  }

  // 管理員專用端點（可以添加額外的權限檢查）
  @Get(':id/relationships')
  @ApiOperation({ summary: '獲取NPC與所有玩家的關係（管理員用）' })
  @ApiParam({ name: 'id', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '成功獲取關係資料' })
  async getNPCRelationships(@Param('id') npcId: string) {
    const npc = await this.npcsService.getNPCById(npcId);
    
    if (!npc) {
      throw new Error('NPC 不存在');
    }

    // 這裡可以添加管理員權限檢查
    // if (!isAdmin) throw new UnauthorizedException();

    return {
      npcId: npc.id,
      npcName: npc.name,
      relationships: Object.entries(npc.relationships).map(([playerId, relationship]) => ({
        playerId,
        reputation: relationship.reputation,
        lastInteraction: relationship.lastInteraction,
      })),
    };
  }
}