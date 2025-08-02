import { Injectable, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { ShopService } from "./shop.service";
import { DialogueService, NPCPersonality, NPCMood } from "./dialogue.service";

export enum NPCType {
  QUEST_GIVER = "QUEST_GIVER", // 任務發布者
  MERCHANT = "MERCHANT", // 商人
  TRAINER = "TRAINER", // 訓練師
  GUARD = "GUARD", // 守衛
  VILLAGER = "VILLAGER", // 村民
  BLACKSMITH = "BLACKSMITH", // 鍛造師
  ALCHEMIST = "ALCHEMIST", // 煉金術師
  INNKEEPER = "INNKEEPER", // 旅店老闆
}

export enum NPCProfession {
  WOODCUTTER = "WOODCUTTER", // 伐木工
  MINER = "MINER", // 礦工
  FARMER = "FARMER", // 農夫
  FISHER = "FISHER", // 漁夫
  HUNTER = "HUNTER", // 獵人
  CRAFTER = "CRAFTER", // 工匠
  HEALER = "HEALER", // 治療師
  SCHOLAR = "SCHOLAR", // 學者
  DELIVERY_WORKER = "DELIVERY_WORKER", // 送貨員
}

export enum FriendshipLevel {
  ENEMY = "ENEMY", // 敵人 (-100 to -61)
  HOSTILE = "HOSTILE", // 敵對 (-60 to -21)
  UNFRIENDLY = "UNFRIENDLY", // 不友善 (-20 to -1)
  NEUTRAL = "NEUTRAL", // 中立 (0 to 19)
  FRIENDLY = "FRIENDLY", // 友善 (20 to 49)
  CLOSE_FRIEND = "CLOSE_FRIEND", // 好友 (50 to 79)
  BEST_FRIEND = "BEST_FRIEND", // 摯友 (80 to 99)
  HERO = "HERO", // 英雄 (100+)
}

export interface FriendshipInfo {
  level: FriendshipLevel;
  score: number;
  personalReputation: number;
  villageReputation: number;
  priceModifier: number; // 價格調整倍數
  discountPercentage: number; // 折扣百分比（正數為折扣，負數為加價）
  title: string; // 稱謂
}

export interface NPCDialogue {
  id: string;
  condition?: string;
  text: string;
  options?: Array<{
    id: string;
    text: string;
    action?: string;
    nextDialogueId?: string;
  }>;
}

export interface NPCData {
  id: string;
  name: string;
  type: NPCType;
  profession?: NPCProfession;
  level: number;
  location: {
    mapId: string;
    x: number;
    y: number;
  };
  appearance: {
    sprite: string;
    description: string;
  };
  personality: {
    traits: string[];
    mood: "happy" | "neutral" | "sad" | "angry" | "excited";
  };
  dialogues: NPCDialogue[];
  quests: string[]; // 可提供的任務ID
  shop?: {
    items: Array<{
      itemId: string;
      price: number;
      stock: number;
    }>;
  };
  schedule: Array<{
    time: string;
    location: string;
    activity: string;
  }>;
  relationships: {
    [playerId: string]: {
      reputation: number;
      lastInteraction: Date;
    };
  };
  // 新增：NPC 社交網絡和群體聲譽系統
  socialNetwork: {
    friends: string[]; // 朋友 NPC ID 列表
    influence: number; // 影響力等級 (1-10)
    gossipLevel: number; // 八卦傾向 (1-10)
    trustLevel: number; // 謹慎程度 (1-10)
  };
  villageMemory: {
    [playerId: string]: {
      knownEvents: Array<{
        type:
          | "quest_completed"
          | "quest_failed"
          | "trade_success"
          | "rude_behavior"
          | "helpful_action";
        description: string;
        impact: number; // -10 到 +10
        timestamp: Date;
        source: string; // 消息來源 NPC ID
        verified: boolean; // 是否親眼所見
      }>;
      overallImpression: number; // 總體印象 (-100 到 +100)
      lastUpdated: Date;
    };
  };
}

@Injectable()
export class NpcsService {
  constructor(
    private prisma: PrismaService,
    private shopService: ShopService,
    private dialogueService: DialogueService,
  ) {}

  /**
   * 獲取所有 NPC 資料
   */
  async getAllNPCs(): Promise<NPCData[]> {
    // 模擬 NPC 資料，實際應該從資料庫獲取
    const mockNPCs: NPCData[] = [
      {
        id: "npc-001",
        name: "老杰克",
        type: NPCType.QUEST_GIVER,
        profession: NPCProfession.WOODCUTTER,
        level: 25,
        location: {
          mapId: "starter_town",
          x: 100,
          y: 150,
        },
        appearance: {
          sprite: "npc_woodcutter_old",
          description: "一個經驗豐富的老伐木工，鬍子花白，眼神銳利",
        },
        personality: {
          traits: ["友善", "經驗豐富", "健談"],
          mood: "happy",
        },
        dialogues: [
          {
            id: "greeting",
            text: "哈囉，年輕的冒險者！我是老杰克，這裡最有經驗的伐木工。你看起來像是個有潛力的人！",
            options: [
              {
                id: "quest",
                text: "您有什麼任務需要幫助嗎？",
                action: "show_quests",
              },
              {
                id: "chat",
                text: "告訴我一些關於這個地方的事情",
                nextDialogueId: "about_town",
              },
              {
                id: "goodbye",
                text: "再見，老杰克",
                action: "end_conversation",
              },
            ],
          },
          {
            id: "about_town",
            text: "這個小鎮被森林包圍，木材是我們的主要資源。但最近森林裡出現了一些奇怪的生物，讓伐木工作變得危險了。",
            options: [
              {
                id: "help",
                text: "我可以幫忙處理那些生物",
                action: "show_quests",
              },
              {
                id: "back",
                text: "我想問問其他事情",
                nextDialogueId: "greeting",
              },
            ],
          },
        ],
        quests: ["quest-001", "quest-004"],
        schedule: [
          {
            time: "08:00",
            location: "forest_entrance",
            activity: "檢查伐木進度",
          },
          {
            time: "12:00",
            location: "town_center",
            activity: "午餐時間",
          },
          {
            time: "18:00",
            location: "tavern",
            activity: "晚餐和聊天",
          },
        ],
        relationships: {},
        socialNetwork: {
          friends: ["npc-002", "npc-003"], // 與商人艾莉絲和學者奧丁有聯繫
          influence: 6, // 中等影響力（經驗豐富的老工匠）
          gossipLevel: 4, // 不太愛八卦，比較實在
          trustLevel: 8, // 謹慎，需要時間建立信任
        },
        villageMemory: {},
      },
      {
        id: "npc-002",
        name: "艾莉絲",
        type: NPCType.MERCHANT,
        profession: NPCProfession.CRAFTER,
        level: 30,
        location: {
          mapId: "starter_town",
          x: 200,
          y: 100,
        },
        appearance: {
          sprite: "npc_merchant_female",
          description: "一位年輕的女性商人，穿著精緻的服裝，總是面帶微笑",
        },
        personality: {
          traits: ["精明", "友好", "商業頭腦"],
          mood: "happy",
        },
        dialogues: [
          {
            id: "greeting",
            text: "歡迎來到我的商店！我是艾莉絲，這裡有最好的裝備和道具。你需要什麼嗎？",
            options: [
              {
                id: "shop",
                text: "我想看看你的商品",
                action: "open_shop",
              },
              {
                id: "craft",
                text: "你能幫我製作裝備嗎？",
                action: "open_crafting",
              },
              {
                id: "chat",
                text: "這些商品是從哪裡來的？",
                nextDialogueId: "about_goods",
              },
              {
                id: "goodbye",
                text: "謝謝，我等會再來",
                action: "end_conversation",
              },
            ],
          },
          {
            id: "about_goods",
            text: "我的商品來自各地的工匠和冒險者。我特別專精於裝備強化和客製化製作。如果你有特殊需求，我很樂意幫助！",
            options: [
              {
                id: "enhance",
                text: "裝備強化聽起來不錯",
                action: "show_enhancement",
              },
              {
                id: "back",
                text: "讓我看看其他選項",
                nextDialogueId: "greeting",
              },
            ],
          },
        ],
        quests: ["quest-005"],
        shop: {
          items: [
            { itemId: "item-wooden-sword", price: 100, stock: 5 },
            { itemId: "item-leather-armor", price: 250, stock: 3 },
            { itemId: "item-health-potion", price: 50, stock: 20 },
            { itemId: "item-mana-potion", price: 50, stock: 15 },
          ],
        },
        schedule: [
          {
            time: "09:00",
            location: "shop",
            activity: "開店營業",
          },
          {
            time: "18:00",
            location: "shop",
            activity: "整理商品",
          },
          {
            time: "20:00",
            location: "home",
            activity: "回家休息",
          },
        ],
        relationships: {},
        socialNetwork: {
          friends: ["npc-001", "npc-003"], // 與伐木工老杰克和學者奧丁有聯繫
          influence: 8, // 高影響力（村莊主要商人）
          gossipLevel: 8, // 愛聽消息，消息靈通
          trustLevel: 5, // 相對開放，容易相信別人
        },
        villageMemory: {},
      },
      {
        id: "npc-003",
        name: "智者奧丁",
        type: NPCType.TRAINER,
        profession: NPCProfession.SCHOLAR,
        level: 50,
        location: {
          mapId: "starter_town",
          x: 150,
          y: 80,
        },
        appearance: {
          sprite: "npc_scholar_old",
          description: "一位睿智的老學者，穿著深色長袍，手持古老的法杖",
        },
        personality: {
          traits: ["智慧", "神秘", "耐心"],
          mood: "neutral",
        },
        dialogues: [
          {
            id: "greeting",
            text: "年輕的冒險者，你來到了知識的殿堂。我是奧丁，這個世界的知識守護者。你渴望學習嗎？",
            options: [
              {
                id: "learn",
                text: "我想學習新的技能",
                action: "open_training",
              },
              {
                id: "lore",
                text: "告訴我關於這個世界的歷史",
                nextDialogueId: "world_lore",
              },
              {
                id: "magic",
                text: "我對魔法很感興趣",
                nextDialogueId: "about_magic",
              },
              {
                id: "goodbye",
                text: "謝謝您的時間，智者",
                action: "end_conversation",
              },
            ],
          },
          {
            id: "world_lore",
            text: "這個世界曾經被古老的魔法統治，但隨著時間的流逝，魔法的力量逐漸衰退。現在，只有少數人還能掌握真正的魔法藝術...",
            options: [
              {
                id: "more_lore",
                text: "請告訴我更多",
                nextDialogueId: "ancient_magic",
              },
              {
                id: "back",
                text: "我想問其他問題",
                nextDialogueId: "greeting",
              },
            ],
          },
          {
            id: "about_magic",
            text: "魔法不僅僅是力量，更是理解世界本質的方式。如果你真心想學習，我可以教你一些基礎咒語。",
            options: [
              {
                id: "learn_magic",
                text: "請教我魔法",
                action: "open_magic_training",
              },
              {
                id: "requirements",
                text: "學習魔法需要什麼條件？",
                nextDialogueId: "magic_requirements",
              },
            ],
          },
        ],
        quests: ["quest-006", "quest-007"],
        schedule: [
          {
            time: "06:00",
            location: "library",
            activity: "研究古老文獻",
          },
          {
            time: "14:00",
            location: "magic_circle",
            activity: "魔法實驗",
          },
          {
            time: "22:00",
            location: "tower",
            activity: "觀察星象",
          },
        ],
        relationships: {},
        socialNetwork: {
          friends: ["npc-001", "npc-002"], // 與所有村民都有聯繫（智者地位）
          influence: 10, // 最高影響力（村莊智者）
          gossipLevel: 2, // 不愛傳播流言，但會收集信息
          trustLevel: 9, // 非常謹慎，深思熟慮
        },
        villageMemory: {},
      },
    ];

    return mockNPCs;
  }

  /**
   * 根據ID獲取特定NPC
   */
  async getNPCById(npcId: string): Promise<NPCData | null> {
    const npcs = await this.getAllNPCs();
    return npcs.find((npc) => npc.id === npcId) || null;
  }

  /**
   * 根據位置獲取附近的NPC
   */
  async getNPCsByLocation(
    mapId: string,
    x: number,
    y: number,
    radius: number = 100,
  ): Promise<NPCData[]> {
    const npcs = await this.getAllNPCs();
    return npcs.filter((npc) => {
      if (npc.location.mapId !== mapId) return false;

      const distance = Math.sqrt(
        Math.pow(npc.location.x - x, 2) + Math.pow(npc.location.y - y, 2),
      );

      return distance <= radius;
    });
  }

  /**
   * 與NPC對話
   */
  async interactWithNPC(
    npcId: string,
    playerId: string,
    dialogueId: string = "greeting",
  ): Promise<{
    npc: NPCData;
    dialogue: NPCDialogue;
    relationship: { reputation: number; lastInteraction: Date };
  }> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error("NPC 不存在");
    }

    // 更新關係
    if (!npc.relationships[playerId]) {
      npc.relationships[playerId] = {
        reputation: 0,
        lastInteraction: new Date(),
      };
    }

    npc.relationships[playerId].lastInteraction = new Date();
    npc.relationships[playerId].reputation += 1; // 每次互動增加1點好感

    // 尋找對話
    const dialogue = npc.dialogues.find((d) => d.id === dialogueId);
    if (!dialogue) {
      throw new Error("對話不存在");
    }

    console.log(
      `[NpcsService] 玩家 ${playerId} 與 NPC ${npc.name} 對話: ${dialogueId}`,
    );

    return {
      npc,
      dialogue,
      relationship: npc.relationships[playerId],
    };
  }

  /**
   * 獲取NPC的商店
   */
  async getNPCShop(
    npcId: string,
    playerId: string,
  ): Promise<{
    npcName: string;
    shop: any;
    friendshipInfo: FriendshipInfo;
    priceExplanation: string;
    hiddenItemsCount: number;
  }> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error("NPC 不存在");
    }

    // 檢查 NPC 是否為商人
    if (npc.type !== NPCType.MERCHANT && !npc.shop) {
      throw new Error("此 NPC 沒有商店");
    }

    // 使用新的友好度系統計算價格
    const friendshipInfo = await this.calculateFriendshipInfo(npcId, playerId);

    // 獲取動態商店庫存（包含隱藏物品檢查）
    const visibleItems = await this.shopService.getVisibleShopItems(
      npcId,
      playerId,
      friendshipInfo.level,
      1, // TODO: 獲取實際玩家等級
    );

    // 應用友好度價格調整
    const shop = {
      items: visibleItems.map((shopItem) => ({
        itemId: shopItem.itemId,
        name: shopItem.item.name,
        description: shopItem.item.description,
        type: shopItem.item.type,
        quality: shopItem.quality,
        quantity: shopItem.quantity,
        originalPrice: shopItem.adjustedPrice,
        price: Math.round(
          shopItem.adjustedPrice * friendshipInfo.priceModifier,
        ),
        discount: friendshipInfo.discountPercentage,
        isRare: shopItem.quality !== "COMMON",
        attributes: shopItem.item.attributes,
        dynamicPriceInfo: shopItem.dynamicPricing
          ? {
              trend:
                shopItem.dynamicPricing.demandFactor > 1.1
                  ? "rising"
                  : shopItem.dynamicPricing.demandFactor < 0.9
                    ? "falling"
                    : "stable",
              demandLevel: shopItem.dynamicPricing.demandFactor,
            }
          : null,
      })),
    };

    // 計算隱藏物品數量
    const totalInventory = await this.shopService.getShopInventory(npcId);
    const hiddenItemsCount = totalInventory.length - visibleItems.length;

    // 生成價格說明
    let priceExplanation = "";
    if (friendshipInfo.discountPercentage > 0) {
      priceExplanation = `由於你是${friendshipInfo.title}，所有商品享有 ${friendshipInfo.discountPercentage}% 的折扣！`;
    } else if (friendshipInfo.discountPercentage < 0) {
      priceExplanation = `由於你是${friendshipInfo.title}，所有商品需要加價 ${Math.abs(friendshipInfo.discountPercentage)}%。`;
    } else {
      priceExplanation = `你是${friendshipInfo.title}，商品按原價出售。`;
    }

    if (hiddenItemsCount > 0) {
      priceExplanation += ` 還有 ${hiddenItemsCount} 件特殊商品需要更好的關係才能看到。`;
    }

    return {
      npcName: npc.name,
      shop,
      friendshipInfo,
      priceExplanation,
      hiddenItemsCount,
    };
  }

  /**
   * 從NPC購買物品
   */
  async buyFromNPC(
    npcId: string,
    playerId: string,
    itemId: string,
    quantity: number,
  ): Promise<{
    success: boolean;
    message: string;
    totalCost?: number;
    itemsReceived?: Array<{
      itemId: string;
      quality: string;
      quantity: number;
    }>;
  }> {
    // 獲取玩家資料檢查金錢
    const user = await this.prisma.user.findUnique({
      where: { id: playerId },
      include: { gameCharacter: true },
    });

    if (!user || !user.gameCharacter) {
      return { success: false, message: "玩家資料不存在" };
    }

    // 使用新的友好度系統計算價格修正
    const friendshipInfo = await this.calculateFriendshipInfo(npcId, playerId);

    // 使用新的商店服務處理購買
    const purchaseResult = await this.shopService.purchaseItem(
      npcId,
      playerId,
      itemId,
      quantity,
      friendshipInfo.priceModifier,
    );

    if (!purchaseResult.success) {
      return {
        success: false,
        message: purchaseResult.message,
      };
    }

    const totalCost = purchaseResult.finalPrice!;

    // 檢查玩家金錢
    if ((user.gameCharacter.goldAmount || 0) < totalCost) {
      return { success: false, message: "金錢不足" };
    }

    // 扣除金錢
    await this.prisma.gameCharacter.update({
      where: { id: user.gameCharacter.id },
      data: {
        goldAmount: (user.gameCharacter.goldAmount || 0) - totalCost,
      },
    });

    // 購買成功後略微增加個人聲譽
    const npc = await this.getNPCById(npcId);
    if (npc) {
      if (!npc.relationships[playerId]) {
        npc.relationships[playerId] = {
          reputation: 0,
          lastInteraction: new Date(),
        };
      }
      npc.relationships[playerId].reputation += Math.min(quantity, 3); // 每次購買增加聲譽，最多3點
      npc.relationships[playerId].lastInteraction = new Date();
    }

    let message = purchaseResult.message;
    if (friendshipInfo.discountPercentage !== 0) {
      message += `，由於你是${friendshipInfo.title}，價格${friendshipInfo.discountPercentage > 0 ? "享有" : "需要"}${Math.abs(friendshipInfo.discountPercentage)}%${friendshipInfo.discountPercentage > 0 ? "折扣" : "加價"}`;
    }

    console.log(
      `[NpcsService] 玩家 ${user.gameCharacter.characterName} 從 ${npc?.name} 購買 ${quantity}x ${itemId}，花費 ${totalCost} 金幣`,
    );

    return {
      success: true,
      message,
      totalCost,
      itemsReceived: purchaseResult.itemsReceived,
    };
  }

  /**
   * 獲取玩家與 NPC 的友好度詳細資訊
   */
  async getFriendshipStatus(
    npcId: string,
    playerId: string,
  ): Promise<{
    npcName: string;
    friendshipInfo: FriendshipInfo;
    relationshipHistory: {
      personalInteractions: number;
      villageEvents: any[];
      recentActivities: string[];
    };
  }> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error("NPC 不存在");
    }

    const friendshipInfo = await this.calculateFriendshipInfo(npcId, playerId);

    // 計算關係歷史
    const personalRelationship = npc.relationships[playerId];
    const villageMemory = npc.villageMemory[playerId];

    const relationshipHistory = {
      personalInteractions: personalRelationship ? 1 : 0, // 實際應該記錄互動次數
      villageEvents: villageMemory ? villageMemory.knownEvents : [],
      recentActivities: [] as string[],
    };

    // 生成最近活動描述
    if (personalRelationship) {
      if (personalRelationship.reputation > 0) {
        relationshipHistory.recentActivities.push("與此NPC有過正面互動");
      }
      if (personalRelationship.lastInteraction) {
        const daysSinceLastInteraction = Math.floor(
          (new Date().getTime() -
            personalRelationship.lastInteraction.getTime()) /
            (1000 * 60 * 60 * 24),
        );
        relationshipHistory.recentActivities.push(
          `最後互動：${daysSinceLastInteraction}天前`,
        );
      }
    }

    if (villageMemory && villageMemory.knownEvents.length > 0) {
      relationshipHistory.recentActivities.push(
        `村民們知道你的${villageMemory.knownEvents.length}件事情`,
      );
    }

    return {
      npcName: npc.name,
      friendshipInfo,
      relationshipHistory,
    };
  }

  /**
   * AI生成NPC日常對話（基於時間、天氣、玩家關係等）
   */
  async generateDynamicDialogue(
    npcId: string,
    playerId: string,
    context: {
      timeOfDay: "morning" | "afternoon" | "evening" | "night";
      weather?: "sunny" | "rainy" | "cloudy";
      playerLevel?: number;
      lastQuestCompleted?: string;
    },
  ): Promise<NPCDialogue> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error("NPC 不存在");
    }

    const relationship = npc.relationships[playerId];
    const reputation = relationship ? relationship.reputation : 0;
    const friendshipInfo = await this.calculateFriendshipInfo(npcId, playerId);

    // 獲取 NPC 的性格和情緒數據
    const personality = this.getNPCPersonality(npcId);
    const currentMood = this.getNPCCurrentMood(npcId);

    // 建構對話上下文
    const dialogueContext = {
      timeOfDay: this.mapTimeOfDay(context.timeOfDay),
      weather: (context.weather || "sunny") as "sunny" | "rainy" | "cloudy",
      season: "spring" as const, // TODO: 實作季節系統
      location: npc.location.mapId,
      playerLevel: context.playerLevel || 1,
      friendshipLevel: friendshipInfo.level,
      friendshipScore: friendshipInfo.score,
      recentPlayerActions: [], // TODO: 實作玩家行為記錄
      npcWorkStatus: this.getNPCWorkStatus(npcId, context.timeOfDay) as
        | "working"
        | "resting"
        | "busy"
        | "free",
      hasQuests: npc.quests && npc.quests.length > 0,
      hasShop: !!npc.shop,
      canTeach: npc.type === NPCType.TRAINER,
    };

    // 使用 DialogueService 生成動態對話
    const generatedDialogue = this.dialogueService.generateDialogue(
      npcId,
      npc.type,
      npc.profession || NPCProfession.CRAFTER,
      personality,
      currentMood,
      dialogueContext,
    );

    // 轉換為舊的對話格式以保持相容性
    const dynamicText = `${generatedDialogue.greeting} ${generatedDialogue.mainContent}`;

    return {
      id: "dynamic",
      text: dynamicText,
      options: generatedDialogue.availableResponses.map((response) => ({
        id: response.id,
        text: response.text,
        action: response.action,
        nextDialogueId: response.type === "friendly" ? "greeting" : undefined,
      })),
    };
  }

  /**
   * 獲取 NPC 性格特徵
   */
  private getNPCPersonality(npcId: string): NPCPersonality {
    // 為現有 NPCs 定義個性化的性格特徵
    const personalities: { [key: string]: NPCPersonality } = {
      "npc-001": {
        // 老杰克 - 經驗豐富的伐木工
        traits: {
          friendliness: 8,
          curiosity: 6,
          helpfulness: 9,
          chattiness: 7,
          greediness: 3,
          trustfulness: 8,
          pride: 7,
          patience: 8,
        },
        quirks: ["經常撫摸鬍子", "喜歡分享工作經驗", "對年輕人特別友善"],
        fears: ["森林火災", "工具損壞"],
        interests: ["木工技巧", "森林生態", "村子歷史"],
        speechPatterns: {
          formality: "rustic",
          accent: "老式用語",
          catchphrases: ["年輕人", "我這把老骨頭", "在我這麼多年的經驗中"],
          vocabulary: "simple",
        },
      },
      "npc-002": {
        // 艾莉絲 - 精明的商人
        traits: {
          friendliness: 7,
          curiosity: 8,
          helpfulness: 6,
          chattiness: 8,
          greediness: 6,
          trustfulness: 5,
          pride: 6,
          patience: 6,
        },
        quirks: ["總是在算帳", "對稀有物品眼睛發亮", "喜歡討價還價"],
        fears: ["市場崩盤", "庫存積壓"],
        interests: ["商業機會", "工藝品質", "市場趨勢"],
        speechPatterns: {
          formality: "formal",
          accent: "商人腔調",
          catchphrases: ["生意就是生意", "品質保證", "物超所值"],
          vocabulary: "professional",
        },
      },
      "npc-003": {
        // 智者奧丁 - 博學的學者
        traits: {
          friendliness: 6,
          curiosity: 10,
          helpfulness: 8,
          chattiness: 9,
          greediness: 2,
          trustfulness: 7,
          pride: 8,
          patience: 9,
        },
        quirks: ["經常沉思", "引用古籍", "收集稀有書籍"],
        fears: ["知識失傳", "無知蔓延"],
        interests: ["古老魔法", "歷史研究", "哲學思辨"],
        speechPatterns: {
          formality: "formal",
          accent: "學者用語",
          catchphrases: ["根據古籍記載", "知識就是力量", "讓我想想"],
          vocabulary: "complex",
        },
      },
    };

    // 返回對應的性格或預設性格
    return (
      personalities[npcId] || {
        traits: {
          friendliness: 5,
          curiosity: 5,
          helpfulness: 5,
          chattiness: 5,
          greediness: 5,
          trustfulness: 5,
          pride: 5,
          patience: 5,
        },
        quirks: ["普通的村民"],
        fears: ["未知的危險"],
        interests: ["日常生活"],
        speechPatterns: {
          formality: "casual",
          accent: "普通口音",
          catchphrases: ["你好", "再見"],
          vocabulary: "simple",
        },
      }
    );
  }

  /**
   * 獲取 NPC 當前情緒狀態
   */
  private getNPCCurrentMood(npcId: string): NPCMood {
    // 實際應該從資料庫讀取或根據遊戲事件動態計算
    // 這裡返回模擬的情緒狀態
    const currentHour = new Date().getHours();
    let mood: NPCMood["currentMood"] = "neutral";
    let energy = 70;

    // 基於時間調整情緒和精力
    if (currentHour >= 6 && currentHour < 12) {
      mood = "happy";
      energy = 80;
    } else if (currentHour >= 12 && currentHour < 18) {
      mood = "neutral";
      energy = 60;
    } else if (currentHour >= 18 && currentHour < 22) {
      mood = "happy";
      energy = 50;
    } else {
      mood = "tired";
      energy = 30;
    }

    return {
      currentMood: mood,
      energy,
      stress: 20,
      satisfaction: 70,
      recentEvents: [
        {
          type: "success",
          description: "完成了今天的工作",
          impact: 2,
          timestamp: new Date(),
        },
      ],
    };
  }

  /**
   * 映射時間段格式
   */
  private mapTimeOfDay(
    timeOfDay: string,
  ): "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night" {
    const mapping: {
      [key: string]:
        | "dawn"
        | "morning"
        | "noon"
        | "afternoon"
        | "evening"
        | "night";
    } = {
      morning: "morning",
      afternoon: "afternoon",
      evening: "evening",
      night: "night",
    };
    return mapping[timeOfDay] || "morning";
  }

  /**
   * 獲取 NPC 工作狀態
   */
  private getNPCWorkStatus(npcId: string, timeOfDay: string): string {
    const workHours = {
      morning: "working",
      afternoon: "working",
      evening: "resting",
      night: "resting",
    };
    return workHours[timeOfDay] || "free";
  }

  /**
   * 更新NPC的每日狀態和活動
   */
  async updateDailyStatus(): Promise<void> {
    const npcs = await this.getAllNPCs();
    const currentTime = new Date();
    const timeString = `${currentTime.getHours().toString().padStart(2, "0")}:${currentTime.getMinutes().toString().padStart(2, "0")}`;

    for (const npc of npcs) {
      // 根據日程更新NPC位置和活動
      const currentActivity = npc.schedule.find((s) => s.time <= timeString);
      if (currentActivity) {
        console.log(
          `[NpcsService] ${npc.name} 現在在 ${currentActivity.location} 進行 ${currentActivity.activity}`,
        );
      }

      // 更新NPC心情（基於隨機事件、玩家互動等）
      const moodChange = Math.random();
      if (moodChange < 0.1) {
        const moods: Array<"happy" | "neutral" | "sad" | "angry" | "excited"> =
          ["happy", "neutral", "sad", "angry", "excited"];
        npc.personality.mood = moods[Math.floor(Math.random() * moods.length)];
      }
    }

    console.log(`[NpcsService] 完成 ${npcs.length} 個 NPC 的每日狀態更新`);
  }

  /**
   * 基於NPC職業需求發布日常任務（AI邏輯）
   */
  async generateProfessionBasedQuests(npcId: string): Promise<any[]> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      return [];
    }

    const questTemplates = {
      [NPCProfession.WOODCUTTER]: [
        {
          title: "木材採集",
          description: "森林裡需要砍伐一些高品質的木材",
          type: "GATHER",
          target: "wood",
          quantity: Math.floor(Math.random() * 10) + 5,
        },
      ],
      [NPCProfession.MINER]: [
        {
          title: "礦物挖掘",
          description: "礦坑需要更多的礦石來維持生產",
          type: "GATHER",
          target: "ore",
          quantity: Math.floor(Math.random() * 8) + 3,
        },
      ],
      [NPCProfession.FARMER]: [
        {
          title: "作物收穫",
          description: "農田的作物已經成熟，需要人手幫忙收割",
          type: "GATHER",
          target: "crops",
          quantity: Math.floor(Math.random() * 15) + 10,
        },
      ],
      [NPCProfession.HUNTER]: [
        {
          title: "清理野獸",
          description: "附近出現了一些威脅居民安全的野獸",
          type: "KILL",
          target: "wild_beast",
          quantity: Math.floor(Math.random() * 5) + 2,
        },
      ],
    };

    const templates = questTemplates[npc.profession] || [];
    return templates.map((template) => ({
      ...template,
      npcId: npc.id,
      npcName: npc.name,
      difficulty: "NORMAL",
      rewards: {
        experience: template.quantity * 20,
        gold: template.quantity * 10,
      },
    }));
  }

  /**
   * 村莊聲譽和信息傳播系統
   */

  // 廣播消息給村莊中的所有 NPC
  async broadcastVillageNews(
    playerId: string,
    newsType:
      | "quest_completed"
      | "quest_failed"
      | "trade_success"
      | "rude_behavior"
      | "helpful_action",
    sourceNpcId: string,
    description: string,
    impact: number,
  ): Promise<void> {
    const allNPCs = await this.getAllNPCs();
    const sourceNpc = allNPCs.find((npc) => npc.id === sourceNpcId);

    if (!sourceNpc) return;

    // 基於消息類型和影響程度決定傳播範圍
    const newsImportance = Math.abs(impact);
    let spreadRadius = 1;

    if (newsImportance >= 8) {
      spreadRadius = 3; // 重大事件傳遍全村
    } else if (newsImportance >= 5) {
      spreadRadius = 2; // 中等事件傳播給朋友的朋友
    }

    console.log(
      `[VillageNews] 廣播消息: ${newsType} - ${description} (影響: ${impact})`,
    );

    // 遞歸傳播消息
    await this.spreadNewsToNetwork(
      allNPCs,
      sourceNpcId,
      playerId,
      {
        type: newsType,
        description,
        impact,
        timestamp: new Date(),
        source: sourceNpcId,
        verified: true,
      },
      spreadRadius,
      new Set([sourceNpcId]),
    );
  }

  // 在 NPC 社交網絡中傳播消息
  private async spreadNewsToNetwork(
    allNPCs: NPCData[],
    currentNpcId: string,
    playerId: string,
    news: any,
    remainingRadius: number,
    visitedNpcs: Set<string>,
  ): Promise<void> {
    if (remainingRadius <= 0) return;

    const currentNpc = allNPCs.find((npc) => npc.id === currentNpcId);
    if (!currentNpc) return;

    // 傳播給朋友
    for (const friendId of currentNpc.socialNetwork.friends) {
      if (visitedNpcs.has(friendId)) continue;

      const friend = allNPCs.find((npc) => npc.id === friendId);
      if (!friend) continue;

      // 根據八卦程度和信任程度調整消息傳播
      const spreadProbability =
        (friend.socialNetwork.gossipLevel / 10) *
        (currentNpc.socialNetwork.influence / 10);

      if (Math.random() < spreadProbability) {
        // 添加消息到朋友的村莊記憶
        if (!friend.villageMemory[playerId]) {
          friend.villageMemory[playerId] = {
            knownEvents: [],
            overallImpression: 0,
            lastUpdated: new Date(),
          };
        }

        // 消息在傳播過程中可能會有所衰減或扭曲
        const distortionFactor = 1 - remainingRadius * 0.1; // 傳播距離越遠扭曲越大
        const adjustedImpact = Math.round(news.impact * distortionFactor);

        friend.villageMemory[playerId].knownEvents.push({
          ...news,
          impact: adjustedImpact,
          source: currentNpcId, // 記錄直接來源
          verified: remainingRadius === 3, // 只有直接目擊者才標記為已驗證
        });

        // 更新總體印象
        this.updateOverallImpression(friend, playerId);

        visitedNpcs.add(friendId);

        console.log(
          `[VillageNews] ${friend.name} 收到來自 ${currentNpc.name} 的消息: ${news.description}`,
        );

        // 繼續傳播
        await this.spreadNewsToNetwork(
          allNPCs,
          friendId,
          playerId,
          news,
          remainingRadius - 1,
          visitedNpcs,
        );
      }
    }
  }

  // 更新 NPC 對玩家的總體印象
  private updateOverallImpression(npc: NPCData, playerId: string): void {
    if (!npc.villageMemory[playerId]) return;

    const memory = npc.villageMemory[playerId];
    let totalImpact = 0;
    let recentWeight = 0;

    const now = new Date();

    // 計算加權平均，最近的事件權重更高
    memory.knownEvents.forEach((event) => {
      const daysSince = Math.floor(
        (now.getTime() - event.timestamp.getTime()) / (1000 * 60 * 60 * 24),
      );
      const timeWeight = Math.max(0.1, 1 - daysSince / 30); // 30天內的事件有較高權重
      const verifiedWeight = event.verified ? 1.0 : 0.7; // 親眼所見的事件權重更高

      totalImpact += event.impact * timeWeight * verifiedWeight;
      recentWeight += timeWeight * verifiedWeight;
    });

    memory.overallImpression =
      recentWeight > 0 ? Math.round(totalImpact / recentWeight) : 0;
    memory.lastUpdated = new Date();
  }

  // 獲取玩家在村莊中的總體聲譽
  async getVillageReputation(playerId: string): Promise<{
    overallReputation: number;
    reputationLevel: "hero" | "popular" | "neutral" | "disliked" | "enemy";
    npcOpinions: Array<{
      npcId: string;
      npcName: string;
      impression: number;
      knownEventsCount: number;
      lastUpdate: Date;
    }>;
  }> {
    const allNPCs = await this.getAllNPCs();
    const npcOpinions: any[] = [];
    let totalImpression = 0;
    let npcCount = 0;

    allNPCs.forEach((npc) => {
      if (npc.villageMemory[playerId]) {
        const memory = npc.villageMemory[playerId];
        npcOpinions.push({
          npcId: npc.id,
          npcName: npc.name,
          impression: memory.overallImpression,
          knownEventsCount: memory.knownEvents.length,
          lastUpdate: memory.lastUpdated,
        });

        // 根據 NPC 影響力加權計算總體聲譽
        const weightedImpression =
          memory.overallImpression * (npc.socialNetwork.influence / 10);
        totalImpression += weightedImpression;
        npcCount += npc.socialNetwork.influence / 10;
      }
    });

    const overallReputation =
      npcCount > 0 ? Math.round(totalImpression / npcCount) : 0;

    let reputationLevel: "hero" | "popular" | "neutral" | "disliked" | "enemy";
    if (overallReputation >= 80) reputationLevel = "hero";
    else if (overallReputation >= 40) reputationLevel = "popular";
    else if (overallReputation >= -20) reputationLevel = "neutral";
    else if (overallReputation >= -60) reputationLevel = "disliked";
    else reputationLevel = "enemy";

    return {
      overallReputation,
      reputationLevel,
      npcOpinions: npcOpinions.sort((a, b) => b.impression - a.impression),
    };
  }

  /**
   * 計算玩家與 NPC 的友好度資訊
   */
  async calculateFriendshipInfo(
    npcId: string,
    playerId: string,
  ): Promise<FriendshipInfo> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error("NPC 不存在");
    }

    // 獲取個人聲譽（直接關係）
    const personalRelationship = npc.relationships[playerId];
    const personalReputation = personalRelationship
      ? personalRelationship.reputation
      : 0;

    // 獲取村莊聲譽（間接關係，通過其他 NPC 傳播）
    const villageMemory = npc.villageMemory[playerId];
    const villageReputation = villageMemory
      ? villageMemory.overallImpression
      : 0;

    // 計算綜合友好度分數
    // 個人聲譽權重 70%，村莊聲譽權重 30%
    const combinedScore = Math.round(
      personalReputation * 0.7 + villageReputation * 0.3,
    );

    // 確定友好度等級
    let level: FriendshipLevel;
    let priceModifier: number;
    let title: string;

    if (combinedScore >= 100) {
      level = FriendshipLevel.HERO;
      priceModifier = 0.75; // 25% 折扣
      title = "傳奇英雄";
    } else if (combinedScore >= 80) {
      level = FriendshipLevel.BEST_FRIEND;
      priceModifier = 0.8; // 20% 折扣
      title = "摯友";
    } else if (combinedScore >= 50) {
      level = FriendshipLevel.CLOSE_FRIEND;
      priceModifier = 0.85; // 15% 折扣
      title = "好友";
    } else if (combinedScore >= 20) {
      level = FriendshipLevel.FRIENDLY;
      priceModifier = 0.9; // 10% 折扣
      title = "朋友";
    } else if (combinedScore >= 0) {
      level = FriendshipLevel.NEUTRAL;
      priceModifier = 1.0; // 原價
      title = "陌生人";
    } else if (combinedScore >= -20) {
      level = FriendshipLevel.UNFRIENDLY;
      priceModifier = 1.1; // 10% 加價
      title = "討厭的人";
    } else if (combinedScore >= -60) {
      level = FriendshipLevel.HOSTILE;
      priceModifier = 1.25; // 25% 加價
      title = "敵對者";
    } else {
      level = FriendshipLevel.ENEMY;
      priceModifier = 1.5; // 50% 加價
      title = "仇敵";
    }

    const discountPercentage = Math.round((1 - priceModifier) * 100);

    return {
      level,
      score: combinedScore,
      personalReputation,
      villageReputation,
      priceModifier,
      discountPercentage,
      title,
    };
  }

  /**
   * 根據友好度調整商店價格（新的統一方法）
   */
  async getAdjustedPrice(
    npcId: string,
    playerId: string,
    basePrice: number,
  ): Promise<{
    adjustedPrice: number;
    friendshipInfo: FriendshipInfo;
  }> {
    const friendshipInfo = await this.calculateFriendshipInfo(npcId, playerId);
    const adjustedPrice = Math.round(basePrice * friendshipInfo.priceModifier);

    return {
      adjustedPrice,
      friendshipInfo,
    };
  }

  /**
   * 舊版本的價格調整方法（向後兼容）
   * @deprecated 請使用 getAdjustedPrice 的新版本
   */
  async getAdjustedPriceLegacy(
    npcId: string,
    playerId: string,
    basePrice: number,
  ): Promise<number> {
    const result = await this.getAdjustedPrice(npcId, playerId, basePrice);
    return result.adjustedPrice;
  }

  /**
   * 生成基於村莊聲譽的動態對話
   */
  async generateReputationBasedDialogue(
    npcId: string,
    playerId: string,
    context: {
      timeOfDay: "morning" | "afternoon" | "evening" | "night";
      weather: "sunny" | "rainy" | "cloudy";
      lastQuestCompleted?: string;
      recentInteraction?: boolean;
    },
  ): Promise<any> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error("NPC 不存在");
    }

    const villageReputation = await this.getVillageReputation(playerId);
    const npcMemory = npc.villageMemory[playerId];
    const personalReputation = npcMemory ? npcMemory.overallImpression : 0;

    // 基礎問候
    let greeting = this.generateTimeBasedGreeting(context.timeOfDay);

    // 根據聲譽調整稱呼
    let title = this.getReputationBasedTitle(
      villageReputation.reputationLevel,
      personalReputation,
    );

    // 構建對話文本
    let dialogueText = `${greeting}，${title}！`;

    // 添加聲譽相關的評論
    if (villageReputation.reputationLevel === "hero") {
      dialogueText += "整個村子都在談論你的英勇事蹟！";
    } else if (villageReputation.reputationLevel === "popular") {
      dialogueText += "你在村民中頗受歡迎呢。";
    } else if (villageReputation.reputationLevel === "disliked") {
      dialogueText += "最近村裡對你有些不滿的聲音...";
    } else if (villageReputation.reputationLevel === "enemy") {
      dialogueText += "我聽說你最近做了很多讓村民不高興的事...";
    }

    // 添加 NPC 個人記憶相關的對話
    if (npcMemory && npcMemory.knownEvents.length > 0) {
      const recentEvent =
        npcMemory.knownEvents[npcMemory.knownEvents.length - 1];

      if (recentEvent.type === "quest_completed" && recentEvent.impact > 5) {
        if (recentEvent.verified) {
          dialogueText += `我親眼看到你${recentEvent.description}，做得很好！`;
        } else {
          dialogueText += `${this.getSourceNpcName(recentEvent.source)}告訴我你${recentEvent.description}。`;
        }
      } else if (recentEvent.type === "quest_failed") {
        if (recentEvent.verified) {
          dialogueText += `你上次放棄任務讓我有些失望...`;
        } else {
          dialogueText += `聽說你最近放棄了一些任務，希望不是真的。`;
        }
      }
    }

    // 根據天氣添加評論
    if (context.weather === "rainy") {
      dialogueText += "這雨天讓人心情鬱悶，希望你能帶來好消息。";
    } else if (context.weather === "sunny") {
      dialogueText += "今天天氣真好，適合出去冒險！";
    }

    // 生成對話選項
    const options = this.generateReputationBasedOptions(
      villageReputation.reputationLevel,
      personalReputation,
    );

    return {
      id: "dynamic_reputation_dialogue",
      text: dialogueText,
      options,
      metadata: {
        villageReputation: villageReputation.reputationLevel,
        personalImpression: personalReputation,
        eventsKnown: npcMemory ? npcMemory.knownEvents.length : 0,
      },
    };
  }

  private generateTimeBasedGreeting(timeOfDay: string): string {
    const greetings = {
      morning: ["早安", "早上好", "一大早就見到你"],
      afternoon: ["午安", "下午好", "午後時光見面真好"],
      evening: ["晚安", "傍晚好", "夕陽西下時見面"],
      night: ["夜深了", "這麼晚還在外面", "深夜相遇"],
    };

    const options = greetings[timeOfDay] || greetings.afternoon;
    return options[Math.floor(Math.random() * options.length)];
  }

  private getReputationBasedTitle(
    villageLevel: "hero" | "popular" | "neutral" | "disliked" | "enemy",
    personalImpression: number,
  ): string {
    // 個人印象優先於村莊聲譽
    if (personalImpression > 80) return "我的摯友";
    if (personalImpression > 50) return "可靠的夥伴";
    if (personalImpression < -50) return "那個傢伙";
    if (personalImpression < -20) return "不太可靠的人";

    // 基於村莊聲譽
    switch (villageLevel) {
      case "hero":
        return "英雄";
      case "popular":
        return "受歡迎的冒險者";
      case "neutral":
        return "冒險者";
      case "disliked":
        return "有爭議的旅人";
      case "enemy":
        return "不受歡迎的傢伙";
      default:
        return "陌生人";
    }
  }

  private generateReputationBasedOptions(
    villageLevel: "hero" | "popular" | "neutral" | "disliked" | "enemy",
    personalImpression: number,
  ): any[] {
    const baseOptions = [
      { id: "quest", text: "有什麼任務需要幫助嗎？", action: "show_quests" },
      { id: "goodbye", text: "再見", action: "end_conversation" },
    ];

    // 根據聲譽添加額外選項
    if (villageLevel === "hero" || personalImpression > 50) {
      baseOptions.unshift({
        id: "special_quest",
        text: "有什麼特別重要的任務嗎？",
        action: "show_special_quests",
      });
    }

    if (villageLevel === "disliked" || personalImpression < -20) {
      baseOptions.push({
        id: "apologize",
        text: "我想為之前的行為道歉",
        action: "reputation_recovery",
      });
    }

    if (personalImpression > 80) {
      baseOptions.unshift({
        id: "friendly_chat",
        text: "我們聊聊近況吧",
        action: "friendly_conversation",
      });
    }

    return baseOptions;
  }

  private getSourceNpcName(npcId: string): string {
    const npcNames = {
      "npc-001": "老杰克",
      "npc-002": "艾莉絲",
      "npc-003": "智者奧丁",
    };
    return npcNames[npcId] || "某位村民";
  }
}
