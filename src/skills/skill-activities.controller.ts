import { Controller, Get, Post, Body, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { GatheringService } from './gathering.service';
import { CraftingService } from './crafting.service';
import { SkillType } from './skills.service';

@ApiTags('Skill Activities')
@Controller('skill-activities')
export class SkillActivitiesController {
  constructor(
    private readonly gatheringService: GatheringService,
    private readonly craftingService: CraftingService
  ) {}

  /**
   * 採集相關 API
   */

  @Get('gathering/nodes')
  @ApiOperation({ summary: '獲取所有採集點' })
  @ApiQuery({ name: 'mapId', required: false, description: '地圖ID過濾' })
  @ApiResponse({
    status: 200,
    description: '採集點列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              resourceType: { type: 'string' },
              skillType: { type: 'string' },
              requiredLevel: { type: 'string' },
              rarity: { type: 'string' },
              location: { type: 'object' }
            }
          }
        }
      }
    }
  })
  async getAllGatheringNodes(@Query('mapId') mapId?: string) {
    try {
      const nodes = await this.gatheringService.getAllGatheringNodes();
      
      const filteredNodes = mapId 
        ? nodes.filter(node => node.location.mapId === mapId)
        : nodes;

      return {
        success: true,
        data: filteredNodes,
        message: `找到 ${filteredNodes.length} 個採集點`
      };
    } catch (error) {
      console.error('[SkillActivitiesController] 獲取採集點失敗:', error);
      throw new BadRequestException('無法獲取採集點信息');
    }
  }

  @Get('gathering/nodes/nearby')
  @ApiOperation({ summary: '獲取附近的採集點' })
  @ApiQuery({ name: 'mapId', description: '地圖ID' })
  @ApiQuery({ name: 'x', description: 'X座標' })
  @ApiQuery({ name: 'y', description: 'Y座標' })
  @ApiQuery({ name: 'radius', required: false, description: '搜索半徑（默認100）' })
  @ApiResponse({
    status: 200,
    description: '附近的採集點',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'array' }
      }
    }
  })
  async getNearbyGatheringNodes(
    @Query('mapId') mapId: string,
    @Query('x') x: string,
    @Query('y') y: string,
    @Query('radius') radius?: string
  ) {
    try {
      const xPos = parseFloat(x);
      const yPos = parseFloat(y);
      const searchRadius = radius ? parseFloat(radius) : 100;

      const nearbyNodes = await this.gatheringService.getGatheringNodesByLocation(
        mapId, xPos, yPos, searchRadius
      );

      return {
        success: true,
        data: nearbyNodes,
        message: `在半徑 ${searchRadius} 內找到 ${nearbyNodes.length} 個採集點`
      };
    } catch (error) {
      console.error('[SkillActivitiesController] 獲取附近採集點失敗:', error);
      throw new BadRequestException('無法獲取附近採集點');
    }
  }

  @Post('gathering/:playerId/:nodeId')
  @ApiOperation({ summary: '執行採集動作' })
  @ApiParam({ name: 'playerId', description: '玩家ID' })
  @ApiParam({ name: 'nodeId', description: '採集點ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        toolQuality: { 
          type: 'string',
          enum: ['basic', 'good', 'excellent'],
          description: '工具品質',
          default: 'basic'
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '採集結果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            resourcesGathered: { type: 'array' },
            experienceGained: { type: 'number' },
            proficiencyGained: { type: 'number' },
            bonusEffects: { type: 'array' }
          }
        },
        message: { type: 'string' }
      }
    }
  })
  async performGathering(
    @Param('playerId') playerId: string,
    @Param('nodeId') nodeId: string,
    @Body() gatheringDto: {
      toolQuality?: 'basic' | 'good' | 'excellent';
    }
  ) {
    try {
      const result = await this.gatheringService.performGathering(
        playerId,
        nodeId,
        gatheringDto.toolQuality || 'basic'
      );

      return {
        success: result.success,
        data: result.success ? {
          resourcesGathered: result.resourcesGathered,
          experienceGained: result.experienceGained,
          proficiencyGained: result.proficiencyGained,
          bonusEffects: result.bonusEffects
        } : null,
        message: result.message
      };
    } catch (error) {
      console.error('[SkillActivitiesController] 採集失敗:', error);
      throw new BadRequestException('採集動作失敗');
    }
  }

  /**
   * 製造相關 API
   */

  @Get('crafting/recipes')
  @ApiOperation({ summary: '獲取所有製造配方' })
  @ApiQuery({ name: 'skillType', required: false, description: '技能類型過濾' })
  @ApiResponse({
    status: 200,
    description: '製造配方列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              skillType: { type: 'string' },
              requiredLevel: { type: 'string' },
              ingredients: { type: 'array' },
              outputs: { type: 'array' },
              experienceReward: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async getAllRecipes(@Query('skillType') skillType?: string) {
    try {
      let recipes;
      
      if (skillType) {
        recipes = await this.craftingService.getRecipesBySkill(skillType as SkillType);
      } else {
        recipes = await this.craftingService.getAllRecipes();
      }

      return {
        success: true,
        data: recipes,
        message: `找到 ${recipes.length} 個製造配方`
      };
    } catch (error) {
      console.error('[SkillActivitiesController] 獲取配方失敗:', error);
      throw new BadRequestException('無法獲取製造配方');
    }
  }

  @Post('crafting/:playerId/:recipeId')
  @ApiOperation({ summary: '執行製造動作' })
  @ApiParam({ name: 'playerId', description: '玩家ID' })
  @ApiParam({ name: 'recipeId', description: '配方ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        quantity: { 
          type: 'number',
          description: '製造數量',
          default: 1,
          minimum: 1,
          maximum: 10
        },
        useHighQualityMaterials: { 
          type: 'boolean',
          description: '是否使用高品質材料',
          default: false
        }
      }
    }
  })
  @ApiResponse({
    status: 200,
    description: '製造結果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            itemsCreated: { type: 'array' },
            experienceGained: { type: 'number' },
            proficiencyGained: { type: 'number' },
            materialsConsumed: { type: 'array' },
            criticalSuccess: { type: 'boolean' },
            bonusEffects: { type: 'array' }
          }
        },
        message: { type: 'string' }
      }
    }
  })
  async performCrafting(
    @Param('playerId') playerId: string,
    @Param('recipeId') recipeId: string,
    @Body() craftingDto: {
      quantity?: number;
      useHighQualityMaterials?: boolean;
    }
  ) {
    try {
      const result = await this.craftingService.performCrafting(
        playerId,
        recipeId,
        craftingDto.quantity || 1,
        craftingDto.useHighQualityMaterials || false
      );

      return {
        success: result.success,
        data: result.success ? {
          itemsCreated: result.itemsCreated,
          experienceGained: result.experienceGained,
          proficiencyGained: result.proficiencyGained,
          materialsConsumed: result.materialsConsumed,
          criticalSuccess: result.criticalSuccess,
          bonusEffects: result.bonusEffects
        } : {
          materialsConsumed: result.materialsConsumed,
          experienceGained: result.experienceGained
        },
        message: result.message
      };
    } catch (error) {
      console.error('[SkillActivitiesController] 製造失敗:', error);
      throw new BadRequestException('製造動作失敗');
    }
  }

  /**
   * 組合查詢 API
   */

  @Get('player/:playerId/available-activities')
  @ApiOperation({ summary: '獲取玩家可進行的技能活動' })
  @ApiParam({ name: 'playerId', description: '玩家ID' })
  @ApiQuery({ name: 'mapId', required: false, description: '當前地圖ID' })
  @ApiQuery({ name: 'x', required: false, description: '玩家X座標' })
  @ApiQuery({ name: 'y', required: false, description: '玩家Y座標' })
  @ApiResponse({
    status: 200,
    description: '可用的技能活動',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            nearbyGatheringNodes: { type: 'array' },
            availableRecipes: { type: 'array' },
            recommendedActivities: { type: 'array' }
          }
        }
      }
    }
  })
  async getAvailableActivities(
    @Param('playerId') playerId: string,
    @Query('mapId') mapId?: string,
    @Query('x') x?: string,
    @Query('y') y?: string
  ) {
    try {
      const data: any = {
        nearbyGatheringNodes: [],
        availableRecipes: [],
        recommendedActivities: []
      };

      // 獲取附近的採集點
      if (mapId && x && y) {
        data.nearbyGatheringNodes = await this.gatheringService.getGatheringNodesByLocation(
          mapId, 
          parseFloat(x), 
          parseFloat(y), 
          150
        );
      }

      // 獲取所有配方
      data.availableRecipes = await this.craftingService.getAllRecipes();

      // 生成推薦活動（基於玩家技能等級）
      data.recommendedActivities = [
        {
          type: 'gathering',
          skillType: 'WOODCUTTING',
          recommendation: '建議練習伐木技能，可以獲得製作材料',
          difficulty: 'beginner'
        },
        {
          type: 'crafting',
          skillType: 'CRAFTING',
          recommendation: '嘗試製作基礎物品來提升技能等級',
          difficulty: 'beginner'
        }
      ];

      return {
        success: true,
        data,
        message: `找到 ${data.nearbyGatheringNodes.length} 個附近採集點和 ${data.availableRecipes.length} 個可用配方`
      };
    } catch (error) {
      console.error('[SkillActivitiesController] 獲取可用活動失敗:', error);
      throw new BadRequestException('無法獲取可用活動');
    }
  }

  @Get('activity-guide/:skillType')
  @ApiOperation({ summary: '獲取特定技能的活動指南' })
  @ApiParam({ name: 'skillType', description: '技能類型' })
  @ApiResponse({
    status: 200,
    description: '技能活動指南',
    schema: {
      type: 'object',
      properties: {
        skillType: { type: 'string' },
        description: { type: 'string' },
        beginnerTips: { type: 'array' },
        recommendedProgression: { type: 'array' },
        relatedActivities: { type: 'array' }
      }
    }
  })
  async getActivityGuide(@Param('skillType') skillType: string) {
    try {
      const guides: { [key: string]: any } = {
        'WOODCUTTING': {
          skillType: 'WOODCUTTING',
          description: '伐木技能讓你能夠砍伐各種樹木，獲得建築和製作材料',
          beginnerTips: [
            '從普通橡樹開始練習',
            '學習「基礎伐木技術」知識可以提高效率',
            '使用更好的斧頭能提高採集品質',
            '珍稀木材需要更高的技能等級'
          ],
          recommendedProgression: [
            { level: 'NOVICE', activity: '砍伐橡樹和樺樹' },
            { level: 'APPRENTICE', activity: '學習高效伐木法' },
            { level: 'JOURNEYMAN', activity: '嘗試砍伐松樹' },
            { level: 'EXPERT', activity: '尋找稀有紅木' }
          ],
          relatedActivities: [
            { type: 'crafting', skill: 'CRAFTING', description: '使用木材製作物品' },
            { type: 'trading', skill: 'TRADING', description: '出售木材賺取金幣' }
          ]
        },
        'MINING': {
          skillType: 'MINING',
          description: '挖礦技能讓你能夠開採各種礦物和寶石',
          beginnerTips: [
            '從鐵礦脈開始挖掘',
            '帶足夠的食物和水',
            '不同礦物有不同的開採時間',
            '深層礦洞有更珍貴的資源'
          ],
          recommendedProgression: [
            { level: 'NOVICE', activity: '開採銅礦和鐵礦' },
            { level: 'APPRENTICE', activity: '學習礦物識別' },
            { level: 'JOURNEYMAN', activity: '挖掘黃金礦脈' },
            { level: 'EXPERT', activity: '尋找鑽石礦脈' }
          ],
          relatedActivities: [
            { type: 'crafting', skill: 'BLACKSMITHING', description: '使用礦石鍛造裝備' },
            { type: 'trading', skill: 'TRADING', description: '出售稀有礦物' }
          ]
        },
        'ALCHEMY': {
          skillType: 'ALCHEMY',
          description: '煉金術讓你能夠製作各種藥水和魔法物品',
          beginnerTips: [
            '學習基礎煉金術理論很重要',
            '收集各種草藥作為材料',
            '實驗不同的配方組合',
            '失敗也能獲得經驗'
          ],
          recommendedProgression: [
            { level: 'NOVICE', activity: '製作基礎治療藥水' },
            { level: 'APPRENTICE', activity: '學習中級煉金術' },
            { level: 'JOURNEYMAN', activity: '製作魔力藥水' },
            { level: 'EXPERT', activity: '研發複雜藥劑' }
          ],
          relatedActivities: [
            { type: 'gathering', skill: 'HERBALISM', description: '收集草藥材料' },
            { type: 'study', skill: 'SCHOLARSHIP', description: '研究煉金術理論' }
          ]
        }
      };

      const guide = guides[skillType];
      if (!guide) {
        throw new NotFoundException('找不到該技能的指南');
      }

      return {
        success: true,
        data: guide,
        message: `獲取 ${skillType} 技能指南成功`
      };
    } catch (error) {
      console.error('[SkillActivitiesController] 獲取活動指南失敗:', error);
      throw new BadRequestException('無法獲取活動指南');
    }
  }
}