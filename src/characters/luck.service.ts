import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export enum LuckEvent {
  // 正面事件 - 增加幸運值
  SKILL_CRITICAL_SUCCESS = 'SKILL_CRITICAL_SUCCESS',      // 技能大成功 +0.5%
  COMBAT_VICTORY = 'COMBAT_VICTORY',                      // 戰鬥勝利 +0.2%
  QUEST_COMPLETION = 'QUEST_COMPLETION',                  // 任務完成 +0.3%
  RARE_ITEM_FOUND = 'RARE_ITEM_FOUND',                   // 發現稀有物品 +1.0%
  RARE_DISCOVERY = 'RARE_DISCOVERY',                     // 稀有發現 +1.0%
  SUCCESSFUL_TRADE = 'SUCCESSFUL_TRADE',                 // 成功交易 +0.1%
  HELPING_OTHERS = 'HELPING_OTHERS',                     // 幫助他人 +0.4%
  LEVEL_UP = 'LEVEL_UP',                                 // 升級 +0.3%
  JOB_CHANGE_SUCCESS = 'JOB_CHANGE_SUCCESS',            // 轉職成功 +2.0%
  
  // 負面事件 - 減少幸運值
  SKILL_CRITICAL_FAILURE = 'SKILL_CRITICAL_FAILURE',     // 技能大失敗 -0.8%
  COMBAT_DEFEAT = 'COMBAT_DEFEAT',                       // 戰鬥失敗 -0.5%
  QUEST_FAILURE = 'QUEST_FAILURE',                       // 任務失敗 -0.7%
  ITEM_BROKEN = 'ITEM_BROKEN',                          // 物品損壞 -0.3%
  BAD_TRADE = 'BAD_TRADE',                              // 不良交易 -0.2%
  ANTISOCIAL_BEHAVIOR = 'ANTISOCIAL_BEHAVIOR',          // 反社會行為 -1.0%
  DEATH = 'DEATH',                                      // 死亡 -3.0%
  STEALING = 'STEALING',                                // 偷竊 -1.5%
  LYING_TO_NPC = 'LYING_TO_NPC',                       // 對NPC說謊 -0.6%
  
  // 時間衰減
  DAILY_DECAY = 'DAILY_DECAY'                           // 每日自然衰減 -0.1%
}

interface LuckEventConfig {
  event: LuckEvent;
  change: number;      // 幸運值變化（百分比）
  description: string;
  maxDailyOccurrences?: number; // 每日最大觸發次數
}

@Injectable()
export class LuckService {
  private readonly logger = new Logger(LuckService.name);
  
  // 幸運事件配置
  private readonly luckEventConfigs: Record<LuckEvent, LuckEventConfig> = {
    [LuckEvent.SKILL_CRITICAL_SUCCESS]: {
      event: LuckEvent.SKILL_CRITICAL_SUCCESS,
      change: 0.5,
      description: '技能施展大成功',
      maxDailyOccurrences: 10
    },
    [LuckEvent.COMBAT_VICTORY]: {
      event: LuckEvent.COMBAT_VICTORY,
      change: 0.2,
      description: '戰鬥勝利',
      maxDailyOccurrences: 20
    },
    [LuckEvent.QUEST_COMPLETION]: {
      event: LuckEvent.QUEST_COMPLETION,
      change: 0.3,
      description: '任務完成',
      maxDailyOccurrences: 15
    },
    [LuckEvent.RARE_ITEM_FOUND]: {
      event: LuckEvent.RARE_ITEM_FOUND,
      change: 1.0,
      description: '發現稀有物品',
      maxDailyOccurrences: 3
    },
    [LuckEvent.RARE_DISCOVERY]: {
      event: LuckEvent.RARE_DISCOVERY,
      change: 1.0,
      description: '稀有發現',
      maxDailyOccurrences: 3
    },
    [LuckEvent.SUCCESSFUL_TRADE]: {
      event: LuckEvent.SUCCESSFUL_TRADE,
      change: 0.1,
      description: '成功完成交易',
      maxDailyOccurrences: 50
    },
    [LuckEvent.HELPING_OTHERS]: {
      event: LuckEvent.HELPING_OTHERS,
      change: 0.4,
      description: '幫助其他玩家',
      maxDailyOccurrences: 5
    },
    [LuckEvent.LEVEL_UP]: {
      event: LuckEvent.LEVEL_UP,
      change: 0.3,
      description: '角色升級',
      maxDailyOccurrences: 10
    },
    [LuckEvent.JOB_CHANGE_SUCCESS]: {
      event: LuckEvent.JOB_CHANGE_SUCCESS,
      change: 2.0,
      description: '轉職成功',
      maxDailyOccurrences: 1
    },
    
    // 負面事件
    [LuckEvent.SKILL_CRITICAL_FAILURE]: {
      event: LuckEvent.SKILL_CRITICAL_FAILURE,
      change: -0.8,
      description: '技能施展大失敗',
      maxDailyOccurrences: 5
    },
    [LuckEvent.COMBAT_DEFEAT]: {
      event: LuckEvent.COMBAT_DEFEAT,
      change: -0.5,
      description: '戰鬥失敗',
      maxDailyOccurrences: 10
    },
    [LuckEvent.QUEST_FAILURE]: {
      event: LuckEvent.QUEST_FAILURE,
      change: -0.7,
      description: '任務失敗',
      maxDailyOccurrences: 5
    },
    [LuckEvent.ITEM_BROKEN]: {
      event: LuckEvent.ITEM_BROKEN,
      change: -0.3,
      description: '裝備損壞',
      maxDailyOccurrences: 8
    },
    [LuckEvent.BAD_TRADE]: {
      event: LuckEvent.BAD_TRADE,
      change: -0.2,
      description: '交易受騙',
      maxDailyOccurrences: 3
    },
    [LuckEvent.ANTISOCIAL_BEHAVIOR]: {
      event: LuckEvent.ANTISOCIAL_BEHAVIOR,
      change: -1.0,
      description: '反社會行為',
      maxDailyOccurrences: 5
    },
    [LuckEvent.DEATH]: {
      event: LuckEvent.DEATH,
      change: -3.0,
      description: '角色死亡',
      maxDailyOccurrences: 10
    },
    [LuckEvent.STEALING]: {
      event: LuckEvent.STEALING,
      change: -1.5,
      description: '偷竊行為',
      maxDailyOccurrences: 3
    },
    [LuckEvent.LYING_TO_NPC]: {
      event: LuckEvent.LYING_TO_NPC,
      change: -0.6,
      description: '對NPC說謊',
      maxDailyOccurrences: 5
    },
    [LuckEvent.DAILY_DECAY]: {
      event: LuckEvent.DAILY_DECAY,
      change: -0.1,
      description: '每日自然衰減',
      maxDailyOccurrences: 1
    }
  };

  constructor(private prisma: PrismaService) {}

  /**
   * 觸發幸運事件
   */
  async triggerLuckEvent(
    characterId: string, 
    event: LuckEvent, 
    context?: string
  ): Promise<{
    success: boolean;
    oldLuck: number;
    newLuck: number;
    change: number;
    message: string;
  }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return {
        success: false,
        oldLuck: 0,
        newLuck: 0,
        change: 0,
        message: '角色不存在'
      };
    }

    const eventConfig = this.luckEventConfigs[event];
    const oldLuck = character.luckPercentage;
    
    // 檢查每日觸發次數限制
    if (eventConfig.maxDailyOccurrences) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 這裡可以添加每日觸發次數檢查的邏輯
      // 目前先跳過，後續可以添加專門的 luck_events 表來追蹤
    }

    // 計算新的幸運值
    let newLuck = oldLuck + eventConfig.change;
    
    // 限制幸運值範圍：無下限，最高100%
    if (newLuck > 100.0) {
      newLuck = 100.0;
    }
    // 不設下限，可以為負數

    // 更新角色幸運值
    const updatedCharacter = await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: { luckPercentage: newLuck }
    });

    const change = newLuck - oldLuck;
    const message = `${eventConfig.description}：幸運值${change >= 0 ? '+' : ''}${change.toFixed(1)}% (${oldLuck.toFixed(1)}% → ${newLuck.toFixed(1)}%)`;

    this.logger.log(`[LuckService] 角色 ${character.characterName} 觸發幸運事件: ${message}`);

    return {
      success: true,
      oldLuck,
      newLuck,
      change,
      message
    };
  }

  /**
   * 獲取角色當前幸運值
   */
  async getCurrentLuck(characterId: string): Promise<number> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { luckPercentage: true }
    });

    return character?.luckPercentage || 100.0;
  }

  /**
   * 檢查幸運值對技能或戰鬥的影響
   */
  async applyLuckToAction(characterId: string, baseSuccessRate: number): Promise<{
    modifiedSuccessRate: number;
    luckMultiplier: number;
    luckPercentage: number;
  }> {
    const luckPercentage = await this.getCurrentLuck(characterId);
    
    // 幸運值轉換為乘數：100% = 1.0倍，50% = 0.5倍，負數也按比例
    const luckMultiplier = luckPercentage / 100.0;
    
    // 應用幸運值到成功率
    const modifiedSuccessRate = Math.min(100, Math.max(0, baseSuccessRate * luckMultiplier));

    return {
      modifiedSuccessRate,
      luckMultiplier,
      luckPercentage
    };
  }

  /**
   * 計算幸運對爆擊率的影響
   */
  async calculateLuckyCriticalRate(characterId: string, baseCritRate: number): Promise<{
    finalCritRate: number;
    luckBonus: number;
  }> {
    const luckPercentage = await this.getCurrentLuck(characterId);
    
    // 幸運值影響爆擊率：每10%幸運值增加1%爆擊率
    const luckBonus = Math.max(0, (luckPercentage - 50) / 10); // 基準點為50%
    const finalCritRate = Math.min(50, baseCritRate + luckBonus); // 最高50%爆擊率

    return {
      finalCritRate,
      luckBonus
    };
  }

  /**
   * 每日幸運值衰減處理
   */
  async processDailyLuckDecay(): Promise<void> {
    const characters = await this.prisma.gameCharacter.findMany({
      where: {
        luckPercentage: {
          gt: 100.0 // 只對超過100%的角色進行衰減
        }
      }
    });

    for (const character of characters) {
      await this.triggerLuckEvent(character.id, LuckEvent.DAILY_DECAY, '每日自然衰減');
    }

    this.logger.log(`[LuckService] 處理了 ${characters.length} 個角色的每日幸運值衰減`);
  }

  /**
   * 獲取幸運事件列表（用於調試和管理）
   */
  getLuckEventConfigs(): Record<LuckEvent, LuckEventConfig> {
    return this.luckEventConfigs;
  }

  /**
   * 批量觸發多個幸運事件（用於特殊情況）
   */
  async triggerMultipleLuckEvents(
    characterId: string, 
    events: { event: LuckEvent; context?: string }[]
  ): Promise<{
    success: boolean;
    results: Array<{
      event: LuckEvent;
      success: boolean;
      change: number;
      message: string;
    }>;
    finalLuck: number;
  }> {
    const results = [];
    let finalLuck = await this.getCurrentLuck(characterId);

    for (const { event, context } of events) {
      const result = await this.triggerLuckEvent(characterId, event, context);
      results.push({
        event,
        success: result.success,
        change: result.change,
        message: result.message
      });
      
      if (result.success) {
        finalLuck = result.newLuck;
      }
    }

    return {
      success: true,
      results,
      finalLuck
    };
  }

  async updateLuck(characterId: string, event: LuckEvent, context?: any) {
    try {
      const character = await this.prisma.gameCharacter.findUnique({
        where: { id: characterId }
      });

      if (!character) {
        throw new Error('Character not found');
      }

      // 根據事件類型計算幸運值變化
      const luckChange = this.getLuckChangeForEvent(event);
      const newLuckPercentage = Math.max(0, Math.min(100, character.luckPercentage + luckChange));

      await this.prisma.gameCharacter.update({
        where: { id: characterId },
        data: {
          luckPercentage: newLuckPercentage
        }
      });

      this.logger.log(`角色 ${characterId} 幸運值變化: ${event} ${luckChange > 0 ? '+' : ''}${luckChange}%`);

      return {
        success: true,
        previousLuck: character.luckPercentage,
        newLuck: newLuckPercentage,
        change: luckChange
      };
    } catch (error) {
      this.logger.error('更新幸運值失敗:', error);
      return { success: false, error: error.message };
    }
  }

  private getLuckChangeForEvent(event: LuckEvent): number {
    switch (event) {
      case LuckEvent.SKILL_CRITICAL_SUCCESS: return 0.5;
      case LuckEvent.COMBAT_VICTORY: return 0.2;
      case LuckEvent.QUEST_COMPLETION: return 0.3;
      case LuckEvent.RARE_ITEM_FOUND: return 1.0;
      case LuckEvent.RARE_DISCOVERY: return 1.0;
      case LuckEvent.SUCCESSFUL_TRADE: return 0.1;
      case LuckEvent.HELPING_OTHERS: return 0.4;
      case LuckEvent.LEVEL_UP: return 0.3;
      case LuckEvent.JOB_CHANGE_SUCCESS: return 2.0;
      case LuckEvent.SKILL_CRITICAL_FAILURE: return -0.8;
      case LuckEvent.COMBAT_DEFEAT: return -0.5;
      case LuckEvent.QUEST_FAILURE: return -0.7;
      case LuckEvent.ITEM_BROKEN: return -0.3;
      case LuckEvent.BAD_TRADE: return -0.2;
      case LuckEvent.ANTISOCIAL_BEHAVIOR: return -1.0;
      case LuckEvent.DEATH: return -3.0;
      case LuckEvent.STEALING: return -1.5;
      case LuckEvent.LYING_TO_NPC: return -0.6;
      case LuckEvent.DAILY_DECAY: return -0.1;
      default: return 0;
    }
  }
}