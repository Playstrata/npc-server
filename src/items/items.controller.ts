import { Controller, Get, Post, Param, Body, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBody, ApiResponse } from '@nestjs/swagger';
import { ItemsService } from './items.service';
import { ItemType, ItemQuality } from './items.types';

@ApiTags('Items')
@Controller('items')
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  /**
   * 獲取所有物品
   */
  @Get()
  @ApiOperation({ summary: '獲取所有物品' })
  @ApiQuery({ name: 'type', required: false, description: '物品類型過濾' })
  @ApiResponse({
    status: 200,
    description: '物品列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            items: { type: 'array' },
            totalCount: { type: 'number' }
          }
        }
      }
    }
  })
  async getAllItems(@Query('type') type?: string) {
    try {
      let items;
      
      if (type && Object.values(ItemType).includes(type as ItemType)) {
        items = this.itemsService.getItemsByType(type as ItemType);
      } else {
        items = Object.values(this.itemsService.getAllItems());
      }

      return {
        success: true,
        data: {
          items,
          totalCount: items.length
        },
        message: `獲取到 ${items.length} 個物品`
      };
    } catch (error) {
      console.error('[ItemsController] 獲取物品列表失敗:', error);
      throw new BadRequestException('無法獲取物品列表');
    }
  }

  /**
   * 獲取特定物品詳情
   */
  @Get(':itemId')
  @ApiOperation({ summary: '獲取物品詳情' })
  @ApiParam({ name: 'itemId', description: '物品ID' })
  @ApiResponse({
    status: 200,
    description: '物品詳情',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: { type: 'object' }
      }
    }
  })
  async getItemById(@Param('itemId') itemId: string) {
    try {
      const item = this.itemsService.getItemById(itemId);
      
      if (!item) {
        throw new BadRequestException('物品不存在');
      }

      // 獲取市場需求資訊
      const marketDemand = this.itemsService.getMarketDemand(itemId);

      return {
        success: true,
        data: {
          ...item,
          marketDemand
        },
        message: `獲取 ${item.name} 詳情成功`
      };
    } catch (error) {
      console.error('[ItemsController] 獲取物品詳情失敗:', error);
      throw new BadRequestException('無法獲取物品詳情');
    }
  }

  /**
   * 獲取所有礦石
   */
  @Get('category/ores')
  @ApiOperation({ summary: '獲取所有礦石' })
  @ApiResponse({
    status: 200,
    description: '礦石列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'object' }
        }
      }
    }
  })
  async getAllOres() {
    try {
      const ores = this.itemsService.getAllOres();
      
      return {
        success: true,
        data: ores,
        message: `獲取到 ${ores.length} 種礦石`
      };
    } catch (error) {
      console.error('[ItemsController] 獲取礦石列表失敗:', error);
      throw new BadRequestException('無法獲取礦石列表');
    }
  }

  /**
   * 獲取所有武器
   */
  @Get('category/weapons')
  @ApiOperation({ summary: '獲取所有武器' })
  @ApiResponse({
    status: 200,
    description: '武器列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'object' }
        }
      }
    }
  })
  async getAllWeapons() {
    try {
      const weapons = this.itemsService.getAllWeapons();
      
      return {
        success: true,
        data: weapons,
        message: `獲取到 ${weapons.length} 種武器`
      };
    } catch (error) {
      console.error('[ItemsController] 獲取武器列表失敗:', error);
      throw new BadRequestException('無法獲取武器列表');
    }
  }

  /**
   * 獲取製作配方
   */
  @Get('crafting/recipes')
  @ApiOperation({ summary: '獲取製作配方' })
  @ApiQuery({ name: 'skill', required: false, description: '技能類型' })
  @ApiQuery({ name: 'level', required: false, description: '技能等級', type: 'number' })
  @ApiResponse({
    status: 200,
    description: '製作配方列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: { type: 'object' }
        }
      }
    }
  })
  async getCraftingRecipes(
    @Query('skill') skill?: string,
    @Query('level') level?: string
  ) {
    try {
      let recipes;
      
      if (skill && level) {
        const skillLevel = parseInt(level);
        recipes = this.itemsService.getCraftableRecipes(skill, skillLevel);
      } else {
        recipes = Object.values(this.itemsService.getAllItems())
          .filter(item => item.craftingInfo)
          .map(item => item.craftingInfo);
      }

      return {
        success: true,
        data: recipes,
        message: `獲取到 ${recipes.length} 個製作配方`
      };
    } catch (error) {
      console.error('[ItemsController] 獲取製作配方失敗:', error);
      throw new BadRequestException('無法獲取製作配方');
    }
  }

  /**
   * 計算製作成功率
   */
  @Post('crafting/calculate-success-rate')
  @ApiOperation({ summary: '計算製作成功率' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        recipeId: { type: 'string', description: '配方ID' },
        playerSkillLevel: { type: 'number', description: '玩家技能等級' },
        materialQualities: {
          type: 'array',
          items: { type: 'string', enum: Object.values(ItemQuality) },
          description: '材料品質列表'
        },
        toolBonus: { type: 'number', description: '工具加成', default: 0 }
      },
      required: ['recipeId', 'playerSkillLevel', 'materialQualities']
    }
  })
  @ApiResponse({
    status: 200,
    description: '成功率計算結果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            successRate: { type: 'number' },
            difficulty: { type: 'string' },
            recommendations: { type: 'array' }
          }
        }
      }
    }
  })
  async calculateCraftingSuccessRate(@Body() calculateDto: {
    recipeId: string;
    playerSkillLevel: number;
    materialQualities: ItemQuality[];
    toolBonus?: number;
  }) {
    try {
      const successRate = this.itemsService.calculateCraftingSuccessRate(
        calculateDto.recipeId,
        calculateDto.playerSkillLevel,
        calculateDto.materialQualities,
        calculateDto.toolBonus || 0
      );

      // 根據成功率給出難度評級和建議
      let difficulty: string;
      let recommendations: string[] = [];

      if (successRate >= 90) {
        difficulty = '非常簡單';
      } else if (successRate >= 75) {
        difficulty = '簡單';
      } else if (successRate >= 60) {
        difficulty = '中等';
      } else if (successRate >= 40) {
        difficulty = '困難';
        recommendations.push('建議提升技能等級');
        recommendations.push('使用更好品質的材料');
      } else {
        difficulty = '極其困難';
        recommendations.push('強烈建議提升技能等級');
        recommendations.push('使用高品質材料');
        recommendations.push('使用更好的工具');
      }

      return {
        success: true,
        data: {
          successRate: Math.round(successRate * 10) / 10, // 保留一位小數
          difficulty,
          recommendations
        },
        message: `製作成功率: ${Math.round(successRate)}%`
      };
    } catch (error) {
      console.error('[ItemsController] 計算製作成功率失敗:', error);
      throw new BadRequestException('無法計算製作成功率');
    }
  }

  /**
   * 執行製作
   */
  @Post('crafting/perform/:playerId')
  @ApiOperation({ summary: '執行物品製作' })
  @ApiParam({ name: 'playerId', description: '玩家ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        recipeId: { type: 'string', description: '配方ID' },
        materials: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              itemId: { type: 'string' },
              quantity: { type: 'number' },
              quality: { type: 'string', enum: Object.values(ItemQuality) }
            }
          },
          description: '使用的材料'
        },
        toolBonus: { type: 'number', description: '工具加成', default: 0 }
      },
      required: ['recipeId', 'materials']
    }
  })
  @ApiResponse({
    status: 200,
    description: '製作結果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            craftingSuccess: { type: 'boolean' },
            resultItem: { type: 'object' },
            experienceGained: { type: 'number' },
            materialsConsumed: { type: 'array' }
          }
        }
      }
    }
  })
  async performCrafting(
    @Param('playerId') playerId: string,
    @Body() craftingDto: {
      recipeId: string;
      materials: Array<{ itemId: string; quantity: number; quality: ItemQuality }>;
      toolBonus?: number;
    }
  ) {
    try {
      const result = await this.itemsService.performCrafting(
        playerId,
        craftingDto.recipeId,
        craftingDto.materials,
        craftingDto.toolBonus || 0
      );

      return {
        success: true,
        data: {
          craftingSuccess: result.success,
          resultItem: result.resultItem,
          experienceGained: result.experienceGained,
          materialsConsumed: result.materialsConsumed
        },
        message: result.message
      };
    } catch (error) {
      console.error('[ItemsController] 執行製作失敗:', error);
      throw new BadRequestException('製作過程中發生錯誤');
    }
  }

  /**
   * 獲取推薦製作配方
   */
  @Get('crafting/recommendations/:playerId')
  @ApiOperation({ summary: '獲取推薦的製作配方' })
  @ApiParam({ name: 'playerId', description: '玩家ID' })
  @ApiQuery({ name: 'skill', description: '技能類型' })
  @ApiResponse({
    status: 200,
    description: '推薦配方列表',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              recipe: { type: 'object' },
              profitPotential: { type: 'number' },
              difficultyRating: { type: 'number' },
              marketDemand: { type: 'string' }
            }
          }
        }
      }
    }
  })
  async getRecommendedRecipes(
    @Param('playerId') playerId: string,
    @Query('skill') skill: string
  ) {
    try {
      const recommendations = await this.itemsService.getRecommendedRecipes(playerId, skill);
      
      return {
        success: true,
        data: recommendations,
        message: `獲取到 ${recommendations.length} 個推薦配方`
      };
    } catch (error) {
      console.error('[ItemsController] 獲取推薦配方失敗:', error);
      throw new BadRequestException('無法獲取推薦配方');
    }
  }

  /**
   * 計算物品價值
   */
  @Post('calculate-value')
  @ApiOperation({ summary: '計算物品價值' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        itemId: { type: 'string', description: '物品ID' },
        quality: { type: 'string', enum: Object.values(ItemQuality), description: '物品品質' },
        condition: { type: 'number', description: '物品狀況 (0-100)', default: 100 }
      },
      required: ['itemId', 'quality']
    }
  })
  @ApiResponse({
    status: 200,
    description: '物品價值',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            baseValue: { type: 'number' },
            adjustedValue: { type: 'number' },
            qualityMultiplier: { type: 'number' },
            conditionMultiplier: { type: 'number' }
          }
        }
      }
    }
  })
  async calculateItemValue(@Body() valueDto: {
    itemId: string;
    quality: ItemQuality;
    condition?: number;
  }) {
    try {
      const item = this.itemsService.getItemById(valueDto.itemId);
      if (!item) {
        throw new BadRequestException('物品不存在');
      }

      const condition = valueDto.condition ?? 100;
      const adjustedValue = this.itemsService.calculateItemValue(
        valueDto.itemId,
        valueDto.quality,
        condition
      );

      return {
        success: true,
        data: {
          baseValue: item.marketInfo?.basePrice || 0,
          adjustedValue,
          qualityMultiplier: valueDto.quality,
          conditionMultiplier: condition / 100
        },
        message: `${item.name} 的當前價值為 ${adjustedValue} 金幣`
      };
    } catch (error) {
      console.error('[ItemsController] 計算物品價值失敗:', error);
      throw new BadRequestException('無法計算物品價值');
    }
  }
}