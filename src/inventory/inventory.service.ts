import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { ItemQuality, BaseItem } from '../items/items.types';

// 背包物品接口
export interface InventoryItem {
  id: string;
  itemId: string;
  quantity: number;
  quality: ItemQuality;
  weight: number;
  totalWeight: number;
  slot?: number;
  isEquipped: boolean;
  condition: number;
  isStackable: boolean;
  maxStack: number;
  acquiredAt: Date;
  lastUsedAt?: Date;
  item: BaseItem; // 物品詳細資訊
}

// 背包操作結果
export interface InventoryOperationResult {
  success: boolean;
  message: string;
  newWeight?: number;
  affectedItems?: InventoryItem[];
  overflowItems?: Array<{
    itemId: string;
    quantity: number;
    quality: ItemQuality;
  }>;
}

// 負重狀態
export interface CarryingCapacityInfo {
  currentWeight: number;
  maxCapacity: number;
  availableCapacity: number;
  usagePercentage: number;
  isOverloaded: boolean;
  capacityLevel: 'LIGHT' | 'NORMAL' | 'HEAVY' | 'OVERLOADED';
}

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService
  ) {}

  /**
   * 獲取玩家背包內容
   */
  async getPlayerInventory(characterId: string): Promise<InventoryItem[]> {
    const inventoryItems = await this.prisma.playerInventory.findMany({
      where: { characterId },
      orderBy: [
        { slot: 'asc' },
        { acquiredAt: 'desc' }
      ]
    });

    const result: InventoryItem[] = [];
    for (const dbItem of inventoryItems) {
      const itemDetails = this.itemsService.getItemById(dbItem.itemId);
      if (itemDetails) {
        result.push({
          id: dbItem.id,
          itemId: dbItem.itemId,
          quantity: dbItem.quantity,
          quality: dbItem.quality as ItemQuality,
          weight: dbItem.weight,
          totalWeight: dbItem.totalWeight,
          slot: dbItem.slot,
          isEquipped: dbItem.isEquipped,
          condition: dbItem.condition,
          isStackable: dbItem.isStackable,
          maxStack: dbItem.maxStack,
          acquiredAt: dbItem.acquiredAt,
          lastUsedAt: dbItem.lastUsedAt,
          item: itemDetails
        });
      }
    }

    return result;
  }

  /**
   * 獲取玩家負重資訊
   */
  async getCarryingCapacityInfo(characterId: string): Promise<CarryingCapacityInfo> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { carryingCapacity: true, currentWeight: true }
    });

    if (!character) {
      throw new BadRequestException('角色不存在');
    }

    const currentWeight = character.currentWeight;
    const maxCapacity = character.carryingCapacity;
    const availableCapacity = Math.max(0, maxCapacity - currentWeight);
    const usagePercentage = (currentWeight / maxCapacity) * 100;
    const isOverloaded = currentWeight > maxCapacity;

    let capacityLevel: CarryingCapacityInfo['capacityLevel'];
    if (usagePercentage <= 25) {
      capacityLevel = 'LIGHT';
    } else if (usagePercentage <= 75) {
      capacityLevel = 'NORMAL';
    } else if (usagePercentage <= 100) {
      capacityLevel = 'HEAVY';
    } else {
      capacityLevel = 'OVERLOADED';
    }

    return {
      currentWeight,
      maxCapacity,
      availableCapacity,
      usagePercentage,
      isOverloaded,
      capacityLevel
    };
  }

  /**
   * 添加物品到背包
   */
  async addItemToInventory(
    characterId: string,
    itemId: string,
    quantity: number,
    quality: ItemQuality = ItemQuality.COMMON
  ): Promise<InventoryOperationResult> {
    const item = this.itemsService.getItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: '物品不存在'
      };
    }

    const itemWeight = item.weight || 0;
    const totalAddWeight = itemWeight * quantity;

    // 檢查負重限制
    const capacityInfo = await this.getCarryingCapacityInfo(characterId);
    if (capacityInfo.availableCapacity < totalAddWeight) {
      return {
        success: false,
        message: `負重不足，需要 ${totalAddWeight.toFixed(1)}kg，只有 ${capacityInfo.availableCapacity.toFixed(1)}kg 可用空間`
      };
    }

    // 檢查是否已有相同物品可以堆疊
    const existingItem = await this.prisma.playerInventory.findFirst({
      where: {
        characterId,
        itemId,
        quality: quality.toString()
      }
    });

    let affectedItems: InventoryItem[] = [];
    let overflowItems: Array<{ itemId: string; quantity: number; quality: ItemQuality }> = [];

    if (existingItem && existingItem.isStackable) {
      // 堆疊邏輯
      const availableStackSpace = existingItem.maxStack - existingItem.quantity;
      const stackableQuantity = Math.min(quantity, availableStackSpace);
      const overflowQuantity = quantity - stackableQuantity;

      if (stackableQuantity > 0) {
        // 更新現有物品
        const updatedItem = await this.prisma.playerInventory.update({
          where: { id: existingItem.id },
          data: {
            quantity: existingItem.quantity + stackableQuantity,
            totalWeight: (existingItem.quantity + stackableQuantity) * itemWeight
          }
        });

        // 建構回傳的 InventoryItem
        const inventoryItem: InventoryItem = {
          id: updatedItem.id,
          itemId: updatedItem.itemId,
          quantity: updatedItem.quantity,
          quality: updatedItem.quality as ItemQuality,
          weight: updatedItem.weight,
          totalWeight: updatedItem.totalWeight,
          slot: updatedItem.slot,
          isEquipped: updatedItem.isEquipped,
          condition: updatedItem.condition,
          isStackable: updatedItem.isStackable,
          maxStack: updatedItem.maxStack,
          acquiredAt: updatedItem.acquiredAt,
          lastUsedAt: updatedItem.lastUsedAt,
          item
        };

        affectedItems.push(inventoryItem);
      }

      if (overflowQuantity > 0) {
        overflowItems.push({
          itemId,
          quantity: overflowQuantity,
          quality
        });
      }
    } else {
      // 創建新的背包項目
      const newItem = await this.prisma.playerInventory.create({
        data: {
          characterId,
          itemId,
          quantity,
          quality: quality.toString(),
          weight: itemWeight,
          totalWeight: totalAddWeight,
          isStackable: item.stackable || false,
          maxStack: item.maxStack || 1,
          condition: 100.0
        }
      });

      const inventoryItem: InventoryItem = {
        id: newItem.id,
        itemId: newItem.itemId,
        quantity: newItem.quantity,
        quality: newItem.quality as ItemQuality,
        weight: newItem.weight,
        totalWeight: newItem.totalWeight,
        slot: newItem.slot,
        isEquipped: newItem.isEquipped,
        condition: newItem.condition,
        isStackable: newItem.isStackable,
        maxStack: newItem.maxStack,
        acquiredAt: newItem.acquiredAt,
        lastUsedAt: newItem.lastUsedAt,
        item
      };

      affectedItems.push(inventoryItem);
    }

    // 更新角色總重量
    await this.updateCharacterWeight(characterId);
    const newCapacityInfo = await this.getCarryingCapacityInfo(characterId);

    this.logger.log(`玩家 ${characterId} 添加物品 ${quantity}x ${itemId} (${quality})，新重量: ${newCapacityInfo.currentWeight.toFixed(1)}kg`);

    return {
      success: true,
      message: `成功添加 ${quantity}x ${item.name}`,
      newWeight: newCapacityInfo.currentWeight,
      affectedItems,
      overflowItems: overflowItems.length > 0 ? overflowItems : undefined
    };
  }

  /**
   * 從背包移除物品
   */
  async removeItemFromInventory(
    characterId: string,
    itemId: string,
    quantity: number,
    quality?: ItemQuality
  ): Promise<InventoryOperationResult> {
    const whereClause: any = {
      characterId,
      itemId
    };

    if (quality) {
      whereClause.quality = quality.toString();
    }

    const existingItem = await this.prisma.playerInventory.findFirst({
      where: whereClause
    });

    if (!existingItem) {
      return {
        success: false,
        message: '背包中沒有這個物品'
      };
    }

    if (existingItem.quantity < quantity) {
      return {
        success: false,
        message: `物品數量不足，背包中只有 ${existingItem.quantity} 個`
      };
    }

    const item = this.itemsService.getItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: '物品資料錯誤'
      };
    }

    let affectedItems: InventoryItem[] = [];

    if (existingItem.quantity === quantity) {
      // 完全移除
      await this.prisma.playerInventory.delete({
        where: { id: existingItem.id }
      });
    } else {
      // 減少數量
      const updatedItem = await this.prisma.playerInventory.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity - quantity,
          totalWeight: (existingItem.quantity - quantity) * existingItem.weight
        }
      });

      const inventoryItem: InventoryItem = {
        id: updatedItem.id,
        itemId: updatedItem.itemId,
        quantity: updatedItem.quantity,
        quality: updatedItem.quality as ItemQuality,
        weight: updatedItem.weight,
        totalWeight: updatedItem.totalWeight,
        slot: updatedItem.slot,
        isEquipped: updatedItem.isEquipped,
        condition: updatedItem.condition,
        isStackable: updatedItem.isStackable,
        maxStack: updatedItem.maxStack,
        acquiredAt: updatedItem.acquiredAt,
        lastUsedAt: updatedItem.lastUsedAt,
        item
      };

      affectedItems.push(inventoryItem);
    }

    // 更新角色總重量
    await this.updateCharacterWeight(characterId);
    const newCapacityInfo = await this.getCarryingCapacityInfo(characterId);

    this.logger.log(`玩家 ${characterId} 移除物品 ${quantity}x ${itemId}${quality ? ` (${quality})` : ''}，新重量: ${newCapacityInfo.currentWeight.toFixed(1)}kg`);

    return {
      success: true,
      message: `成功移除 ${quantity}x ${item.name}`,
      newWeight: newCapacityInfo.currentWeight,
      affectedItems
    };
  }

  /**
   * 檢查玩家是否有足夠的物品
   */
  async hasItem(
    characterId: string,
    itemId: string,
    requiredQuantity: number,
    quality?: ItemQuality
  ): Promise<boolean> {
    const whereClause: any = {
      characterId,
      itemId
    };

    if (quality) {
      whereClause.quality = quality.toString();
    }

    const item = await this.prisma.playerInventory.findFirst({
      where: whereClause
    });

    return item ? item.quantity >= requiredQuantity : false;
  }

  /**
   * 計算可攜帶的最大數量
   */
  async calculateMaxCarryableQuantity(
    characterId: string,
    itemId: string
  ): Promise<number> {
    const item = this.itemsService.getItemById(itemId);
    if (!item || !item.weight) {
      return 0;
    }

    const capacityInfo = await this.getCarryingCapacityInfo(characterId);
    return Math.floor(capacityInfo.availableCapacity / item.weight);
  }

  /**
   * 更新角色總重量
   */
  private async updateCharacterWeight(characterId: string): Promise<void> {
    const totalWeight = await this.prisma.playerInventory.aggregate({
      where: { characterId },
      _sum: {
        totalWeight: true
      }
    });

    await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        currentWeight: totalWeight._sum.totalWeight || 0
      }
    });
  }

  /**
   * 增加負重能力
   */
  async increaseCarryingCapacity(
    characterId: string,
    amount: number
  ): Promise<{ success: boolean; newCapacity: number }> {
    const updatedCharacter = await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        carryingCapacity: {
          increment: amount
        }
      }
    });

    this.logger.log(`玩家 ${characterId} 負重能力增加 ${amount}kg，新上限: ${updatedCharacter.carryingCapacity}kg`);

    return {
      success: true,
      newCapacity: updatedCharacter.carryingCapacity
    };
  }

  /**
   * 整理背包 (重新排列槽位)
   */
  async organizeInventory(characterId: string): Promise<InventoryOperationResult> {
    const inventoryItems = await this.prisma.playerInventory.findMany({
      where: { characterId },
      orderBy: [
        { isEquipped: 'desc' }, // 裝備的物品排前面
        { itemId: 'asc' },      // 同類物品聚集
        { quality: 'desc' },    // 高品質在前
        { acquiredAt: 'asc' }   // 獲得時間早的在前
      ]
    });

    // 重新分配槽位編號
    let slotNumber = 1;
    const updates = [];

    for (const item of inventoryItems) {
      if (item.slot !== slotNumber) {
        updates.push(
          this.prisma.playerInventory.update({
            where: { id: item.id },
            data: { slot: slotNumber }
          })
        );
      }
      slotNumber++;
    }

    if (updates.length > 0) {
      await Promise.all(updates);
      this.logger.log(`玩家 ${characterId} 整理背包，重新排列了 ${updates.length} 個物品`);
    }

    return {
      success: true,
      message: `背包整理完成，調整了 ${updates.length} 個物品的位置`
    };
  }
}