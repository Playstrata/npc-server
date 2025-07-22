import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum NPCType {
  QUEST_GIVER = 'QUEST_GIVER',        // 任務發布者
  MERCHANT = 'MERCHANT',              // 商人
  TRAINER = 'TRAINER',                // 訓練師
  GUARD = 'GUARD',                    // 守衛
  VILLAGER = 'VILLAGER',              // 村民
  BLACKSMITH = 'BLACKSMITH',          // 鍛造師
  ALCHEMIST = 'ALCHEMIST',            // 煉金術師
  INNKEEPER = 'INNKEEPER',            // 旅店老闆
}

export enum NPCProfession {
  WOODCUTTER = 'WOODCUTTER',          // 伐木工
  MINER = 'MINER',                    // 礦工
  FARMER = 'FARMER',                  // 農夫
  FISHER = 'FISHER',                  // 漁夫
  HUNTER = 'HUNTER',                  // 獵人
  CRAFTER = 'CRAFTER',                // 工匠
  HEALER = 'HEALER',                  // 治療師
  SCHOLAR = 'SCHOLAR',                // 學者
}

interface NPCDialogue {
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

interface NPCData {
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
    mood: 'happy' | 'neutral' | 'sad' | 'angry' | 'excited';
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
}

@Injectable()
export class NpcsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 獲取所有 NPC 資料
   */
  async getAllNPCs(): Promise<NPCData[]> {
    // 模擬 NPC 資料，實際應該從資料庫獲取
    const mockNPCs: NPCData[] = [
      {
        id: 'npc-001',
        name: '老杰克',
        type: NPCType.QUEST_GIVER,
        profession: NPCProfession.WOODCUTTER,
        level: 25,
        location: {
          mapId: 'starter_town',
          x: 100,
          y: 150,
        },
        appearance: {
          sprite: 'npc_woodcutter_old',
          description: '一個經驗豐富的老伐木工，鬍子花白，眼神銳利',
        },
        personality: {
          traits: ['友善', '經驗豐富', '健談'],
          mood: 'happy',
        },
        dialogues: [
          {
            id: 'greeting',
            text: '哈囉，年輕的冒險者！我是老杰克，這裡最有經驗的伐木工。你看起來像是個有潛力的人！',
            options: [
              {
                id: 'quest',
                text: '您有什麼任務需要幫助嗎？',
                action: 'show_quests',
              },
              {
                id: 'chat',
                text: '告訴我一些關於這個地方的事情',
                nextDialogueId: 'about_town',
              },
              {
                id: 'goodbye',
                text: '再見，老杰克',
                action: 'end_conversation',
              },
            ],
          },
          {
            id: 'about_town',
            text: '這個小鎮被森林包圍，木材是我們的主要資源。但最近森林裡出現了一些奇怪的生物，讓伐木工作變得危險了。',
            options: [
              {
                id: 'help',
                text: '我可以幫忙處理那些生物',
                action: 'show_quests',
              },
              {
                id: 'back',
                text: '我想問問其他事情',
                nextDialogueId: 'greeting',
              },
            ],
          },
        ],
        quests: ['quest-001', 'quest-004'],
        schedule: [
          {
            time: '08:00',
            location: 'forest_entrance',
            activity: '檢查伐木進度',
          },
          {
            time: '12:00',
            location: 'town_center',
            activity: '午餐時間',
          },
          {
            time: '18:00',
            location: 'tavern',
            activity: '晚餐和聊天',
          },
        ],
        relationships: {},
      },
      {
        id: 'npc-002',
        name: '艾莉絲',
        type: NPCType.MERCHANT,
        profession: NPCProfession.CRAFTER,
        level: 30,
        location: {
          mapId: 'starter_town',
          x: 200,
          y: 100,
        },
        appearance: {
          sprite: 'npc_merchant_female',
          description: '一位年輕的女性商人，穿著精緻的服裝，總是面帶微笑',
        },
        personality: {
          traits: ['精明', '友好', '商業頭腦'],
          mood: 'happy',
        },
        dialogues: [
          {
            id: 'greeting',
            text: '歡迎來到我的商店！我是艾莉絲，這裡有最好的裝備和道具。你需要什麼嗎？',
            options: [
              {
                id: 'shop',
                text: '我想看看你的商品',
                action: 'open_shop',
              },
              {
                id: 'craft',
                text: '你能幫我製作裝備嗎？',
                action: 'open_crafting',
              },
              {
                id: 'chat',
                text: '這些商品是從哪裡來的？',
                nextDialogueId: 'about_goods',
              },
              {
                id: 'goodbye',
                text: '謝謝，我等會再來',
                action: 'end_conversation',
              },
            ],
          },
          {
            id: 'about_goods',
            text: '我的商品來自各地的工匠和冒險者。我特別專精於裝備強化和客製化製作。如果你有特殊需求，我很樂意幫助！',
            options: [
              {
                id: 'enhance',
                text: '裝備強化聽起來不錯',
                action: 'show_enhancement',
              },
              {
                id: 'back',
                text: '讓我看看其他選項',
                nextDialogueId: 'greeting',
              },
            ],
          },
        ],
        quests: ['quest-005'],
        shop: {
          items: [
            { itemId: 'item-wooden-sword', price: 100, stock: 5 },
            { itemId: 'item-leather-armor', price: 250, stock: 3 },
            { itemId: 'item-health-potion', price: 50, stock: 20 },
            { itemId: 'item-mana-potion', price: 50, stock: 15 },
          ],
        },
        schedule: [
          {
            time: '09:00',
            location: 'shop',
            activity: '開店營業',
          },
          {
            time: '18:00',
            location: 'shop',
            activity: '整理商品',
          },
          {
            time: '20:00',
            location: 'home',
            activity: '回家休息',
          },
        ],
        relationships: {},
      },
      {
        id: 'npc-003',
        name: '智者奧丁',
        type: NPCType.TRAINER,
        profession: NPCProfession.SCHOLAR,
        level: 50,
        location: {
          mapId: 'starter_town',
          x: 150,
          y: 80,
        },
        appearance: {
          sprite: 'npc_scholar_old',
          description: '一位睿智的老學者，穿著深色長袍，手持古老的法杖',
        },
        personality: {
          traits: ['智慧', '神秘', '耐心'],
          mood: 'neutral',
        },
        dialogues: [
          {
            id: 'greeting',
            text: '年輕的冒險者，你來到了知識的殿堂。我是奧丁，這個世界的知識守護者。你渴望學習嗎？',
            options: [
              {
                id: 'learn',
                text: '我想學習新的技能',
                action: 'open_training',
              },
              {
                id: 'lore',
                text: '告訴我關於這個世界的歷史',
                nextDialogueId: 'world_lore',
              },
              {
                id: 'magic',
                text: '我對魔法很感興趣',
                nextDialogueId: 'about_magic',
              },
              {
                id: 'goodbye',
                text: '謝謝您的時間，智者',
                action: 'end_conversation',
              },
            ],
          },
          {
            id: 'world_lore',
            text: '這個世界曾經被古老的魔法統治，但隨著時間的流逝，魔法的力量逐漸衰退。現在，只有少數人還能掌握真正的魔法藝術...',
            options: [
              {
                id: 'more_lore',
                text: '請告訴我更多',
                nextDialogueId: 'ancient_magic',
              },
              {
                id: 'back',
                text: '我想問其他問題',
                nextDialogueId: 'greeting',
              },
            ],
          },
          {
            id: 'about_magic',
            text: '魔法不僅僅是力量，更是理解世界本質的方式。如果你真心想學習，我可以教你一些基礎咒語。',
            options: [
              {
                id: 'learn_magic',
                text: '請教我魔法',
                action: 'open_magic_training',
              },
              {
                id: 'requirements',
                text: '學習魔法需要什麼條件？',
                nextDialogueId: 'magic_requirements',
              },
            ],
          },
        ],
        quests: ['quest-006', 'quest-007'],
        schedule: [
          {
            time: '06:00',
            location: 'library',
            activity: '研究古老文獻',
          },
          {
            time: '14:00',
            location: 'magic_circle',
            activity: '魔法實驗',
          },
          {
            time: '22:00',
            location: 'tower',
            activity: '觀察星象',
          },
        ],
        relationships: {},
      },
    ];

    return mockNPCs;
  }

  /**
   * 根據ID獲取特定NPC
   */
  async getNPCById(npcId: string): Promise<NPCData | null> {
    const npcs = await this.getAllNPCs();
    return npcs.find(npc => npc.id === npcId) || null;
  }

  /**
   * 根據位置獲取附近的NPC
   */
  async getNPCsByLocation(mapId: string, x: number, y: number, radius: number = 100): Promise<NPCData[]> {
    const npcs = await this.getAllNPCs();
    return npcs.filter(npc => {
      if (npc.location.mapId !== mapId) return false;
      
      const distance = Math.sqrt(
        Math.pow(npc.location.x - x, 2) + Math.pow(npc.location.y - y, 2)
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
    dialogueId: string = 'greeting'
  ): Promise<{
    npc: NPCData;
    dialogue: NPCDialogue;
    relationship: { reputation: number; lastInteraction: Date };
  }> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error('NPC 不存在');
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
    const dialogue = npc.dialogues.find(d => d.id === dialogueId);
    if (!dialogue) {
      throw new Error('對話不存在');
    }

    console.log(`[NpcsService] 玩家 ${playerId} 與 NPC ${npc.name} 對話: ${dialogueId}`);

    return {
      npc,
      dialogue,
      relationship: npc.relationships[playerId],
    };
  }

  /**
   * 獲取NPC的商店
   */
  async getNPCShop(npcId: string, playerId: string): Promise<any> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error('NPC 不存在');
    }

    if (!npc.shop) {
      throw new Error('此 NPC 沒有商店');
    }

    // 根據玩家與NPC的關係調整價格
    const relationship = npc.relationships[playerId];
    const discount = relationship && relationship.reputation > 50 ? 0.9 : 1.0;

    const shop = {
      ...npc.shop,
      items: npc.shop.items.map(item => ({
        ...item,
        price: Math.floor(item.price * discount),
      })),
    };

    return {
      npcName: npc.name,
      shop,
      discount: discount < 1.0 ? Math.round((1 - discount) * 100) : 0,
    };
  }

  /**
   * 從NPC購買物品
   */
  async buyFromNPC(
    npcId: string,
    playerId: string,
    itemId: string,
    quantity: number
  ): Promise<{
    success: boolean;
    message: string;
    totalCost?: number;
  }> {
    const npc = await this.getNPCById(npcId);
    if (!npc || !npc.shop) {
      return { success: false, message: 'NPC 商店不存在' };
    }

    const item = npc.shop.items.find(i => i.itemId === itemId);
    if (!item) {
      return { success: false, message: '商品不存在' };
    }

    if (item.stock < quantity) {
      return { success: false, message: '庫存不足' };
    }

    // 獲取玩家資料檢查金錢
    const user = await this.prisma.user.findUnique({
      where: { id: playerId },
      include: { gameCharacter: true },
    });

    if (!user || !user.gameCharacter) {
      return { success: false, message: '玩家資料不存在' };
    }

    const relationship = npc.relationships[playerId];
    const discount = relationship && relationship.reputation > 50 ? 0.9 : 1.0;
    const totalCost = Math.floor(item.price * discount * quantity);

    if ((user.gameCharacter.goldAmount || 0) < totalCost) {
      return { success: false, message: '金錢不足' };
    }

    // 扣除金錢和庫存
    await this.prisma.gameCharacter.update({
      where: { id: user.gameCharacter.id },
      data: {
        goldAmount: (user.gameCharacter.goldAmount || 0) - totalCost,
      },
    });

    item.stock -= quantity;

    console.log(`[NpcsService] 玩家 ${user.gameCharacter.characterName} 從 ${npc.name} 購買 ${quantity}x ${itemId}，花費 ${totalCost} 金幣`);

    return {
      success: true,
      message: `成功購買 ${quantity}x ${itemId}`,
      totalCost,
    };
  }

  /**
   * AI生成NPC日常對話（基於時間、天氣、玩家關係等）
   */
  async generateDynamicDialogue(
    npcId: string,
    playerId: string,
    context: {
      timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
      weather?: 'sunny' | 'rainy' | 'cloudy';
      playerLevel?: number;
      lastQuestCompleted?: string;
    }
  ): Promise<NPCDialogue> {
    const npc = await this.getNPCById(npcId);
    if (!npc) {
      throw new Error('NPC 不存在');
    }

    const relationship = npc.relationships[playerId];
    const reputation = relationship ? relationship.reputation : 0;

    // 基於多種因素生成對話
    let dynamicText = '';
    const timeGreeting = {
      morning: '早安',
      afternoon: '午安',
      evening: '晚安',
      night: '夜深了'
    };

    // 基礎問候
    dynamicText += `${timeGreeting[context.timeOfDay]}，`;

    // 基於好感度的稱呼
    if (reputation > 100) {
      dynamicText += '我的好友';
    } else if (reputation > 50) {
      dynamicText += '冒險者朋友';
    } else if (reputation > 10) {
      dynamicText += '年輕的冒險者';
    } else {
      dynamicText += '陌生人';
    }

    dynamicText += '！';

    // 基於天氣的評論
    if (context.weather === 'rainy') {
      dynamicText += '今天的雨真是讓人心情沉重呢。';
    } else if (context.weather === 'sunny') {
      dynamicText += '今天天氣真好，適合外出冒險。';
    }

    // 基於NPC職業的特色對話
    switch (npc.profession) {
      case NPCProfession.WOODCUTTER:
        dynamicText += '森林裡的木材品質最近很不錯。';
        break;
      case NPCProfession.MINER:
        dynamicText += '礦坑深處發現了一些有趣的礦物。';
        break;
      case NPCProfession.CRAFTER:
        dynamicText += '我剛完成了一件精美的作品。';
        break;
    }

    // 基於玩家等級的建議
    if (context.playerLevel && context.playerLevel < 10) {
      dynamicText += '你看起來還是個新手，要小心一些危險的區域。';
    } else if (context.playerLevel && context.playerLevel > 20) {
      dynamicText += '你已經是個經驗豐富的冒險者了，令人敬佩。';
    }

    return {
      id: 'dynamic',
      text: dynamicText,
      options: [
        { id: 'thanks', text: '謝謝你的關心', action: 'end_conversation' },
        { id: 'quest', text: '有什麼任務需要幫助嗎？', action: 'show_quests' },
        { id: 'chat', text: '我們聊聊其他的吧', nextDialogueId: 'greeting' },
      ],
    };
  }

  /**
   * 更新NPC的每日狀態和活動
   */
  async updateDailyStatus(): Promise<void> {
    const npcs = await this.getAllNPCs();
    const currentTime = new Date();
    const timeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;

    for (const npc of npcs) {
      // 根據日程更新NPC位置和活動
      const currentActivity = npc.schedule.find(s => s.time <= timeString);
      if (currentActivity) {
        console.log(`[NpcsService] ${npc.name} 現在在 ${currentActivity.location} 進行 ${currentActivity.activity}`);
      }

      // 更新NPC心情（基於隨機事件、玩家互動等）
      const moodChange = Math.random();
      if (moodChange < 0.1) {
        const moods: Array<'happy' | 'neutral' | 'sad' | 'angry' | 'excited'> = ['happy', 'neutral', 'sad', 'angry', 'excited'];
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
          title: '木材採集',
          description: '森林裡需要砍伐一些高品質的木材',
          type: 'GATHER',
          target: 'wood',
          quantity: Math.floor(Math.random() * 10) + 5,
        }
      ],
      [NPCProfession.MINER]: [
        {
          title: '礦物挖掘',
          description: '礦坑需要更多的礦石來維持生產',
          type: 'GATHER',
          target: 'ore',
          quantity: Math.floor(Math.random() * 8) + 3,
        }
      ],
      [NPCProfession.FARMER]: [
        {
          title: '作物收穫',
          description: '農田的作物已經成熟，需要人手幫忙收割',
          type: 'GATHER',
          target: 'crops',
          quantity: Math.floor(Math.random() * 15) + 10,
        }
      ],
      [NPCProfession.HUNTER]: [
        {
          title: '清理野獸',
          description: '附近出現了一些威脅居民安全的野獸',
          type: 'KILL',
          target: 'wild_beast',
          quantity: Math.floor(Math.random() * 5) + 2,
        }
      ],
    };

    const templates = questTemplates[npc.profession] || [];
    return templates.map(template => ({
      ...template,
      npcId: npc.id,
      npcName: npc.name,
      difficulty: 'NORMAL',
      rewards: {
        experience: template.quantity * 20,
        gold: template.quantity * 10,
      },
    }));
  }
}