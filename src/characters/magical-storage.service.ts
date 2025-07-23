import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { ItemQuality } from '../items/items.types';
import { 
  CharacterClass, 
  calculateMagicalStorageCapacity, 
  calculateStorageMana, 
  calculateRetrievalMana 
} from './character-classes.types';

// 魔法收納物品接口
export interface MagicalStorageItem {
  id: string;
  itemId: string;
  quantity: number;
  quality: ItemQuality;
  manaUsed: number;
  storedAt: Date;
  lastAccessedAt?: Date;
  itemDetails: any; // 物品詳細資訊
}

// 魔法收納操作結果
export interface MagicalStorageResult {
  success: boolean;
  message: string;
  manaConsumed?: number;
  newManaAmount?: number;
  storageUsed?: number;
  storageCapacity?: number;
  affectedItems?: MagicalStorageItem[];
}

@Injectable()
export class MagicalStorageService {
  private readonly logger = new Logger(MagicalStorageService.name);

  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService
  ) {}

  /**
   * 檢查角色是否為法師並有魔法收納能力
   */
  private async validateMageCharacter(characterId: string): Promise<any> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: {
        characterClass: true,
        intelligence: true,
        mana: true,
        maxMana: true,
        magicalStorageCapacity: true,
        magicalStorageUsed: true
      },
      include: {
        knowledges: true
      }
    });

    if (!character) {
      throw new BadRequestException('角色不存在');
    }

    if (character.characterClass !== CharacterClass.MAGE) {
      throw new ForbiddenException('只有法師才能使用魔法收納');
    }

    // 檢查是否學會了魔法收納技能
    const hasMagicalStorageSkill = character.knowledges.some(
      k => k.knowledgeName === '空間魔法 - 魔法收納術'
    );

    if (!hasMagicalStorageSkill) {
      throw new ForbiddenException('需要先學會「空間魔法 - 魔法收納術」才能使用魔法收納');
    }

    return character;
  }

  /**
   * 初始化法師的魔法收納容量
   */
  async initializeMagicalStorage(characterId: string): Promise<void> {
    const character = await this.validateMageCharacter(characterId);
    
    if (character.magicalStorageCapacity === 0) {
      const capacity = calculateMagicalStorageCapacity(character.intelligence);
      
      await this.prisma.gameCharacter.update({
        where: { id: characterId },
        data: {
          magicalStorageCapacity: capacity
        }
      });

      this.logger.log(`法師 ${characterId} 魔法收納容量初始化為 ${capacity.toFixed(1)}kg`);
    }
  }

  /**
   * 獲取魔法收納狀態
   */
  async getMagicalStorageInfo(characterId: string): Promise<{
    isAvailable: boolean;
    capacity: number;
    used: number;
    available: number;
    usagePercentage: number;
    currentMana: number;
    maxMana: number;
  }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: {
        characterClass: true,
        intelligence: true,
        mana: true,
        maxMana: true,
        magicalStorageCapacity: true,
        magicalStorageUsed: true
      }
    });

    if (!character) {
      throw new BadRequestException('角色不存在');
    }

    const isAvailable = character.characterClass === CharacterClass.MAGE;
    
    if (!isAvailable) {
      return {
        isAvailable: false,
        capacity: 0,
        used: 0,
        available: 0,
        usagePercentage: 0,
        currentMana: character.mana,
        maxMana: character.maxMana
      };
    }

    // 如果還沒初始化容量，先初始化
    let capacity = character.magicalStorageCapacity;
    if (capacity === 0) {
      capacity = calculateMagicalStorageCapacity(character.intelligence);
      await this.prisma.gameCharacter.update({
        where: { id: characterId },
        data: { magicalStorageCapacity: capacity }
      });
    }

    const used = character.magicalStorageUsed;
    const available = Math.max(0, capacity - used);
    const usagePercentage = capacity > 0 ? (used / capacity) * 100 : 0;

    return {
      isAvailable: true,
      capacity,
      used,
      available,
      usagePercentage,
      currentMana: character.mana,
      maxMana: character.maxMana
    };
  }

  /**
   * 獲取魔法收納中的所有物品
   */
  async getMagicalStorageItems(characterId: string): Promise<MagicalStorageItem[]> {
    await this.validateMageCharacter(characterId);

    const storageItems = await this.prisma.magicalStorage.findMany({
      where: { characterId },
      orderBy: [
        { storedAt: 'desc' }
      ]
    });

    const result: MagicalStorageItem[] = [];
    for (const dbItem of storageItems) {
      const itemDetails = this.itemsService.getItemById(dbItem.itemId);
      if (itemDetails) {
        result.push({
          id: dbItem.id,
          itemId: dbItem.itemId,
          quantity: dbItem.quantity,
          quality: dbItem.quality as ItemQuality,
          manaUsed: dbItem.manaUsed,
          storedAt: dbItem.storedAt,
          lastAccessedAt: dbItem.lastAccessedAt,
          itemDetails
        });
      }
    }

    return result;
  }

  /**
   * 將物品儲存到魔法收納空間
   */
  async storeItem(
    characterId: string,
    itemId: string,
    quantity: number,
    quality: ItemQuality = ItemQuality.COMMON
  ): Promise<MagicalStorageResult> {
    const character = await this.validateMageCharacter(characterId);
    
    // 確保魔法收納已初始化
    await this.initializeMagicalStorage(characterId);

    const item = this.itemsService.getItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: '物品不存在'
      };
    }

    const itemWeight = (item.attributes?.weight || item.weight || 0) * quantity;
    const manaRequired = calculateStorageMana(itemWeight, quality);

    // 檢查魔力是否足夠
    if (character.mana < manaRequired) {
      return {
        success: false,
        message: `魔力不足，需要 ${manaRequired.toFixed(1)} 魔力，目前只有 ${character.mana.toFixed(1)} 魔力`
      };
    }

    // 檢查魔法收納空間是否足夠
    const storageInfo = await this.getMagicalStorageInfo(characterId);
    if (storageInfo.available < itemWeight) {
      return {
        success: false,
        message: `魔法收納空間不足，需要 ${itemWeight.toFixed(1)}kg，只有 ${storageInfo.available.toFixed(1)}kg 可用空間`
      };
    }

    // 檢查背包中是否有足夠的物品
    const inventoryItem = await this.prisma.playerInventory.findFirst({
      where: {
        characterId,
        itemId,
        quality: quality.toString()
      }
    });

    if (!inventoryItem || inventoryItem.quantity < quantity) {
      return {
        success: false,
        message: `背包中物品數量不足，需要 ${quantity} 個，背包中只有 ${inventoryItem?.quantity || 0} 個`
      };
    }

    // 執行收納操作
    try {
      await this.prisma.$transaction(async (prisma) => {
        // 從背包移除物品
        if (inventoryItem.quantity === quantity) {
          await prisma.playerInventory.delete({
            where: { id: inventoryItem.id }
          });
        } else {
          await prisma.playerInventory.update({
            where: { id: inventoryItem.id },
            data: {
              quantity: inventoryItem.quantity - quantity,
              totalWeight: (inventoryItem.quantity - quantity) * inventoryItem.weight
            }
          });
        }

        // 檢查魔法收納中是否已有相同物品
        const existingStorage = await prisma.magicalStorage.findFirst({
          where: {
            characterId,
            itemId,
            quality: quality.toString()
          }
        });

        if (existingStorage) {
          // 更新現有收納
          await prisma.magicalStorage.update({
            where: { id: existingStorage.id },
            data: {
              quantity: existingStorage.quantity + quantity,
              manaUsed: existingStorage.manaUsed + manaRequired,
              lastAccessedAt: new Date()
            }
          });
        } else {
          // 創建新的收納記錄
          await prisma.magicalStorage.create({
            data: {
              characterId,
              itemId,
              quantity,
              quality: quality.toString(),
              manaUsed: manaRequired
            }
          });
        }

        // 更新角色狀態
        await prisma.gameCharacter.update({
          where: { id: characterId },
          data: {
            mana: character.mana - manaRequired,
            magicalStorageUsed: character.magicalStorageUsed + itemWeight
          }
        });

        // 更新背包總重量
        const totalWeight = await prisma.playerInventory.aggregate({
          where: { characterId },
          _sum: { totalWeight: true }
        });

        await prisma.gameCharacter.update({
          where: { id: characterId },
          data: {
            currentWeight: totalWeight._sum.totalWeight || 0
          }
        });
      });

      this.logger.log(`法師 ${characterId} 收納物品 ${quantity}x ${itemId} (${quality})，消耗魔力 ${manaRequired.toFixed(1)}`);

      return {
        success: true,
        message: `成功收納 ${quantity}x ${item.name}`,
        manaConsumed: manaRequired,
        newManaAmount: character.mana - manaRequired,
        storageUsed: character.magicalStorageUsed + itemWeight,
        storageCapacity: storageInfo.capacity
      };

    } catch (error) {
      this.logger.error('魔法收納失敗:', error);
      return {
        success: false,
        message: '魔法收納過程中發生錯誤'
      };
    }
  }

  /**
   * 從魔法收納空間取出物品
   */
  async retrieveItem(
    characterId: string,
    storageId: string,
    quantity?: number
  ): Promise<MagicalStorageResult> {
    const character = await this.validateMageCharacter(characterId);

    const storageItem = await this.prisma.magicalStorage.findFirst({
      where: {
        id: storageId,
        characterId
      }
    });

    if (!storageItem) {
      return {
        success: false,
        message: '魔法收納中沒有這個物品'
      };
    }

    const retrieveQuantity = quantity || storageItem.quantity;
    
    if (retrieveQuantity > storageItem.quantity) {
      return {
        success: false,
        message: `數量超出限制，最多只能取出 ${storageItem.quantity} 個`
      };
    }

    const item = this.itemsService.getItemById(storageItem.itemId);
    if (!item) {
      return {
        success: false,
        message: '物品資料錯誤'
      };
    }

    // 計算取出魔力消耗
    const manaPerItem = storageItem.manaUsed / storageItem.quantity;
    const retrievalMana = calculateRetrievalMana(manaPerItem * retrieveQuantity);

    if (character.mana < retrievalMana) {
      return {
        success: false,
        message: `魔力不足，需要 ${retrievalMana.toFixed(1)} 魔力進行取出`
      };
    }

    const itemWeight = (item.attributes?.weight || item.weight || 0);
    const totalRetrieveWeight = itemWeight * retrieveQuantity;

    // 檢查背包負重
    const capacityInfo = await this.getInventoryCapacity(characterId);
    if (capacityInfo.availableCapacity < totalRetrieveWeight) {
      return {
        success: false,
        message: `背包負重不足，需要 ${totalRetrieveWeight.toFixed(1)}kg，只有 ${capacityInfo.availableCapacity.toFixed(1)}kg 可用空間`
      };
    }

    try {
      await this.prisma.$transaction(async (prisma) => {
        // 更新或刪除魔法收納記錄
        if (retrieveQuantity === storageItem.quantity) {
          await prisma.magicalStorage.delete({
            where: { id: storageId }
          });
        } else {
          const remainingMana = storageItem.manaUsed - (manaPerItem * retrieveQuantity);
          await prisma.magicalStorage.update({
            where: { id: storageId },
            data: {
              quantity: storageItem.quantity - retrieveQuantity,
              manaUsed: remainingMana,
              lastAccessedAt: new Date()
            }
          });
        }

        // 將物品添加到背包
        const existingInventory = await prisma.playerInventory.findFirst({
          where: {
            characterId,
            itemId: storageItem.itemId,
            quality: storageItem.quality
          }
        });

        if (existingInventory && existingInventory.isStackable) {
          await prisma.playerInventory.update({
            where: { id: existingInventory.id },
            data: {
              quantity: existingInventory.quantity + retrieveQuantity,
              totalWeight: (existingInventory.quantity + retrieveQuantity) * itemWeight
            }
          });
        } else {
          await prisma.playerInventory.create({
            data: {
              characterId,
              itemId: storageItem.itemId,
              quantity: retrieveQuantity,
              quality: storageItem.quality,
              weight: itemWeight,
              totalWeight: totalRetrieveWeight,
              isStackable: item.stackable || false,
              maxStack: item.maxStack || 1,
              condition: 100.0
            }
          });
        }

        // 更新角色狀態
        await prisma.gameCharacter.update({
          where: { id: characterId },
          data: {
            mana: character.mana - retrievalMana,
            magicalStorageUsed: character.magicalStorageUsed - totalRetrieveWeight
          }
        });

        // 更新背包總重量
        const totalWeight = await prisma.playerInventory.aggregate({
          where: { characterId },
          _sum: { totalWeight: true }
        });

        await prisma.gameCharacter.update({
          where: { id: characterId },
          data: {
            currentWeight: totalWeight._sum.totalWeight || 0
          }
        });
      });

      this.logger.log(`法師 ${characterId} 取出物品 ${retrieveQuantity}x ${storageItem.itemId}，消耗魔力 ${retrievalMana.toFixed(1)}`);

      return {
        success: true,
        message: `成功取出 ${retrieveQuantity}x ${item.name}`,
        manaConsumed: retrievalMana,
        newManaAmount: character.mana - retrievalMana,
        storageUsed: character.magicalStorageUsed - totalRetrieveWeight
      };

    } catch (error) {
      this.logger.error('魔法取出失敗:', error);
      return {
        success: false,
        message: '魔法取出過程中發生錯誤'
      };
    }
  }

  /**
   * 獲取背包容量資訊
   */
  private async getInventoryCapacity(characterId: string) {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { carryingCapacity: true, currentWeight: true }
    });

    if (!character) {
      throw new BadRequestException('角色不存在');
    }

    return {
      maxCapacity: character.carryingCapacity,
      currentWeight: character.currentWeight,
      availableCapacity: Math.max(0, character.carryingCapacity - character.currentWeight)
    };
  }

  /**
   * 升級時更新魔法收納容量（智力提升時調用）
   */
  async updateMagicalStorageCapacity(characterId: string, newIntelligence: number): Promise<void> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { characterClass: true }
    });

    if (character?.characterClass === CharacterClass.MAGE) {
      const newCapacity = calculateMagicalStorageCapacity(newIntelligence);
      
      await this.prisma.gameCharacter.update({
        where: { id: characterId },
        data: {
          magicalStorageCapacity: newCapacity
        }
      });

      this.logger.log(`法師 ${characterId} 魔法收納容量更新為 ${newCapacity.toFixed(1)}kg`);
    }
  }
}