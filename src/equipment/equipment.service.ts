import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ItemsService } from "../items/items.service";
import { InventoryService } from "../inventory/inventory.service";
import { ItemQuality, ItemType } from "../items/items.types";

// 裝備槽位類型
export enum EquipmentSlot {
  BACKPACK = "BACKPACK",
  WEAPON = "WEAPON",
  ARMOR = "ARMOR",
  HANDS = "HANDS", // 雙手（無裝備時）
}

// 裝備狀態
export interface EquipmentStatus {
  backpack?: {
    itemId: string;
    name: string;
    quality: ItemQuality;
    condition: number;
    capacityBonus: number; // 重量加成(公斤)
    volumeBonus: number; // 體積加成(公升)
    slots: number; // 格子數量
  };
  weapon?: {
    itemId: string;
    name: string;
    quality: ItemQuality;
    condition: number;
    damageBonus: number;
  };
  armor?: {
    itemId: string;
    name: string;
    quality: ItemQuality;
    condition: number;
    defenseBonus: number;
  };
  handsOnly: boolean; // 是否只能用雙手攜帶
}

// 容量計算結果
export interface CapacityCalculation {
  baseCapacity: number; // 基礎容量（雙手）
  strengthBonus: number; // 力量加成
  vitalityBonus: number; // 體力加成
  backpackBonus: number; // 背包加成
  totalCapacity: number; // 總容量

  baseVolume: number; // 基礎體積
  backpackVolumeBonus: number; // 背包體積加成
  totalVolume: number; // 總體積

  effectiveSlots: number; // 有效格子數
}

@Injectable()
export class EquipmentService {
  private readonly logger = new Logger(EquipmentService.name);

  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
    private inventoryService: InventoryService,
  ) {}

  /**
   * 獲取角色裝備狀態
   */
  async getEquipmentStatus(characterId: string): Promise<EquipmentStatus> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: {
        equippedBackpack: true,
        equippedWeapon: true,
        equippedArmor: true,
        equippedShirt: true,
        equippedPants: true,
        equippedShoes: true,
        equippedGloves: true,
        equippedShield: true,
      },
    });

    if (!character) {
      throw new BadRequestException("角色不存在");
    }

    const equipment: EquipmentStatus = {
      handsOnly: !character.equippedBackpack,
    };

    // 獲取背包資訊
    if (character.equippedBackpack) {
      const backpackItem = await this.prisma.playerInventory.findFirst({
        where: {
          itemId: character.equippedBackpack,
          characterId,
          isEquipped: true,
          equipmentSlot: EquipmentSlot.BACKPACK,
        },
      });

      if (backpackItem) {
        const itemDetails = this.itemsService.getItemById(backpackItem.itemId);
        if (itemDetails && itemDetails.type === ItemType.BACKPACK) {
          equipment.backpack = {
            itemId: backpackItem.itemId,
            name: itemDetails.name,
            quality: backpackItem.quality as ItemQuality,
            condition: backpackItem.condition,
            capacityBonus: itemDetails.equipment?.capacityBonus || 0,
            volumeBonus: itemDetails.equipment?.volumeBonus || 0,
            slots: itemDetails.equipment?.slots || 10,
          };
        }
      }
    }

    // 獲取武器資訊
    if (character.equippedWeapon) {
      const weaponItem = await this.prisma.playerInventory.findFirst({
        where: {
          itemId: character.equippedWeapon,
          characterId,
          isEquipped: true,
          equipmentSlot: EquipmentSlot.WEAPON,
        },
      });

      if (weaponItem) {
        const itemDetails = this.itemsService.getItemById(weaponItem.itemId);
        if (itemDetails && itemDetails.type === ItemType.WEAPON) {
          equipment.weapon = {
            itemId: weaponItem.itemId,
            name: itemDetails.name,
            quality: weaponItem.quality as ItemQuality,
            condition: weaponItem.condition,
            damageBonus: itemDetails.combat?.damage || 0,
          };
        }
      }
    }

    // 獲取護甲資訊 (檢查所有護甲槽位)
    const armorSlots = [
      character.equippedArmor,
      character.equippedShirt,
      character.equippedPants,
      character.equippedShoes,
      character.equippedGloves,
      character.equippedShield,
    ].filter(Boolean);

    if (armorSlots.length > 0) {
      const armorItem = await this.prisma.playerInventory.findFirst({
        where: {
          itemId: { in: armorSlots },
          characterId,
          isEquipped: true,
          equipmentSlot: EquipmentSlot.ARMOR,
        },
      });

      if (armorItem) {
        const itemDetails = this.itemsService.getItemById(armorItem.itemId);
        if (itemDetails && itemDetails.type === ItemType.ARMOR) {
          equipment.armor = {
            itemId: armorItem.itemId,
            name: itemDetails.name,
            quality: armorItem.quality as ItemQuality,
            condition: armorItem.condition,
            defenseBonus: itemDetails.combat?.defense || 0,
          };
        }
      }
    }

    return equipment;
  }

  /**
   * 裝備物品
   */
  async equipItem(
    characterId: string,
    itemId: string,
    equipmentSlot: EquipmentSlot,
  ): Promise<{
    success: boolean;
    message: string;
    newCapacity?: CapacityCalculation;
    unequippedItem?: string;
  }> {
    // 檢查物品是否在背包中
    const inventoryItem = await this.prisma.playerInventory.findFirst({
      where: {
        characterId,
        itemId,
        isEquipped: false,
      },
    });

    if (!inventoryItem) {
      return {
        success: false,
        message: "物品不在背包中或已裝備",
      };
    }

    const itemDetails = this.itemsService.getItemById(itemId);
    if (!itemDetails) {
      return {
        success: false,
        message: "物品不存在",
      };
    }

    // 檢查物品類型是否匹配裝備槽位
    if (!this.isItemValidForSlot(itemDetails.type, equipmentSlot)) {
      return {
        success: false,
        message: `${itemDetails.name} 無法裝備到 ${equipmentSlot} 槽位`,
      };
    }

    // 檢查是否需要卸下現有裝備
    let unequippedItem: string | undefined;
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return {
        success: false,
        message: "角色不存在",
      };
    }

    // 卸下現有裝備
    const currentEquippedItem = this.getCurrentEquippedItem(
      character,
      equipmentSlot,
    );
    if (currentEquippedItem) {
      await this.unequipItem(characterId, equipmentSlot);
      unequippedItem = currentEquippedItem;
    }

    // 裝備新物品
    await this.prisma.playerInventory.update({
      where: { id: inventoryItem.id },
      data: {
        isEquipped: true,
        equipmentSlot: equipmentSlot,
      },
    });

    // 更新角色裝備記錄
    const updateData: any = {};
    switch (equipmentSlot) {
      case EquipmentSlot.BACKPACK:
        updateData.equippedBackpack = itemId;
        break;
      case EquipmentSlot.WEAPON:
        updateData.equippedWeapon = itemId;
        break;
      case EquipmentSlot.ARMOR:
        updateData.equippedArmor = itemId;
        break;
    }

    await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: updateData,
    });

    // 重新計算容量
    const newCapacity = await this.calculateCapacity(characterId);

    // 如果是背包，更新角色的容量和體積
    if (equipmentSlot === EquipmentSlot.BACKPACK) {
      await this.prisma.gameCharacter.update({
        where: { id: characterId },
        data: {
          carryingCapacity: newCapacity.totalCapacity,
          maxVolume: newCapacity.totalVolume,
        },
      });
    }

    this.logger.log(
      `角色 ${characterId} 裝備了 ${itemDetails.name} 到 ${equipmentSlot} 槽位`,
    );

    return {
      success: true,
      message: `成功裝備 ${itemDetails.name}`,
      newCapacity,
      unequippedItem,
    };
  }

  /**
   * 卸下裝備
   */
  async unequipItem(
    characterId: string,
    equipmentSlot: EquipmentSlot,
  ): Promise<{
    success: boolean;
    message: string;
    unequippedItem?: string;
    newCapacity?: CapacityCalculation;
  }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
    });

    if (!character) {
      return {
        success: false,
        message: "角色不存在",
      };
    }

    const currentEquippedItem = this.getCurrentEquippedItem(
      character,
      equipmentSlot,
    );
    if (!currentEquippedItem) {
      return {
        success: false,
        message: "該槽位沒有裝備任何物品",
      };
    }

    // 檢查卸下背包是否會導致物品溢出
    if (equipmentSlot === EquipmentSlot.BACKPACK) {
      const wouldOverflow =
        await this.checkBackpackUnequipOverflow(characterId);
      if (wouldOverflow.hasOverflow) {
        return {
          success: false,
          message: `無法卸下背包：會導致${wouldOverflow.overflowCount}個物品無處存放。請先清理背包。`,
        };
      }
    }

    // 卸下裝備
    await this.prisma.playerInventory.updateMany({
      where: {
        characterId,
        itemId: currentEquippedItem,
        isEquipped: true,
        equipmentSlot: equipmentSlot,
      },
      data: {
        isEquipped: false,
        equipmentSlot: null,
      },
    });

    // 更新角色裝備記錄
    const updateData: any = {};
    switch (equipmentSlot) {
      case EquipmentSlot.BACKPACK:
        updateData.equippedBackpack = null;
        break;
      case EquipmentSlot.WEAPON:
        updateData.equippedWeapon = null;
        break;
      case EquipmentSlot.ARMOR:
        updateData.equippedArmor = null;
        break;
    }

    await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: updateData,
    });

    // 重新計算容量
    const newCapacity = await this.calculateCapacity(characterId);

    // 如果是背包，更新角色的容量和體積
    if (equipmentSlot === EquipmentSlot.BACKPACK) {
      await this.prisma.gameCharacter.update({
        where: { id: characterId },
        data: {
          carryingCapacity: newCapacity.totalCapacity,
          maxVolume: newCapacity.totalVolume,
        },
      });
    }

    const itemDetails = this.itemsService.getItemById(currentEquippedItem);
    this.logger.log(
      `角色 ${characterId} 卸下了 ${itemDetails?.name || currentEquippedItem} 從 ${equipmentSlot} 槽位`,
    );

    return {
      success: true,
      message: `成功卸下 ${itemDetails?.name || "裝備"}`,
      unequippedItem: currentEquippedItem,
      newCapacity,
    };
  }

  /**
   * 計算角色的負重和體積容量
   */
  async calculateCapacity(characterId: string): Promise<CapacityCalculation> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: {
        strength: true,
        baseStamina: true,
        baseCarryingCapacity: true,
        equippedBackpack: true,
      },
    });

    if (!character) {
      throw new BadRequestException("角色不存在");
    }

    // 基礎容量計算
    const baseCapacity = character.baseCarryingCapacity; // 雙手基礎 5kg
    const strengthBonus = character.strength * 2; // 每點力量+2kg
    const vitalityBonus = character.baseStamina * 0.5; // 每點體力+0.5kg

    // 背包加成
    let backpackBonus = 0;
    let backpackVolumeBonus = 0;
    let effectiveSlots = 8; // 雙手默認8格

    if (character.equippedBackpack) {
      const itemDetails = this.itemsService.getItemById(
        character.equippedBackpack,
      );
      if (itemDetails && itemDetails.equipment) {
        backpackBonus = itemDetails.equipment.capacityBonus || 0;
        backpackVolumeBonus = itemDetails.equipment.volumeBonus || 0;
        effectiveSlots = itemDetails.equipment.slots || 20;
      }
    }

    const totalCapacity =
      baseCapacity + strengthBonus + vitalityBonus + backpackBonus;

    // 體積計算
    const baseVolume = 2.0; // 雙手基礎 2 公升
    const totalVolume = baseVolume + backpackVolumeBonus;

    return {
      baseCapacity,
      strengthBonus,
      vitalityBonus,
      backpackBonus,
      totalCapacity,
      baseVolume,
      backpackVolumeBonus,
      totalVolume,
      effectiveSlots,
    };
  }

  // === 私有輔助方法 ===

  /**
   * 檢查物品類型是否適合裝備槽位
   */
  private isItemValidForSlot(itemType: ItemType, slot: EquipmentSlot): boolean {
    const validCombinations = {
      [EquipmentSlot.BACKPACK]: [ItemType.BACKPACK],
      [EquipmentSlot.WEAPON]: [ItemType.WEAPON],
      [EquipmentSlot.ARMOR]: [ItemType.ARMOR],
      [EquipmentSlot.HANDS]: [], // 雙手不能裝備任何物品
    };

    return validCombinations[slot].includes(itemType);
  }

  /**
   * 獲取當前裝備的物品ID
   */
  private getCurrentEquippedItem(
    character: any,
    slot: EquipmentSlot,
  ): string | null {
    switch (slot) {
      case EquipmentSlot.BACKPACK:
        return character.equippedBackpack;
      case EquipmentSlot.WEAPON:
        return character.equippedWeapon;
      case EquipmentSlot.ARMOR:
        return character.equippedArmor;
      default:
        return null;
    }
  }

  /**
   * 檢查卸下背包是否會導致物品溢出
   */
  private async checkBackpackUnequipOverflow(characterId: string): Promise<{
    hasOverflow: boolean;
    overflowCount: number;
  }> {
    const currentCapacity = await this.calculateCapacity(characterId);

    // 計算卸下背包後的容量
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { strength: true, baseStamina: true, baseCarryingCapacity: true },
    });

    if (!character) {
      return { hasOverflow: false, overflowCount: 0 };
    }

    const handsOnlyCapacity =
      character.baseCarryingCapacity +
      character.strength * 2 +
      character.baseStamina * 0.5;
    const handsOnlyVolume = 2.0;
    const handsOnlySlots = 8;

    // 檢查當前物品是否超出雙手容量
    const currentItems = await this.prisma.playerInventory.findMany({
      where: {
        characterId,
        isEquipped: false, // 只計算背包中的物品
      },
    });

    const totalWeight = currentItems.reduce(
      (sum, item) => sum + item.totalWeight,
      0,
    );
    const totalVolume = currentItems.reduce(
      (sum, item) => sum + item.totalVolume,
      0,
    );
    const itemCount = currentItems.length;

    const weightOverflow = totalWeight > handsOnlyCapacity;
    const volumeOverflow = totalVolume > handsOnlyVolume;
    const slotsOverflow = itemCount > handsOnlySlots;

    const hasOverflow = weightOverflow || volumeOverflow || slotsOverflow;
    const overflowCount = slotsOverflow ? itemCount - handsOnlySlots : 0;

    return { hasOverflow, overflowCount };
  }
}
