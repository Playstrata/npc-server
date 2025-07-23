import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { ItemsService } from '../items/items.service';
import { ShopService } from './shop.service';
import { NPCProfession } from './npcs.service';
import { ItemQuality, ItemType } from '../items/items.types';

// NPC 專業行為配置
export interface NPCProfessionConfig {
  npcId: string;
  profession: NPCProfession;
  workSchedule: {
    startTime: string;    // "08:00"
    endTime: string;      // "18:00"
    workLocation: string;
    activityType: 'MINING' | 'WOODCUTTING' | 'CRAFTING' | 'TRADING' | 'RESEARCH';
  };
  productivity: {
    baseRate: number;     // 基礎產出率（每小時）
    qualityRate: number;  // 產出高品質物品的機率
    skillLevel: number;   // NPC 的技能等級
  };
  inventory: {
    maxCapacity: number;
    preferredItems: string[]; // 偏好收集的物品
    sellThreshold: number;    // 達到多少數量時販售
  };
  relationships: {
    suppliers: string[];      // 供應商 NPC ID
    customers: string[];      // 客戶 NPC ID
    competitors: string[];    // 競爭對手 NPC ID
  };
}

// NPC 工作產出
export interface WorkOutput {
  npcId: string;
  itemsProduced: Array<{
    itemId: string;
    quantity: number;
    quality: ItemQuality;
  }>;
  experienceGained: number;
  timestamp: Date;
  workHours: number;
}

@Injectable()
export class ProfessionService {
  private readonly logger = new Logger(ProfessionService.name);

  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
    private shopService: ShopService
  ) {}

  /**
   * 每小時執行 NPC 工作活動
   */
  @Cron('0 * * * *') // 每小時執行
  async performHourlyWork(): Promise<void> {
    this.logger.log('開始執行 NPC 每小時工作活動...');
    
    try {
      const activeNpcs = this.getActiveNPCs();
      let totalActivities = 0;

      for (const npcConfig of activeNpcs) {
        const isWorkingTime = this.isWorkingTime(npcConfig);
        
        if (isWorkingTime) {
          await this.performNPCWork(npcConfig);
          totalActivities++;
        }
      }

      this.logger.log(`完成 ${totalActivities} 個 NPC 的工作活動`);
    } catch (error) {
      this.logger.error('執行 NPC 工作活動失敗:', error);
    }
  }

  /**
   * 執行單個 NPC 的工作
   */
  async performNPCWork(npcConfig: NPCProfessionConfig): Promise<WorkOutput> {
    const workOutput: WorkOutput = {
      npcId: npcConfig.npcId,
      itemsProduced: [],
      experienceGained: 0,
      timestamp: new Date(),
      workHours: 1
    };

    switch (npcConfig.workSchedule.activityType) {
      case 'MINING':
        workOutput.itemsProduced = await this.performMining(npcConfig);
        break;
      case 'WOODCUTTING':
        workOutput.itemsProduced = await this.performWoodcutting(npcConfig);
        break;
      case 'CRAFTING':
        workOutput.itemsProduced = await this.performCrafting(npcConfig);
        break;
      case 'TRADING':
        await this.performTrading(npcConfig);
        break;
      case 'RESEARCH':
        workOutput.experienceGained = await this.performResearch(npcConfig);
        break;
    }

    // 檢查是否需要販售物品
    await this.checkAndSellItems(npcConfig, workOutput.itemsProduced);

    this.logger.log(`NPC ${npcConfig.npcId} 完成 ${npcConfig.workSchedule.activityType} 工作，產出 ${workOutput.itemsProduced.length} 種物品`);

    return workOutput;
  }

  /**
   * 執行挖礦工作
   */
  private async performMining(npcConfig: NPCProfessionConfig): Promise<Array<{
    itemId: string;
    quantity: number;
    quality: ItemQuality;
  }>> {
    const mineableOres = ['ore-copper', 'ore-tin', 'ore-iron', 'ore-silver'];
    const itemsProduced: Array<{ itemId: string; quantity: number; quality: ItemQuality }> = [];

    // 基於技能等級決定能挖什麼礦
    let availableOres = ['ore-copper'];
    if (npcConfig.productivity.skillLevel >= 10) availableOres.push('ore-tin');
    if (npcConfig.productivity.skillLevel >= 20) availableOres.push('ore-iron');
    if (npcConfig.productivity.skillLevel >= 40) availableOres.push('ore-silver');

    for (const oreId of availableOres) {
      const baseQuantity = npcConfig.productivity.baseRate;
      const actualQuantity = Math.floor(baseQuantity * (0.8 + Math.random() * 0.4)); // 80-120% 變動

      if (actualQuantity > 0) {
        // 決定品質
        const qualityRoll = Math.random();
        let quality: ItemQuality = ItemQuality.COMMON;
        
        if (qualityRoll < npcConfig.productivity.qualityRate * 0.1) {
          quality = ItemQuality.RARE;
        } else if (qualityRoll < npcConfig.productivity.qualityRate * 0.3) {
          quality = ItemQuality.UNCOMMON;
        }

        itemsProduced.push({
          itemId: oreId,
          quantity: actualQuantity,
          quality
        });
      }
    }

    return itemsProduced;
  }

  /**
   * 執行伐木工作
   */
  private async performWoodcutting(npcConfig: NPCProfessionConfig): Promise<Array<{
    itemId: string;
    quantity: number;
    quality: ItemQuality;
  }>> {
    const woodTypes = ['wood-oak', 'wood-pine', 'wood-hardwood'];
    const itemsProduced: Array<{ itemId: string; quantity: number; quality: ItemQuality }> = [];

    const baseQuantity = npcConfig.productivity.baseRate;
    const actualQuantity = Math.floor(baseQuantity * (0.9 + Math.random() * 0.2));

    if (actualQuantity > 0) {
      // 伐木工主要產出普通品質木材，偶爾有優質木材
      let quality: ItemQuality = ItemQuality.COMMON;
      if (Math.random() < npcConfig.productivity.qualityRate * 0.2) {
        quality = ItemQuality.UNCOMMON;
      }

      itemsProduced.push({
        itemId: 'wood-oak', // 暫時固定為橡木
        quantity: actualQuantity,
        quality
      });
    }

    return itemsProduced;
  }

  /**
   * 執行製作工作（鐵匠）
   */
  private async performCrafting(npcConfig: NPCProfessionConfig): Promise<Array<{
    itemId: string;
    quantity: number;
    quality: ItemQuality;
  }>> {
    // 鐵匠需要原材料才能製作
    const availableMaterials = await this.getNPCInventory(npcConfig.npcId);
    const itemsProduced: Array<{ itemId: string; quantity: number; quality: ItemQuality }> = [];

    // 檢查是否有足夠的材料製作物品
    const copperOre = availableMaterials.find(item => item.itemId === 'ore-copper');
    const ironOre = availableMaterials.find(item => item.itemId === 'ore-iron');

    // 製作銅劍
    if (copperOre && copperOre.quantity >= 6) { // 需要6個銅礦（先做錠再做劍）
      const swordsToMake = Math.floor(copperOre.quantity / 6);
      const actualSwords = Math.min(swordsToMake, npcConfig.productivity.baseRate);

      if (actualSwords > 0) {
        let quality: ItemQuality = ItemQuality.COMMON;
        if (Math.random() < npcConfig.productivity.qualityRate) {
          quality = ItemQuality.UNCOMMON;
        }

        itemsProduced.push({
          itemId: 'weapon-copper-sword',
          quantity: actualSwords,
          quality
        });

        // 消耗材料
        await this.consumeMaterials(npcConfig.npcId, [
          { itemId: 'ore-copper', quantity: actualSwords * 6 }
        ]);
      }
    }

    // 製作鐵劍（如果技能等級足夠）
    if (npcConfig.productivity.skillLevel >= 30 && ironOre && ironOre.quantity >= 8) {
      const swordsToMake = Math.floor(ironOre.quantity / 8);
      const actualSwords = Math.min(swordsToMake, Math.floor(npcConfig.productivity.baseRate * 0.5));

      if (actualSwords > 0) {
        let quality: ItemQuality = ItemQuality.UNCOMMON;
        if (Math.random() < npcConfig.productivity.qualityRate) {
          quality = ItemQuality.RARE;
        }

        itemsProduced.push({
          itemId: 'weapon-iron-sword',
          quantity: actualSwords,
          quality
        });

        // 消耗材料
        await this.consumeMaterials(npcConfig.npcId, [
          { itemId: 'ore-iron', quantity: actualSwords * 8 }
        ]);
      }
    }

    return itemsProduced;
  }

  /**
   * 執行貿易工作
   */
  private async performTrading(npcConfig: NPCProfessionConfig): Promise<void> {
    // 商人會主動向其他 NPC 採購物品
    for (const supplierId of npcConfig.relationships.suppliers) {
      await this.attemptPurchaseFromSupplier(npcConfig.npcId, supplierId);
    }

    // 商人也會向其他商人販售物品
    for (const customerId of npcConfig.relationships.customers) {
      await this.attemptSellToCustomer(npcConfig.npcId, customerId);
    }
  }

  /**
   * 執行研究工作
   */
  private async performResearch(npcConfig: NPCProfessionConfig): Promise<number> {
    // 學者 NPC 進行研究，增加經驗和知識
    const baseExperience = npcConfig.productivity.baseRate * 10;
    const actualExperience = Math.floor(baseExperience * (0.9 + Math.random() * 0.2));
    
    return actualExperience;
  }

  /**
   * 檢查並販售物品
   */
  private async checkAndSellItems(
    npcConfig: NPCProfessionConfig, 
    newItems: Array<{ itemId: string; quantity: number; quality: ItemQuality }>
  ): Promise<void> {
    const inventory = await this.getNPCInventory(npcConfig.npcId);

    for (const newItem of newItems) {
      const existingItem = inventory.find(item => 
        item.itemId === newItem.itemId && item.quality === newItem.quality
      );

      const totalQuantity = (existingItem?.quantity || 0) + newItem.quantity;

      // 如果達到銷售閾值，嘗試販售給客戶
      if (totalQuantity >= npcConfig.inventory.sellThreshold) {
        const quantityToSell = Math.floor(totalQuantity * 0.7); // 售出70%
        
        for (const customerId of npcConfig.relationships.customers) {
          const sellResult = await this.shopService.sellToNpc(
            npcConfig.npcId,
            customerId,
            newItem.itemId,
            quantityToSell,
            newItem.quality
          );

          if (sellResult.success) {
            this.logger.log(`NPC ${npcConfig.npcId} 向 ${customerId} 販售 ${quantityToSell}x ${newItem.itemId}，獲得 ${sellResult.transactionAmount} 金幣`);
            break; // 成功售出後跳出循環
          }
        }
      }
    }
  }

  /**
   * 從供應商採購
   */
  private async attemptPurchaseFromSupplier(buyerId: string, supplierId: string): Promise<void> {
    // 檢查供應商的庫存
    const supplierInventory = await this.getNPCInventory(supplierId);
    const buyerConfig = this.getNPCConfig(buyerId);

    for (const preferredItem of buyerConfig.inventory.preferredItems) {
      const availableItem = supplierInventory.find(item => item.itemId === preferredItem);
      
      if (availableItem && availableItem.quantity >= 5) {
        const quantityToBuy = Math.min(availableItem.quantity, 10);
        
        // 嘗試購買
        const purchaseResult = await this.shopService.sellToNpc(
          supplierId,
          buyerId,
          availableItem.itemId,
          quantityToBuy,
          availableItem.quality
        );

        if (purchaseResult.success) {
          this.logger.log(`NPC ${buyerId} 從 ${supplierId} 採購 ${quantityToBuy}x ${availableItem.itemId}`);
        }
      }
    }
  }

  /**
   * 向客戶販售
   */
  private async attemptSellToCustomer(sellerId: string, customerId: string): Promise<void> {
    const sellerInventory = await this.getNPCInventory(sellerId);
    
    for (const item of sellerInventory) {
      if (item.quantity >= 3) { // 只有庫存足夠時才販售
        const quantityToSell = Math.floor(item.quantity * 0.3); // 售出30%
        
        const sellResult = await this.shopService.sellToNpc(
          sellerId,
          customerId,
          item.itemId,
          quantityToSell,
          item.quality
        );

        if (sellResult.success) {
          this.logger.log(`NPC ${sellerId} 向 ${customerId} 販售 ${quantityToSell}x ${item.itemId}`);
        }
      }
    }
  }

  /**
   * 檢查是否在工作時間
   */
  private isWorkingTime(npcConfig: NPCProfessionConfig): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = npcConfig.workSchedule.startTime.split(':').map(Number);
    const [endHour, endMinute] = npcConfig.workSchedule.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime < endTime;
  }

  /**
   * 獲取活躍的 NPC 配置
   */
  private getActiveNPCs(): NPCProfessionConfig[] {
    // 返回模擬的 NPC 配置，實際應該從資料庫讀取
    return [
      {
        npcId: 'npc-miner-001',
        profession: NPCProfession.MINER,
        workSchedule: {
          startTime: '06:00',
          endTime: '18:00',
          workLocation: 'copper_mine',
          activityType: 'MINING'
        },
        productivity: {
          baseRate: 5,      // 每小時挖5個礦石
          qualityRate: 0.15, // 15%機率產出高品質
          skillLevel: 25
        },
        inventory: {
          maxCapacity: 100,
          preferredItems: ['ore-copper', 'ore-tin', 'ore-iron'],
          sellThreshold: 20
        },
        relationships: {
          suppliers: [],
          customers: ['npc-blacksmith-001', 'npc-002'], // 賣給鐵匠和艾莉絲
          competitors: []
        }
      },
      {
        npcId: 'npc-blacksmith-001',
        profession: NPCProfession.CRAFTER,
        workSchedule: {
          startTime: '08:00',
          endTime: '17:00',
          workLocation: 'blacksmith_shop',
          activityType: 'CRAFTING'
        },
        productivity: {
          baseRate: 3,      // 每小時製作3件物品
          qualityRate: 0.25, // 25%機率產出高品質
          skillLevel: 45
        },
        inventory: {
          maxCapacity: 50,
          preferredItems: ['ore-copper', 'ore-iron', 'ore-silver'],
          sellThreshold: 5
        },
        relationships: {
          suppliers: ['npc-miner-001'], // 從礦工購買原料
          customers: ['npc-002'],       // 賣給武器商人艾莉絲
          competitors: []
        }
      }
    ];
  }

  /**
   * 獲取 NPC 庫存（模擬數據）
   */
  private async getNPCInventory(npcId: string): Promise<Array<{
    itemId: string;
    quantity: number;
    quality: ItemQuality;
  }>> {
    // 實際應該從資料庫讀取
    return [];
  }

  /**
   * 消耗材料
   */
  private async consumeMaterials(npcId: string, materials: Array<{
    itemId: string;
    quantity: number;
  }>): Promise<void> {
    // 實際應該更新資料庫中的 NPC 庫存
    this.logger.log(`NPC ${npcId} 消耗材料:`, materials);
  }

  /**
   * 獲取 NPC 配置
   */
  private getNPCConfig(npcId: string): NPCProfessionConfig {
    const configs = this.getActiveNPCs();
    const config = configs.find(c => c.npcId === npcId);
    
    // 返回預設配置
    return config || {
      npcId,
      profession: NPCProfession.CRAFTER,
      workSchedule: {
        startTime: '09:00',
        endTime: '17:00',
        workLocation: 'shop',
        activityType: 'TRADING'
      },
      productivity: {
        baseRate: 1,
        qualityRate: 0.1,
        skillLevel: 10
      },
      inventory: {
        maxCapacity: 20,
        preferredItems: [],
        sellThreshold: 10
      },
      relationships: {
        suppliers: [],
        customers: [],
        competitors: []
      }
    };
  }
}