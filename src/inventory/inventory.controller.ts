import { 
  Controller, 
  Get, 
  Post, 
  Delete, 
  Body, 
  Param, 
  Query,
  UseGuards,
  Request,
  BadRequestException
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService, InventoryItem, CarryingCapacityInfo, InventoryOperationResult } from './inventory.service';
import { ItemQuality } from '../items/items.types';

// DTO 類別
class AddItemDto {
  itemId: string;
  quantity: number;
  quality?: ItemQuality;
}

class RemoveItemDto {
  itemId: string; 
  quantity: number;
  quality?: ItemQuality;
}

class CheckItemDto {
  itemId: string;
  quantity: number;
  quality?: ItemQuality;
}

@ApiTags('背包系統')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  /**
   * 獲取玩家背包內容
   */
  @Get(':characterId')
  @ApiOperation({ summary: '獲取玩家背包內容' })
  @ApiResponse({ status: 200, description: '成功獲取背包內容' })
  async getPlayerInventory(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    data: {
      items: InventoryItem[];
      capacity: CarryingCapacityInfo;
      itemCount: number;
      totalValue?: number;
    };
  }> {
    const items = await this.inventoryService.getPlayerInventory(characterId);
    const capacity = await this.inventoryService.getCarryingCapacityInfo(characterId);
    
    // 計算物品總價值 (基於基礎價格)
    const totalValue = items.reduce((sum, item) => {
      const basePrice = item.item.marketInfo?.basePrice || 0;
      return sum + (basePrice * item.quantity);
    }, 0);

    return {
      success: true,
      data: {
        items,
        capacity,
        itemCount: items.length,
        totalValue
      }
    };
  }

  /**
   * 獲取負重資訊
   */
  @Get(':characterId/capacity')
  @ApiOperation({ summary: '獲取玩家負重資訊' })
  @ApiResponse({ status: 200, description: '成功獲取負重資訊' })
  async getCarryingCapacity(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    data: CarryingCapacityInfo;
  }> {
    const capacity = await this.inventoryService.getCarryingCapacityInfo(characterId);

    return {
      success: true,
      data: capacity
    };
  }

  /**
   * 添加物品到背包
   */
  @Post(':characterId/add')
  @ApiOperation({ summary: '添加物品到背包' })
  @ApiResponse({ status: 200, description: '成功添加物品' })
  async addItem(
    @Param('characterId') characterId: string,
    @Body() addItemDto: AddItemDto
  ): Promise<{
    success: boolean;
    message: string;
    data?: InventoryOperationResult;
  }> {
    if (!addItemDto.itemId || addItemDto.quantity <= 0) {
      throw new BadRequestException('物品ID不能為空，數量必須大於0');
    }

    const result = await this.inventoryService.addItemToInventory(
      characterId,
      addItemDto.itemId,
      addItemDto.quantity,
      addItemDto.quality || ItemQuality.COMMON
    );

    return {
      success: result.success,
      message: result.message,
      data: result.success ? result : undefined
    };
  }

  /**
   * 從背包移除物品
   */
  @Delete(':characterId/remove')
  @ApiOperation({ summary: '從背包移除物品' })
  @ApiResponse({ status: 200, description: '成功移除物品' })
  async removeItem(
    @Param('characterId') characterId: string,
    @Body() removeItemDto: RemoveItemDto
  ): Promise<{
    success: boolean;
    message: string;
    data?: InventoryOperationResult;
  }> {
    if (!removeItemDto.itemId || removeItemDto.quantity <= 0) {
      throw new BadRequestException('物品ID不能為空，數量必須大於0');
    }

    const result = await this.inventoryService.removeItemFromInventory(
      characterId,
      removeItemDto.itemId,
      removeItemDto.quantity,
      removeItemDto.quality
    );

    return {
      success: result.success,
      message: result.message,
      data: result.success ? result : undefined
    };
  }

  /**
   * 檢查是否有足夠的物品
   */
  @Post(':characterId/check')
  @ApiOperation({ summary: '檢查是否有足夠的物品' })
  @ApiResponse({ status: 200, description: '物品檢查結果' })
  async checkItem(
    @Param('characterId') characterId: string,
    @Body() checkItemDto: CheckItemDto
  ): Promise<{
    success: boolean;
    hasEnoughItems: boolean;
    message: string;
  }> {
    const hasEnough = await this.inventoryService.hasItem(
      characterId,
      checkItemDto.itemId,
      checkItemDto.quantity,
      checkItemDto.quality
    );

    return {
      success: true,
      hasEnoughItems: hasEnough,
      message: hasEnough 
        ? `擁有足夠的 ${checkItemDto.itemId}` 
        : `${checkItemDto.itemId} 數量不足`
    };
  }

  /**
   * 計算可攜帶的最大數量
   */
  @Get(':characterId/max-carry/:itemId')
  @ApiOperation({ summary: '計算可攜帶指定物品的最大數量' })
  @ApiResponse({ status: 200, description: '最大攜帶數量' })
  async getMaxCarryableQuantity(
    @Param('characterId') characterId: string,
    @Param('itemId') itemId: string
  ): Promise<{
    success: boolean;
    maxQuantity: number;
    message: string;
  }> {
    const maxQuantity = await this.inventoryService.calculateMaxCarryableQuantity(
      characterId,
      itemId
    );

    return {
      success: true,
      maxQuantity,
      message: `最多可攜帶 ${maxQuantity} 個 ${itemId}`
    };
  }

  /**
   * 增加負重能力
   */
  @Post(':characterId/increase-capacity')
  @ApiOperation({ summary: '增加玩家負重能力' })
  @ApiResponse({ status: 200, description: '成功增加負重能力' })
  async increaseCapacity(
    @Param('characterId') characterId: string,
    @Body() body: { amount: number }
  ): Promise<{
    success: boolean;
    message: string;
    newCapacity: number;
  }> {
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException('增加量必須大於0');
    }

    const result = await this.inventoryService.increaseCarryingCapacity(
      characterId,
      body.amount
    );

    return {
      success: result.success,
      message: `負重能力增加了 ${body.amount}kg`,
      newCapacity: result.newCapacity
    };
  }

  /**
   * 整理背包
   */
  @Post(':characterId/organize')
  @ApiOperation({ summary: '整理背包，重新排列物品' })
  @ApiResponse({ status: 200, description: '背包整理完成' })
  async organizeInventory(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const result = await this.inventoryService.organizeInventory(characterId);

    return {
      success: result.success,
      message: result.message
    };
  }

  /**
   * 獲取背包統計資訊
   */
  @Get(':characterId/stats')
  @ApiOperation({ summary: '獲取背包統計資訊' })
  @ApiResponse({ status: 200, description: '背包統計資訊' })
  async getInventoryStats(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    data: {
      capacity: CarryingCapacityInfo;
      itemStats: {
        totalItems: number;
        uniqueItems: number;
        equipmentCount: number;
        consumableCount: number;
        materialCount: number;
        toolCount: number;
      };
      valueStats: {
        totalValue: number;
        averageItemValue: number;
        mostValuableItem?: {
          itemId: string;
          name: string;
          value: number;
        };
      };
    };
  }> {
    const items = await this.inventoryService.getPlayerInventory(characterId);
    const capacity = await this.inventoryService.getCarryingCapacityInfo(characterId);

    // 物品統計
    const itemStats = {
      totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      uniqueItems: items.length,
      equipmentCount: items.filter(item => item.item.type === 'WEAPON' || item.item.type === 'ARMOR').length,
      consumableCount: items.filter(item => item.item.type === 'CONSUMABLE').length,
      materialCount: items.filter(item => item.item.type === 'MATERIAL').length,
      toolCount: items.filter(item => item.item.type === 'TOOL').length
    };

    // 價值統計
    let totalValue = 0;
    let mostValuableItem = null;
    let maxValue = 0;

    for (const item of items) {
      const itemValue = (item.item.marketInfo?.basePrice || 0) * item.quantity;
      totalValue += itemValue;

      if (itemValue > maxValue) {
        maxValue = itemValue;
        mostValuableItem = {
          itemId: item.itemId,
          name: item.item.name,
          value: itemValue
        };
      }
    }

    const valueStats = {
      totalValue,
      averageItemValue: items.length > 0 ? totalValue / itemStats.uniqueItems : 0,
      mostValuableItem
    };

    return {
      success: true,
      data: {
        capacity,
        itemStats,
        valueStats
      }
    };
  }
}