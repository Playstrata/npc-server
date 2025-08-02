import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";
import { ItemsService } from "../items/items.service";
import { InventoryService } from "../inventory/inventory.service";
import { NPCProfession, NPCType } from "../npcs/npcs.service";
import { ItemQuality } from "../items/items.types";

// 送貨任務類型
export enum DeliveryType {
  PLAYER_DELIVERY = "PLAYER_DELIVERY", // 玩家送貨
  NPC_DELIVERY = "NPC_DELIVERY", // NPC 自動送貨
  EMERGENCY = "EMERGENCY", // 緊急送貨
}

// 送貨難度
export enum DeliveryDifficulty {
  EASY = "EASY",
  NORMAL = "NORMAL",
  HARD = "HARD",
  EXTREME = "EXTREME",
}

// 送貨狀態
export enum DeliveryStatus {
  AVAILABLE = "AVAILABLE", // 可接取
  IN_PROGRESS = "IN_PROGRESS", // 進行中
  COMPLETED = "COMPLETED", // 已完成
  FAILED = "FAILED", // 失敗
  EXPIRED = "EXPIRED", // 過期
}

// 送貨任務配置
export interface DeliveryQuestConfig {
  id: string;
  deliveryType: DeliveryType;
  fromNpcId: string;
  toNpcId: string;
  fromLocation: string;
  toLocation: string;
  itemId: string;
  itemQuality: ItemQuality;
  quantity: number;
  totalWeight: number;
  requiredCapacity: number;
  timeLimit?: number; // 分鐘
  distance: number; // 公尺
  difficulty: DeliveryDifficulty;
  goldReward: number;
  experienceReward: number;
  reputationReward: number;
}

// NPC 送貨員配置
export interface NPCDeliveryWorkerConfig {
  npcId: string;
  name: string;
  carryingCapacity: number;
  speed: number; // 公尺/分鐘
  efficiency: number; // 效率倍數 (0.5-2.0)
  workSchedule: {
    startTime: string;
    endTime: string;
  };
  preferredRoutes: string[];
  reputation: number; // 送貨員聲譽
  isActive: boolean;
}

// 送貨路線
export interface DeliveryRoute {
  id: string;
  name: string;
  startLocation: string;
  endLocation: string;
  waypoints: Array<{
    location: string;
    x: number;
    y: number;
    estimatedTime: number; // 到達此點的預估時間(分鐘)
  }>;
  totalDistance: number;
  estimatedTime: number;
  difficulty: DeliveryDifficulty;
  isActive: boolean;
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private prisma: PrismaService,
    private itemsService: ItemsService,
    private inventoryService: InventoryService,
  ) {}

  /**
   * 每30分鐘生成新的送貨任務
   */
  @Cron("0,30 * * * *") // 每小時的0分和30分執行
  async generateDeliveryQuests(): Promise<void> {
    this.logger.log("開始生成送貨任務...");

    try {
      const activeNPCs = this.getActiveNPCs();
      let generatedQuests = 0;

      // 檢查是否需要生成新任務
      const existingQuestCount = await this.prisma.deliveryQuest.count({
        where: {
          status: DeliveryStatus.AVAILABLE,
        },
      });

      // 保持10-15個可用任務
      const targetQuests = 15;
      const questsToGenerate = Math.max(0, targetQuests - existingQuestCount);

      for (let i = 0; i < questsToGenerate; i++) {
        const quest = await this.generateRandomDeliveryQuest();
        if (quest) {
          generatedQuests++;
        }
      }

      this.logger.log(
        `生成了 ${generatedQuests} 個新的送貨任務，當前可用任務總數: ${existingQuestCount + generatedQuests}`,
      );
    } catch (error) {
      this.logger.error("生成送貨任務失敗:", error);
    }
  }

  /**
   * 每10分鐘執行 NPC 送貨員工作
   */
  @Cron("*/10 * * * *") // 每10分鐘執行
  async performNPCDeliveries(): Promise<void> {
    this.logger.log("開始執行 NPC 送貨工作...");

    try {
      const deliveryWorkers = this.getActiveDeliveryWorkers();
      let completedDeliveries = 0;

      for (const worker of deliveryWorkers) {
        if (this.isWorkingTime(worker)) {
          const completed = await this.performWorkerDelivery(worker);
          completedDeliveries += completed;
        }
      }

      this.logger.log(`NPC 送貨員完成了 ${completedDeliveries} 個送貨任務`);
    } catch (error) {
      this.logger.error("NPC 送貨工作執行失敗:", error);
    }
  }

  /**
   * 生成隨機送貨任務
   */
  private async generateRandomDeliveryQuest(): Promise<DeliveryQuestConfig | null> {
    const npcs = this.getActiveNPCs();
    const suppliers = npcs.filter((npc) => npc.hasInventory);
    const customers = npcs.filter((npc) => npc.needsSupplies);

    if (suppliers.length === 0 || customers.length === 0) {
      return null;
    }

    // 隨機選擇供應商和客戶
    const supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
    const customer = customers[Math.floor(Math.random() * customers.length)];

    if (supplier.id === customer.id) {
      return null; // 不能自己送給自己
    }

    // 隨機選擇物品
    const availableItems = [
      "ore-copper",
      "ore-iron",
      "wood-oak",
      "weapon-copper-sword",
    ];
    const itemId =
      availableItems[Math.floor(Math.random() * availableItems.length)];
    const item = this.itemsService.getItemById(itemId);

    if (!item) {
      return null;
    }

    // 計算任務參數
    const quantity = Math.floor(Math.random() * 10) + 1; // 1-10個
    const itemWeight = item.attributes?.weight || 1;
    const totalWeight = itemWeight * quantity;
    const distance = this.calculateDistance(
      supplier.location,
      customer.location,
    );
    const difficulty = this.calculateDifficulty(totalWeight, distance);
    const timeLimit = this.calculateTimeLimit(distance, difficulty);
    const rewards = this.calculateRewards(totalWeight, distance, difficulty);

    const questConfig: DeliveryQuestConfig = {
      id: `delivery-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      deliveryType: DeliveryType.PLAYER_DELIVERY,
      fromNpcId: supplier.id,
      toNpcId: customer.id,
      fromLocation: supplier.location.name,
      toLocation: customer.location.name,
      itemId,
      itemQuality: ItemQuality.COMMON,
      quantity,
      totalWeight,
      requiredCapacity: totalWeight * 1.1, // 需要10%緩衝
      timeLimit,
      distance,
      difficulty,
      goldReward: rewards.gold,
      experienceReward: rewards.experience,
      reputationReward: rewards.reputation,
    };

    // 保存到資料庫
    try {
      await this.prisma.deliveryQuest.create({
        data: {
          questId: questConfig.id,
          deliveryType: questConfig.deliveryType,
          fromNpcId: questConfig.fromNpcId,
          toNpcId: questConfig.toNpcId,
          fromLocation: questConfig.fromLocation,
          toLocation: questConfig.toLocation,
          itemId: questConfig.itemId,
          itemQuality: questConfig.itemQuality.toString(),
          quantity: questConfig.quantity,
          totalWeight: questConfig.totalWeight,
          requiredCapacity: questConfig.requiredCapacity,
          timeLimit: questConfig.timeLimit,
          distance: questConfig.distance,
          difficulty: questConfig.difficulty,
          goldReward: questConfig.goldReward,
          experienceReward: questConfig.experienceReward,
          reputationReward: questConfig.reputationReward,
          status: DeliveryStatus.AVAILABLE,
        },
      });

      this.logger.log(
        `生成送貨任務: ${questConfig.fromLocation} → ${questConfig.toLocation}, ${quantity}x ${itemId}`,
      );
      return questConfig;
    } catch (error) {
      this.logger.error("保存送貨任務失敗:", error);
      return null;
    }
  }

  /**
   * 執行 NPC 送貨員工作
   */
  private async performWorkerDelivery(
    worker: NPCDeliveryWorkerConfig,
  ): Promise<number> {
    // 尋找適合此送貨員的任務
    const availableQuests = await this.prisma.deliveryQuest.findMany({
      where: {
        status: DeliveryStatus.AVAILABLE,
        deliveryType: DeliveryType.NPC_DELIVERY,
        totalWeight: {
          lte: worker.carryingCapacity,
        },
      },
      take: 3, // 最多考慮3個任務
    });

    if (availableQuests.length === 0) {
      return 0;
    }

    // 選擇最適合的任務 (考慮路線偏好和效率)
    const selectedQuest = this.selectBestQuestForWorker(
      availableQuests,
      worker,
    );
    if (!selectedQuest) {
      return 0;
    }

    // 開始執行任務
    await this.prisma.deliveryQuest.update({
      where: { id: selectedQuest.id },
      data: {
        status: DeliveryStatus.IN_PROGRESS,
        assignedTo: worker.npcId,
        startedAt: new Date(),
      },
    });

    // 計算完成時間 (基於距離、速度和效率)
    const completionTime = this.calculateCompletionTime(selectedQuest, worker);

    // 模擬即時完成 (實際可以設定延遲)
    setTimeout(
      async () => {
        await this.completeNPCDelivery(selectedQuest.id, worker.npcId);
      },
      Math.min(completionTime * 60 * 1000, 60000),
    ); // 最多等待1分鐘 (演示用)

    this.logger.log(
      `NPC送貨員 ${worker.name} 開始執行任務: ${selectedQuest.fromLocation} → ${selectedQuest.toLocation}`,
    );
    return 1;
  }

  /**
   * 完成 NPC 送貨
   */
  private async completeNPCDelivery(
    questId: string,
    workerId: string,
  ): Promise<void> {
    try {
      await this.prisma.deliveryQuest.update({
        where: { id: questId },
        data: {
          status: DeliveryStatus.COMPLETED,
          completedAt: new Date(),
          pickupConfirmed: true,
          deliveryConfirmed: true,
        },
      });

      this.logger.log(`NPC送貨員 ${workerId} 完成了送貨任務 ${questId}`);
    } catch (error) {
      this.logger.error(`完成NPC送貨失敗 ${questId}:`, error);
    }
  }

  /**
   * 獲取可用的送貨任務 (供玩家選擇)
   */
  async getAvailableDeliveryQuests(
    characterId: string,
    maxWeight?: number,
  ): Promise<Array<DeliveryQuestConfig & { id: string }>> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { carryingCapacity: true, currentWeight: true },
    });

    if (!character) {
      return [];
    }

    const availableCapacity =
      character.carryingCapacity - character.currentWeight;
    const weightLimit = maxWeight
      ? Math.min(maxWeight, availableCapacity)
      : availableCapacity;

    const quests = await this.prisma.deliveryQuest.findMany({
      where: {
        status: DeliveryStatus.AVAILABLE,
        deliveryType: DeliveryType.PLAYER_DELIVERY,
        requiredCapacity: {
          lte: weightLimit,
        },
      },
      orderBy: [{ goldReward: "desc" }, { createdAt: "asc" }],
      take: 20,
    });

    return quests.map((quest) => ({
      id: quest.id,
      deliveryType: quest.deliveryType as DeliveryType,
      fromNpcId: quest.fromNpcId,
      toNpcId: quest.toNpcId,
      fromLocation: quest.fromLocation,
      toLocation: quest.toLocation,
      itemId: quest.itemId,
      itemQuality: quest.itemQuality as ItemQuality,
      quantity: quest.quantity,
      totalWeight: quest.totalWeight,
      requiredCapacity: quest.requiredCapacity,
      timeLimit: quest.timeLimit,
      distance: quest.distance,
      difficulty: quest.difficulty as DeliveryDifficulty,
      goldReward: quest.goldReward,
      experienceReward: quest.experienceReward,
      reputationReward: quest.reputationReward,
    }));
  }

  /**
   * 玩家接取送貨任務
   */
  async acceptDeliveryQuest(
    questId: string,
    characterId: string,
  ): Promise<{
    success: boolean;
    message: string;
    quest?: any;
  }> {
    const quest = await this.prisma.deliveryQuest.findUnique({
      where: { id: questId },
    });

    if (!quest) {
      return {
        success: false,
        message: "任務不存在",
      };
    }

    if (quest.status !== DeliveryStatus.AVAILABLE) {
      return {
        success: false,
        message: "任務已被其他人接取或已過期",
      };
    }

    // 檢查玩家負重能力
    const capacityInfo =
      await this.inventoryService.getCarryingCapacityInfo(characterId);
    if (capacityInfo.availableCapacity < quest.requiredCapacity) {
      return {
        success: false,
        message: `負重不足，需要 ${quest.requiredCapacity.toFixed(1)}kg 空間，目前只有 ${capacityInfo.availableCapacity.toFixed(1)}kg`,
      };
    }

    // 接取任務
    const updatedQuest = await this.prisma.deliveryQuest.update({
      where: { id: questId },
      data: {
        status: DeliveryStatus.IN_PROGRESS,
        assignedTo: characterId,
        startedAt: new Date(),
      },
    });

    this.logger.log(`玩家 ${characterId} 接取了送貨任務 ${questId}`);

    return {
      success: true,
      message: "成功接取送貨任務",
      quest: updatedQuest,
    };
  }

  // === 輔助方法 ===

  /**
   * 計算兩點間距離
   */
  private calculateDistance(location1: any, location2: any): number {
    // 簡化的距離計算 (實際可用更復雜的地圖系統)
    const dx = location1.x - location2.x;
    const dy = location1.y - location2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 計算任務難度
   */
  private calculateDifficulty(
    weight: number,
    distance: number,
  ): DeliveryDifficulty {
    const score = weight * 0.1 + distance * 0.01;

    if (score < 2) return DeliveryDifficulty.EASY;
    if (score < 5) return DeliveryDifficulty.NORMAL;
    if (score < 10) return DeliveryDifficulty.HARD;
    return DeliveryDifficulty.EXTREME;
  }

  /**
   * 計算時間限制
   */
  private calculateTimeLimit(
    distance: number,
    difficulty: DeliveryDifficulty,
  ): number {
    const baseTime = distance * 0.5; // 基礎時間
    const difficultyMultiplier = {
      [DeliveryDifficulty.EASY]: 2.0,
      [DeliveryDifficulty.NORMAL]: 1.5,
      [DeliveryDifficulty.HARD]: 1.2,
      [DeliveryDifficulty.EXTREME]: 1.0,
    };

    return Math.round(baseTime * difficultyMultiplier[difficulty]);
  }

  /**
   * 計算獎勵
   */
  private calculateRewards(
    weight: number,
    distance: number,
    difficulty: DeliveryDifficulty,
  ) {
    const baseDifficulty = {
      [DeliveryDifficulty.EASY]: 1.0,
      [DeliveryDifficulty.NORMAL]: 1.5,
      [DeliveryDifficulty.HARD]: 2.0,
      [DeliveryDifficulty.EXTREME]: 3.0,
    };

    const multiplier = baseDifficulty[difficulty];
    const baseReward = (weight * 2 + distance * 0.1) * multiplier;

    return {
      gold: Math.round(baseReward * 10),
      experience: Math.round(baseReward * 5),
      reputation: Math.round(baseReward * 0.5),
    };
  }

  /**
   * 選擇最適合送貨員的任務
   */
  private selectBestQuestForWorker(
    quests: any[],
    worker: NPCDeliveryWorkerConfig,
  ): any {
    let bestQuest = null;
    let bestScore = -1;

    for (const quest of quests) {
      let score = 0;

      // 偏好路線加分
      if (
        worker.preferredRoutes.includes(quest.fromLocation) ||
        worker.preferredRoutes.includes(quest.toLocation)
      ) {
        score += 10;
      }

      // 重量效率加分 (接近但不超過容量上限)
      const weightRatio = quest.totalWeight / worker.carryingCapacity;
      if (weightRatio > 0.7 && weightRatio <= 1.0) {
        score += 5;
      }

      // 距離因素 (較短距離優先)
      score += Math.max(0, 10 - quest.distance * 0.1);

      if (score > bestScore) {
        bestScore = score;
        bestQuest = quest;
      }
    }

    return bestQuest;
  }

  /**
   * 計算 NPC 送貨完成時間
   */
  private calculateCompletionTime(
    quest: any,
    worker: NPCDeliveryWorkerConfig,
  ): number {
    const baseTime = quest.distance / worker.speed;
    return baseTime / worker.efficiency;
  }

  /**
   * 檢查送貨員是否在工作時間
   */
  private isWorkingTime(worker: NPCDeliveryWorkerConfig): boolean {
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTime = currentHour * 60 + currentMinute;

    const [startHour, startMinute] = worker.workSchedule.startTime
      .split(":")
      .map(Number);
    const [endHour, endMinute] = worker.workSchedule.endTime
      .split(":")
      .map(Number);

    const startTime = startHour * 60 + startMinute;
    const endTime = endHour * 60 + endMinute;

    return currentTime >= startTime && currentTime < endTime;
  }

  /**
   * 獲取活躍的 NPC 數據 (模擬)
   */
  private getActiveNPCs(): Array<{
    id: string;
    location: { name: string; x: number; y: number };
    hasInventory: boolean;
    needsSupplies: boolean;
  }> {
    return [
      {
        id: "npc-001",
        location: { name: "forest_entrance", x: 100, y: 150 },
        hasInventory: true,
        needsSupplies: false,
      },
      {
        id: "npc-002",
        location: { name: "town_center", x: 200, y: 200 },
        hasInventory: true,
        needsSupplies: true,
      },
      {
        id: "npc-003",
        location: { name: "library", x: 180, y: 220 },
        hasInventory: false,
        needsSupplies: true,
      },
      {
        id: "npc-miner-001",
        location: { name: "copper_mine", x: 50, y: 100 },
        hasInventory: true,
        needsSupplies: false,
      },
      {
        id: "npc-blacksmith-001",
        location: { name: "blacksmith_shop", x: 190, y: 180 },
        hasInventory: true,
        needsSupplies: true,
      },
    ];
  }

  /**
   * 獲取活躍的送貨員 (模擬)
   */
  private getActiveDeliveryWorkers(): NPCDeliveryWorkerConfig[] {
    return [
      {
        npcId: "npc-delivery-001",
        name: "快腿湯姆",
        carryingCapacity: 30.0,
        speed: 50, // 公尺/分鐘
        efficiency: 1.2,
        workSchedule: {
          startTime: "08:00",
          endTime: "18:00",
        },
        preferredRoutes: ["town_center", "forest_entrance"],
        reputation: 85,
        isActive: true,
      },
      {
        npcId: "npc-delivery-002",
        name: "鐵背傑克",
        carryingCapacity: 80.0,
        speed: 30,
        efficiency: 1.0,
        workSchedule: {
          startTime: "06:00",
          endTime: "20:00",
        },
        preferredRoutes: ["copper_mine", "blacksmith_shop"],
        reputation: 92,
        isActive: true,
      },
    ];
  }
}
