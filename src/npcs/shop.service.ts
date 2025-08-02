import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ItemsService } from "../items/items.service";
import { ItemQuality, BaseItem } from "../items/items.types";

// 商店庫存物品
export interface ShopInventoryItem {
  itemId: string;
  quality: ItemQuality;
  quantity: number;
  basePrice: number;
  isHidden: boolean; // 是否為隱藏商品
  unlockConditions?: {
    // 解鎖條件
    friendshipLevel?: string;
    questCompleted?: string[];
    minimumReputation?: number;
    playerLevel?: number;
    timeOfDay?: string[]; // 特定時間才出現
    seasonalItem?: boolean; // 季節性物品
  };
  restockInfo?: {
    // 補貨資訊
    autoRestock: boolean;
    restockQuantity: number;
    restockInterval: number; // 補貨間隔（小時）
    lastRestocked: Date;
    supplier?: string; // 供應商 NPC ID
  };
  dynamicPricing?: {
    // 動態定價
    demandFactor: number; // 需求因子
    supplyFactor: number; // 供給因子
    priceHistory: Array<{
      price: number;
      timestamp: Date;
    }>;
  };
}

// 商店配置
export interface ShopConfig {
  npcId: string;
  shopType: "GENERAL" | "WEAPON" | "ARMOR" | "MATERIAL" | "MAGIC" | "FOOD";
  markup: number; // 零售加價倍數
  maxInventorySlots: number;
  specializations: string[]; // 專精物品類型
  operatingHours: {
    open: string; // 開門時間 "09:00"
    close: string; // 關門時間 "18:00"
  };
  relationships: {
    // 與供應商的關係
    suppliers: Array<{
      npcId: string;
      itemTypes: string[];
      preferredSupplier: boolean;
      contractTerms?: {
        bulkDiscountRate: number;
        exclusiveDeals: string[];
        paymentTerms: number; // 付款天數
      };
    }>;
  };
}

@Injectable()
export class ShopService {
  private readonly logger = new Logger(ShopService.name);

  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
  ) {}

  /**
   * 獲取商店庫存
   */
  async getShopInventory(npcId: string): Promise<ShopInventoryItem[]> {
    // 這裡應該從資料庫讀取，目前返回模擬數據
    return this.getMockShopInventory(npcId);
  }

  /**
   * 獲取玩家可見的商店物品
   */
  async getVisibleShopItems(
    npcId: string,
    playerId: string,
    friendshipLevel: string,
    playerLevel: number = 1,
  ): Promise<
    Array<ShopInventoryItem & { item: BaseItem; adjustedPrice: number }>
  > {
    const inventory = await this.getShopInventory(npcId);
    const currentTime = new Date();
    const timeOfDay = this.getTimeOfDay(currentTime);

    const visibleItems: Array<
      ShopInventoryItem & { item: BaseItem; adjustedPrice: number }
    > = [];

    for (const shopItem of inventory) {
      // 檢查是否為隱藏物品
      if (
        shopItem.isHidden &&
        !this.checkUnlockConditions(
          shopItem.unlockConditions,
          friendshipLevel,
          playerLevel,
          timeOfDay,
        )
      ) {
        continue; // 跳過隱藏物品
      }

      const item = this.itemsService.getItemById(shopItem.itemId);
      if (!item) continue;

      // 計算動態價格
      const adjustedPrice = this.calculateDynamicPrice(shopItem);

      visibleItems.push({
        ...shopItem,
        item,
        adjustedPrice,
      });
    }

    return visibleItems;
  }

  /**
   * 檢查解鎖條件
   */
  private checkUnlockConditions(
    conditions: ShopInventoryItem["unlockConditions"],
    friendshipLevel: string,
    playerLevel: number,
    timeOfDay: string,
  ): boolean {
    if (!conditions) return true;

    // 檢查友好度要求
    if (conditions.friendshipLevel) {
      const friendshipLevels = [
        "ENEMY",
        "HOSTILE",
        "UNFRIENDLY",
        "NEUTRAL",
        "FRIENDLY",
        "CLOSE_FRIEND",
        "BEST_FRIEND",
        "HERO",
      ];
      const requiredIndex = friendshipLevels.indexOf(
        conditions.friendshipLevel,
      );
      const currentIndex = friendshipLevels.indexOf(friendshipLevel);

      if (currentIndex < requiredIndex) return false;
    }

    // 檢查玩家等級
    if (conditions.playerLevel && playerLevel < conditions.playerLevel) {
      return false;
    }

    // 檢查時間限制
    if (conditions.timeOfDay && !conditions.timeOfDay.includes(timeOfDay)) {
      return false;
    }

    // TODO: 檢查任務完成條件
    // TODO: 檢查季節性物品

    return true;
  }

  /**
   * 計算動態價格
   */
  private calculateDynamicPrice(shopItem: ShopInventoryItem): number {
    let adjustedPrice = shopItem.basePrice;

    if (shopItem.dynamicPricing) {
      const demandMultiplier = shopItem.dynamicPricing.demandFactor;
      const supplyMultiplier = shopItem.dynamicPricing.supplyFactor;

      // 庫存影響價格（庫存越少價格越高）
      const stockMultiplier =
        shopItem.quantity > 10
          ? 1.0
          : shopItem.quantity > 5
            ? 1.1
            : shopItem.quantity > 2
              ? 1.2
              : 1.5;

      adjustedPrice = Math.round(
        shopItem.basePrice *
          demandMultiplier *
          supplyMultiplier *
          stockMultiplier,
      );
    }

    return adjustedPrice;
  }

  /**
   * 執行商店進貨
   */
  async restockShop(npcId: string): Promise<{
    success: boolean;
    itemsRestocked: Array<{
      itemId: string;
      quantity: number;
      cost: number;
      supplier?: string;
    }>;
    totalCost: number;
  }> {
    const inventory = await this.getShopInventory(npcId);
    const shopConfig = this.getShopConfig(npcId);

    let totalCost = 0;
    const itemsRestocked: Array<{
      itemId: string;
      quantity: number;
      cost: number;
      supplier?: string;
    }> = [];

    for (const item of inventory) {
      if (item.restockInfo && item.restockInfo.autoRestock) {
        const timeSinceLastRestock =
          Date.now() - item.restockInfo.lastRestocked.getTime();
        const restockIntervalMs =
          item.restockInfo.restockInterval * 60 * 60 * 1000; // 小時轉毫秒

        if (timeSinceLastRestock >= restockIntervalMs && item.quantity < 10) {
          // 庫存低於 10 時補貨
          const restockQuantity = item.restockInfo.restockQuantity;
          const supplier = item.restockInfo.supplier;

          // 計算進貨成本
          const wholesalePrice = this.getWholesalePrice(
            item.itemId,
            supplier,
            shopConfig,
          );
          const restockCost = wholesalePrice * restockQuantity;

          // 更新庫存
          item.quantity += restockQuantity;
          item.restockInfo.lastRestocked = new Date();

          itemsRestocked.push({
            itemId: item.itemId,
            quantity: restockQuantity,
            cost: restockCost,
            supplier,
          });

          totalCost += restockCost;

          this.logger.log(
            `[ShopService] NPC ${npcId} 從供應商 ${supplier} 補貨 ${restockQuantity}x ${item.itemId}，成本 ${restockCost}`,
          );
        }
      }
    }

    return {
      success: true,
      itemsRestocked,
      totalCost,
    };
  }

  /**
   * 獲取批發價格
   */
  private getWholesalePrice(
    itemId: string,
    supplierId: string | undefined,
    shopConfig: ShopConfig,
  ): number {
    const item = this.itemsService.getItemById(itemId);
    const basePrice = item?.marketInfo?.basePrice || 0;

    // 基礎批發價格通常是零售價的 60-80%
    let wholesaleMultiplier = 0.7;

    // 如果有供應商關係，可能有更好的價格
    if (supplierId) {
      const supplierRelation = shopConfig.relationships.suppliers.find(
        (s) => s.npcId === supplierId,
      );
      if (supplierRelation?.contractTerms?.bulkDiscountRate) {
        wholesaleMultiplier *=
          1 - supplierRelation.contractTerms.bulkDiscountRate;
      }
    }

    return Math.round(basePrice * wholesaleMultiplier);
  }

  /**
   * 處理玩家購買
   */
  async purchaseItem(
    npcId: string,
    playerId: string,
    itemId: string,
    quantity: number,
    friendshipPriceModifier: number = 1.0,
  ): Promise<{
    success: boolean;
    message: string;
    finalPrice?: number;
    itemsReceived?: Array<{
      itemId: string;
      quality: ItemQuality;
      quantity: number;
    }>;
  }> {
    const inventory = await this.getShopInventory(npcId);
    const shopItem = inventory.find((item) => item.itemId === itemId);

    if (!shopItem) {
      return {
        success: false,
        message: "商品不存在",
      };
    }

    if (shopItem.quantity < quantity) {
      return {
        success: false,
        message: "庫存不足",
      };
    }

    // 計算最終價格
    const dynamicPrice = this.calculateDynamicPrice(shopItem);
    const finalPrice = Math.round(
      dynamicPrice * quantity * friendshipPriceModifier,
    );

    // 更新庫存
    shopItem.quantity -= quantity;

    // 更新動態定價（購買行為影響需求）
    if (shopItem.dynamicPricing) {
      shopItem.dynamicPricing.demandFactor = Math.min(
        shopItem.dynamicPricing.demandFactor * 1.02, // 需求略微上升
        2.0, // 最大需求倍數
      );

      // 記錄價格歷史
      shopItem.dynamicPricing.priceHistory.push({
        price: dynamicPrice,
        timestamp: new Date(),
      });

      // 只保留最近 10 條價格記錄
      if (shopItem.dynamicPricing.priceHistory.length > 10) {
        shopItem.dynamicPricing.priceHistory.shift();
      }
    }

    this.logger.log(
      `[ShopService] 玩家 ${playerId} 從 NPC ${npcId} 購買 ${quantity}x ${itemId}，支付 ${finalPrice} 金幣`,
    );

    return {
      success: true,
      message: `成功購買 ${quantity}x ${itemId}`,
      finalPrice,
      itemsReceived: [
        {
          itemId,
          quality: shopItem.quality,
          quantity,
        },
      ],
    };
  }

  /**
   * NPC 向其他 NPC 販售物品
   */
  async sellToNpc(
    sellerNpcId: string,
    buyerNpcId: string,
    itemId: string,
    quantity: number,
    quality: ItemQuality,
  ): Promise<{
    success: boolean;
    message: string;
    transactionAmount?: number;
  }> {
    const item = this.itemsService.getItemById(itemId);
    if (!item) {
      return {
        success: false,
        message: "物品不存在",
      };
    }

    const sellerConfig = this.getShopConfig(sellerNpcId);
    const buyerConfig = this.getShopConfig(buyerNpcId);

    // 檢查買家是否需要這種物品
    const isNeededItem =
      buyerConfig.specializations.includes(item.type) ||
      buyerConfig.shopType === "GENERAL";

    if (!isNeededItem) {
      return {
        success: false,
        message: `${buyerNpcId} 不需要 ${item.name}`,
      };
    }

    // 計算交易價格
    const basePrice = item.marketInfo?.basePrice || 0;
    const qualityMultiplier = this.getQualityPriceMultiplier(quality);
    const wholesalePrice = Math.round(basePrice * qualityMultiplier * 0.6); // 批發價
    const transactionAmount = wholesalePrice * quantity;

    // 更新買家庫存
    const buyerInventory = await this.getShopInventory(buyerNpcId);
    let existingItem = buyerInventory.find(
      (i) => i.itemId === itemId && i.quality === quality,
    );

    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      // 創建新的庫存項目
      const newShopItem: ShopInventoryItem = {
        itemId,
        quality,
        quantity,
        basePrice: Math.round(
          basePrice * qualityMultiplier * buyerConfig.markup,
        ),
        isHidden: false,
        restockInfo: {
          autoRestock: true,
          restockQuantity: quantity,
          restockInterval: 24, // 24小時
          lastRestocked: new Date(),
          supplier: sellerNpcId,
        },
        dynamicPricing: {
          demandFactor: 1.0,
          supplyFactor: 1.0,
          priceHistory: [],
        },
      };

      buyerInventory.push(newShopItem);
    }

    this.logger.log(
      `[ShopService] NPC ${sellerNpcId} 向 NPC ${buyerNpcId} 販售 ${quantity}x ${itemId}，獲得 ${transactionAmount} 金幣`,
    );

    return {
      success: true,
      message: `成功向 ${buyerNpcId} 販售 ${quantity}x ${item.name}`,
      transactionAmount,
    };
  }

  /**
   * 獲取時段
   */
  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();

    if (hour >= 6 && hour < 12) return "morning";
    if (hour >= 12 && hour < 18) return "afternoon";
    if (hour >= 18 && hour < 22) return "evening";
    return "night";
  }

  /**
   * 獲取品質價格倍數
   */
  private getQualityPriceMultiplier(quality: ItemQuality): number {
    const multipliers = {
      [ItemQuality.POOR]: 0.5,
      [ItemQuality.COMMON]: 1.0,
      [ItemQuality.UNCOMMON]: 1.5,
      [ItemQuality.RARE]: 2.5,
      [ItemQuality.EPIC]: 4.0,
      [ItemQuality.LEGENDARY]: 7.0,
      [ItemQuality.ARTIFACT]: 12.0,
    };

    return multipliers[quality];
  }

  /**
   * 模擬商店庫存數據（實際應該從資料庫讀取）
   */
  private getMockShopInventory(npcId: string): ShopInventoryItem[] {
    // 根據不同 NPC 返回不同的庫存
    if (npcId === "npc-002") {
      // 艾莉絲的商店
      return [
        {
          itemId: "weapon-copper-sword",
          quality: ItemQuality.COMMON,
          quantity: 5,
          basePrice: 60,
          isHidden: false,
          restockInfo: {
            autoRestock: true,
            restockQuantity: 3,
            restockInterval: 48,
            lastRestocked: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1天前
            supplier: "npc-blacksmith-001",
          },
          dynamicPricing: {
            demandFactor: 1.0,
            supplyFactor: 1.0,
            priceHistory: [],
          },
        },
        {
          itemId: "weapon-iron-sword",
          quality: ItemQuality.UNCOMMON,
          quantity: 2,
          basePrice: 180,
          isHidden: true, // 隱藏商品
          unlockConditions: {
            friendshipLevel: "CLOSE_FRIEND",
            minimumReputation: 50,
          },
          restockInfo: {
            autoRestock: true,
            restockQuantity: 1,
            restockInterval: 72,
            lastRestocked: new Date(),
            supplier: "npc-blacksmith-001",
          },
          dynamicPricing: {
            demandFactor: 1.2,
            supplyFactor: 0.8,
            priceHistory: [],
          },
        },
        {
          itemId: "ore-silver",
          quality: ItemQuality.RARE,
          quantity: 8,
          basePrice: 42,
          isHidden: true, // 只在夜晚出現的神秘商品
          unlockConditions: {
            timeOfDay: ["night"],
            friendshipLevel: "FRIENDLY",
          },
          dynamicPricing: {
            demandFactor: 1.5,
            supplyFactor: 0.9,
            priceHistory: [],
          },
        },
      ];
    }

    // 預設庫存
    return [
      {
        itemId: "ore-copper",
        quality: ItemQuality.COMMON,
        quantity: 20,
        basePrice: 6,
        isHidden: false,
        restockInfo: {
          autoRestock: true,
          restockQuantity: 15,
          restockInterval: 24,
          lastRestocked: new Date(),
        },
        dynamicPricing: {
          demandFactor: 1.0,
          supplyFactor: 1.0,
          priceHistory: [],
        },
      },
    ];
  }

  /**
   * 獲取商店配置（實際應該從資料庫讀取）
   */
  private getShopConfig(npcId: string): ShopConfig {
    // 模擬數據
    return {
      npcId,
      shopType: "GENERAL",
      markup: 1.4, // 40% 加價
      maxInventorySlots: 20,
      specializations: ["WEAPON", "ARMOR", "TOOL"],
      operatingHours: {
        open: "09:00",
        close: "18:00",
      },
      relationships: {
        suppliers: [
          {
            npcId: "npc-blacksmith-001",
            itemTypes: ["WEAPON", "ARMOR"],
            preferredSupplier: true,
            contractTerms: {
              bulkDiscountRate: 0.1, // 10% 批量折扣
              exclusiveDeals: ["weapon-iron-sword"],
              paymentTerms: 7, // 7天付款
            },
          },
        ],
      },
    };
  }
}
