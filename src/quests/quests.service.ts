import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum QuestType {
  GATHER = 'GATHER',      // 收集任務
  KILL = 'KILL',          // 擊敗怪物任務
  DELIVER = 'DELIVER',    // 傳送任務
  TALK = 'TALK',          // 對話任務
  EXPLORE = 'EXPLORE',    // 探索任務
}

export enum QuestStatus {
  AVAILABLE = 'AVAILABLE',   // 可接受
  ACCEPTED = 'ACCEPTED',     // 已接受
  COMPLETED = 'COMPLETED',   // 已完成
  SUBMITTED = 'SUBMITTED',   // 已提交
  EXPIRED = 'EXPIRED',       // 已過期
}

export enum QuestDifficulty {
  EASY = 'EASY',
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  EPIC = 'EPIC',
}

interface QuestReward {
  experience: number;
  gold: number;
  items?: Array<{
    itemId: string;
    quantity: number;
  }>;
}

interface QuestObjective {
  id: string;
  description: string;
  type: string;
  targetId?: string;
  currentProgress: number;
  requiredProgress: number;
  completed: boolean;
}

interface QuestData {
  id: string;
  title: string;
  description: string;
  type: QuestType;
  difficulty: QuestDifficulty;
  npcId: string;
  npcName: string;
  requiredLevel: number;
  timeLimit?: number; // 分鐘
  objectives: QuestObjective[];
  rewards: QuestReward;
  status: QuestStatus;
  acceptedAt?: Date;
  completedAt?: Date;
  expiresAt?: Date;
}

@Injectable()
export class QuestsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 獲取玩家的所有任務
   */
  async getPlayerQuests(userId: string): Promise<QuestData[]> {
    // 模擬任務資料，實際應該從資料庫獲取
    const mockQuests: QuestData[] = [
      {
        id: 'quest-001',
        title: '初心者的第一步',
        description: '收集 10 個木材來證明你的能力',
        type: QuestType.GATHER,
        difficulty: QuestDifficulty.EASY,
        npcId: 'npc-woodcutter',
        npcName: '伐木工人',
        requiredLevel: 1,
        objectives: [
          {
            id: 'obj-001',
            description: '收集木材',
            type: 'gather',
            targetId: 'item-wood',
            currentProgress: 3,
            requiredProgress: 10,
            completed: false,
          }
        ],
        rewards: {
          experience: 100,
          gold: 50,
          items: [
            {
              itemId: 'item-wooden-sword',
              quantity: 1,
            }
          ]
        },
        status: QuestStatus.ACCEPTED,
        acceptedAt: new Date(Date.now() - 3600000), // 1小時前
      },
      {
        id: 'quest-002',
        title: '礦工的委託',
        description: '前往礦坑擊敗 5 隻史萊姆',
        type: QuestType.KILL,
        difficulty: QuestDifficulty.NORMAL,
        npcId: 'npc-miner',
        npcName: '礦工',
        requiredLevel: 3,
        objectives: [
          {
            id: 'obj-002',
            description: '擊敗史萊姆',
            type: 'kill',
            targetId: 'monster-slime',
            currentProgress: 2,
            requiredProgress: 5,
            completed: false,
          }
        ],
        rewards: {
          experience: 250,
          gold: 100,
          items: [
            {
              itemId: 'item-mining-helmet',
              quantity: 1,
            }
          ]
        },
        status: QuestStatus.ACCEPTED,
        acceptedAt: new Date(Date.now() - 1800000), // 30分鐘前
      },
      {
        id: 'quest-003',
        title: '商人的急件',
        description: '將貨物送達到城鎮廣場的商人處',
        type: QuestType.DELIVER,
        difficulty: QuestDifficulty.EASY,
        npcId: 'npc-merchant',
        npcName: '商人',
        requiredLevel: 2,
        timeLimit: 60, // 60分鐘時限
        objectives: [
          {
            id: 'obj-003',
            description: '送達貨物',
            type: 'deliver',
            targetId: 'npc-town-merchant',
            currentProgress: 0,
            requiredProgress: 1,
            completed: false,
          }
        ],
        rewards: {
          experience: 150,
          gold: 75,
        },
        status: QuestStatus.AVAILABLE,
        expiresAt: new Date(Date.now() + 3600000), // 1小時後過期
      }
    ];

    return mockQuests;
  }

  /**
   * 獲取可接受的任務列表
   */
  async getAvailableQuests(userId: string): Promise<QuestData[]> {
    const allQuests = await this.getPlayerQuests(userId);
    return allQuests.filter(quest => quest.status === QuestStatus.AVAILABLE);
  }

  /**
   * 接受任務
   */
  async acceptQuest(userId: string, questId: string): Promise<QuestData> {
    // 獲取用戶角色資訊
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { gameCharacter: true },
    });

    if (!user || !user.gameCharacter) {
      throw new NotFoundException('用戶或角色未找到');
    }

    const character = user.gameCharacter;
    const allQuests = await this.getPlayerQuests(userId);
    const quest = allQuests.find(q => q.id === questId);

    if (!quest) {
      throw new NotFoundException('任務不存在');
    }

    if (quest.status !== QuestStatus.AVAILABLE) {
      throw new BadRequestException('任務不可接受');
    }

    // 檢查等級要求
    if (character.level < quest.requiredLevel) {
      throw new BadRequestException(`需要等級 ${quest.requiredLevel} 才能接受此任務`);
    }

    // 檢查任務數量限制（假設最多同時進行 5 個任務）
    const activeQuests = allQuests.filter(q => 
      q.status === QuestStatus.ACCEPTED || q.status === QuestStatus.COMPLETED
    );
    if (activeQuests.length >= 5) {
      throw new BadRequestException('同時進行的任務過多，請先完成一些任務');
    }

    // 更新任務狀態
    quest.status = QuestStatus.ACCEPTED;
    quest.acceptedAt = new Date();
    
    // 如果有時間限制，設置過期時間
    if (quest.timeLimit) {
      quest.expiresAt = new Date(Date.now() + quest.timeLimit * 60 * 1000);
    }

    // 實際應該保存到資料庫
    console.log(`[QuestsService] 玩家 ${character.characterName} 接受任務: ${quest.title}`);

    return quest;
  }

  /**
   * 更新任務進度
   */
  async updateQuestProgress(
    userId: string, 
    questId: string, 
    objectiveId: string, 
    progress: number
  ): Promise<QuestData> {
    const allQuests = await this.getPlayerQuests(userId);
    const quest = allQuests.find(q => q.id === questId);

    if (!quest) {
      throw new NotFoundException('任務不存在');
    }

    if (quest.status !== QuestStatus.ACCEPTED) {
      throw new BadRequestException('任務未處於進行中狀態');
    }

    // 找到目標
    const objective = quest.objectives.find(obj => obj.id === objectiveId);
    if (!objective) {
      throw new NotFoundException('任務目標不存在');
    }

    // 更新進度
    objective.currentProgress = Math.min(progress, objective.requiredProgress);
    objective.completed = objective.currentProgress >= objective.requiredProgress;

    // 檢查任務是否完成
    const allObjectivesCompleted = quest.objectives.every(obj => obj.completed);
    if (allObjectivesCompleted && quest.status === QuestStatus.ACCEPTED) {
      quest.status = QuestStatus.COMPLETED;
      quest.completedAt = new Date();
    }

    console.log(`[QuestsService] 任務進度更新: ${quest.title} - ${objective.description}: ${objective.currentProgress}/${objective.requiredProgress}`);

    return quest;
  }

  /**
   * 提交任務並獲得獎勵
   */
  async submitQuest(userId: string, questId: string): Promise<{
    quest: QuestData;
    rewards: QuestReward;
  }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { gameCharacter: true },
    });

    if (!user || !user.gameCharacter) {
      throw new NotFoundException('用戶或角色未找到');
    }

    const allQuests = await this.getPlayerQuests(userId);
    const quest = allQuests.find(q => q.id === questId);

    if (!quest) {
      throw new NotFoundException('任務不存在');
    }

    if (quest.status !== QuestStatus.COMPLETED) {
      throw new BadRequestException('任務尚未完成');
    }

    // 發放獎勵
    const character = user.gameCharacter;
    const newExperience = character.experience + quest.rewards.experience;
    const newGold = (character.goldAmount || 0) + quest.rewards.gold;

    // 更新角色資料
    await this.prisma.gameCharacter.update({
      where: { id: character.id },
      data: {
        experience: newExperience,
        goldAmount: newGold,
      },
    });

    // 更新任務狀態
    quest.status = QuestStatus.SUBMITTED;

    console.log(`[QuestsService] 任務提交成功: ${quest.title}，獎勵: ${quest.rewards.experience} EXP, ${quest.rewards.gold} Gold`);

    return {
      quest,
      rewards: quest.rewards,
    };
  }

  /**
   * 放棄任務
   */
  async abandonQuest(userId: string, questId: string): Promise<boolean> {
    const allQuests = await this.getPlayerQuests(userId);
    const quest = allQuests.find(q => q.id === questId);

    if (!quest) {
      throw new NotFoundException('任務不存在');
    }

    if (quest.status !== QuestStatus.ACCEPTED) {
      throw new BadRequestException('只能放棄已接受的任務');
    }

    // 重置任務狀態
    quest.status = QuestStatus.AVAILABLE;
    quest.acceptedAt = undefined;
    quest.expiresAt = undefined;

    // 重置任務進度
    quest.objectives.forEach(obj => {
      obj.currentProgress = 0;
      obj.completed = false;
    });

    console.log(`[QuestsService] 任務已放棄: ${quest.title}`);

    return true;
  }

  /**
   * 獲取每日任務（AI 生成）
   */
  async getDailyQuests(userId: string): Promise<QuestData[]> {
    // 這裡可以整合 AI 來生成基於玩家等級和進度的每日任務
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { gameCharacter: true },
    });

    if (!user || !user.gameCharacter) {
      return [];
    }

    const character = user.gameCharacter;
    const playerLevel = character.level;

    // 基於玩家等級生成適當的每日任務
    const dailyQuests: QuestData[] = [
      {
        id: `daily-${new Date().toISOString().split('T')[0]}-001`,
        title: '每日收集',
        description: `收集 ${Math.max(5, playerLevel * 2)} 個資源`,
        type: QuestType.GATHER,
        difficulty: QuestDifficulty.NORMAL,
        npcId: 'npc-daily-quest-giver',
        npcName: '任務發布員',
        requiredLevel: Math.max(1, playerLevel - 2),
        timeLimit: 1440, // 24小時
        objectives: [
          {
            id: 'daily-obj-001',
            description: '收集任意資源',
            type: 'gather_any',
            currentProgress: 0,
            requiredProgress: Math.max(5, playerLevel * 2),
            completed: false,
          }
        ],
        rewards: {
          experience: playerLevel * 50,
          gold: playerLevel * 25,
        },
        status: QuestStatus.AVAILABLE,
        expiresAt: new Date(new Date().setHours(23, 59, 59, 999)), // 今天結束
      }
    ];

    return dailyQuests;
  }

  /**
   * 檢查並清理過期任務
   */
  async cleanupExpiredQuests(userId: string): Promise<number> {
    const allQuests = await this.getPlayerQuests(userId);
    let cleanedCount = 0;

    const now = new Date();
    
    for (const quest of allQuests) {
      if (quest.expiresAt && now > quest.expiresAt && quest.status === QuestStatus.ACCEPTED) {
        quest.status = QuestStatus.EXPIRED;
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`[QuestsService] 清理了 ${cleanedCount} 個過期任務`);
    }

    return cleanedCount;
  }
}