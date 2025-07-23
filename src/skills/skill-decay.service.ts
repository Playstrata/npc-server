import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService, SkillType } from './skills.service';

// 技能衰減配置
interface SkillDecayConfig {
  skillType: SkillType;
  decayStartDays: number;      // 多少天後開始衰減
  decayRatePerDay: number;     // 每天衰減的熟練度點數
  minimumProficiency: number;  // 最低保持熟練度
  warningDays: number;         // 提前多少天警告
}

// 衰減事件類型
export enum DecayEventType {
  PROFICIENCY_DECAY = 'PROFICIENCY_DECAY',
  SKILL_RUST = 'SKILL_RUST',           // 技能生鏽
  KNOWLEDGE_FADE = 'KNOWLEDGE_FADE',   // 知識淡忘
  TOTAL_FORGET = 'TOTAL_FORGET'        // 完全遺忘
}

@Injectable()
export class SkillDecayService {
  private readonly logger = new Logger(SkillDecayService.name);

  constructor(
    private prisma: PrismaService,
    private skillsService: SkillsService
  ) {}

  /**
   * 獲取技能衰減配置
   */
  private getDecayConfigs(): SkillDecayConfig[] {
    return [
      // 製造技能 - 衰減較慢，需要保持手感
      {
        skillType: SkillType.BLACKSMITHING,
        decayStartDays: 14,     // 2週後開始衰減
        decayRatePerDay: 5,     // 每天衰減5點
        minimumProficiency: 100, // 最低保持100熟練度
        warningDays: 3
      },
      {
        skillType: SkillType.ALCHEMY,
        decayStartDays: 10,     // 煉金術較複雜，10天後開始衰減
        decayRatePerDay: 8,
        minimumProficiency: 50,
        warningDays: 3
      },
      {
        skillType: SkillType.CRAFTING,
        decayStartDays: 21,     // 基礎製作技能衰減慢
        decayRatePerDay: 3,
        minimumProficiency: 150,
        warningDays: 5
      },
      {
        skillType: SkillType.COOKING,
        decayStartDays: 7,      // 烹飪需要經常練習
        decayRatePerDay: 4,
        minimumProficiency: 80,
        warningDays: 2
      },

      // 採集技能 - 衰減中等，肌肉記憶
      {
        skillType: SkillType.WOODCUTTING,
        decayStartDays: 30,     // 體力活，衰減較慢
        decayRatePerDay: 2,
        minimumProficiency: 200,
        warningDays: 7
      },
      {
        skillType: SkillType.MINING,
        decayStartDays: 25,
        decayRatePerDay: 3,
        minimumProficiency: 150,
        warningDays: 5
      },
      {
        skillType: SkillType.FISHING,
        decayStartDays: 14,     // 需要手感和經驗
        decayRatePerDay: 4,
        minimumProficiency: 100,
        warningDays: 3
      },
      {
        skillType: SkillType.HERBALISM,
        decayStartDays: 20,     // 識別能力需要保持
        decayRatePerDay: 6,
        minimumProficiency: 80,
        warningDays: 4
      },

      // 學術技能 - 衰減最快，需要持續學習
      {
        skillType: SkillType.MAGIC,
        decayStartDays: 5,      // 魔法理論容易遺忘
        decayRatePerDay: 12,
        minimumProficiency: 30,
        warningDays: 2
      },
      {
        skillType: SkillType.SCHOLARSHIP,
        decayStartDays: 7,      // 學術知識需要復習
        decayRatePerDay: 10,
        minimumProficiency: 50,
        warningDays: 2
      },

      // 社交技能 - 衰減慢，但需要實踐
      {
        skillType: SkillType.TRADING,
        decayStartDays: 45,     // 商業嗅覺保持較久
        decayRatePerDay: 2,
        minimumProficiency: 120,
        warningDays: 10
      },
      {
        skillType: SkillType.NEGOTIATION,
        decayStartDays: 30,     // 談判技巧需要練習
        decayRatePerDay: 3,
        minimumProficiency: 100,
        warningDays: 7
      },

      // 戰鬥技能 - 特殊處理，衰減很慢
      {
        skillType: SkillType.COMBAT,
        decayStartDays: 60,     // 戰鬥本能保持很久
        decayRatePerDay: 1,
        minimumProficiency: 300,
        warningDays: 14
      }
    ];
  }

  /**
   * 每天定時檢查技能衰減（凌晨3點執行）
   */
  @Cron('0 3 * * *') // 每天凌晨3點
  async performDailyDecayCheck(): Promise<void> {
    this.logger.log('開始執行每日技能衰減檢查...');
    
    try {
      const decayConfigs = this.getDecayConfigs();
      const allPlayers = await this.getAllActivePlayerIds();
      
      let totalDecayEvents = 0;
      let totalPlayersAffected = 0;

      for (const playerId of allPlayers) {
        const playerDecayEvents = await this.processPlayerSkillDecay(playerId, decayConfigs);
        if (playerDecayEvents > 0) {
          totalPlayersAffected++;
          totalDecayEvents += playerDecayEvents;
        }
      }

      this.logger.log(`技能衰減檢查完成。影響玩家: ${totalPlayersAffected}, 總衰減事件: ${totalDecayEvents}`);
    } catch (error) {
      this.logger.error('技能衰減檢查失敗:', error);
    }
  }

  /**
   * 處理單個玩家的技能衰減
   */
  async processPlayerSkillDecay(playerId: string, decayConfigs: SkillDecayConfig[]): Promise<number> {
    const playerSkills = await this.skillsService.getPlayerSkills(playerId);
    let decayEvents = 0;

    for (const [skillTypeKey, skill] of Object.entries(playerSkills.skills)) {
      const skillType = skillTypeKey as SkillType;
      const config = decayConfigs.find(c => c.skillType === skillType);
      
      if (!config) continue;

      // 檢查技能是否需要衰減
      const daysSinceLastPractice = this.getDaysSince(skill.lastPracticed);
      
      if (daysSinceLastPractice >= config.decayStartDays) {
        // 計算衰減天數
        const decayDays = daysSinceLastPractice - config.decayStartDays + 1;
        const totalDecayAmount = decayDays * config.decayRatePerDay;

        // 處理知識衰減
        for (const knowledge of skill.knowledges) {
          const originalProficiency = knowledge.proficiency;
          const newProficiency = Math.max(
            config.minimumProficiency,
            originalProficiency - totalDecayAmount
          );

          if (newProficiency < originalProficiency) {
            knowledge.proficiency = newProficiency;
            
            // 記錄衰減事件
            await this.logDecayEvent(playerId, skillType, knowledge.name, {
              type: DecayEventType.PROFICIENCY_DECAY,
              originalValue: originalProficiency,
              newValue: newProficiency,
              daysSinceLastPractice,
              decayAmount: originalProficiency - newProficiency
            });

            decayEvents++;

            // 檢查是否觸發警告等級
            if (newProficiency <= config.minimumProficiency * 1.5) {
              await this.triggerSkillWarning(playerId, skillType, knowledge.name, 'CRITICAL');
            } else if (newProficiency <= config.minimumProficiency * 2) {
              await this.triggerSkillWarning(playerId, skillType, knowledge.name, 'WARNING');
            }
          }
        }
      } else if (daysSinceLastPractice >= (config.decayStartDays - config.warningDays)) {
        // 提前警告
        for (const knowledge of skill.knowledges) {
          await this.triggerSkillWarning(playerId, skillType, knowledge.name, 'UPCOMING');
        }
      }
    }

    return decayEvents;
  }

  /**
   * 手動檢查玩家技能衰減
   */
  async checkPlayerSkillDecay(playerId: string): Promise<{
    decayedSkills: Array<{
      skillType: SkillType;
      knowledgeName: string;
      originalProficiency: number;
      newProficiency: number;
      decayAmount: number;
      daysSinceLastPractice: number;
    }>;
    warnings: Array<{
      skillType: SkillType;
      knowledgeName: string;
      currentProficiency: number;
      daysUntilDecay: number;
      warningLevel: 'UPCOMING' | 'WARNING' | 'CRITICAL';
    }>;
  }> {
    const playerSkills = await this.skillsService.getPlayerSkills(playerId);
    const decayConfigs = this.getDecayConfigs();
    const decayedSkills: any[] = [];
    const warnings: any[] = [];

    for (const [skillTypeKey, skill] of Object.entries(playerSkills.skills)) {
      const skillType = skillTypeKey as SkillType;
      const config = decayConfigs.find(c => c.skillType === skillType);
      
      if (!config) continue;

      const daysSinceLastPractice = this.getDaysSince(skill.lastPracticed);
      
      for (const knowledge of skill.knowledges) {
        if (daysSinceLastPractice >= config.decayStartDays) {
          // 技能已經開始衰減
          const decayDays = daysSinceLastPractice - config.decayStartDays + 1;
          const decayAmount = decayDays * config.decayRatePerDay;
          const originalProficiency = knowledge.proficiency;
          const newProficiency = Math.max(config.minimumProficiency, originalProficiency - decayAmount);

          if (newProficiency < originalProficiency) {
            decayedSkills.push({
              skillType,
              knowledgeName: knowledge.name,
              originalProficiency,
              newProficiency,
              decayAmount: originalProficiency - newProficiency,
              daysSinceLastPractice
            });
          }
        } else if (daysSinceLastPractice >= (config.decayStartDays - config.warningDays)) {
          // 即將開始衰減
          const daysUntilDecay = config.decayStartDays - daysSinceLastPractice;
          let warningLevel: 'UPCOMING' | 'WARNING' | 'CRITICAL' = 'UPCOMING';
          
          if (knowledge.proficiency <= config.minimumProficiency * 1.5) {
            warningLevel = 'CRITICAL';
          } else if (knowledge.proficiency <= config.minimumProficiency * 2) {
            warningLevel = 'WARNING';
          }

          warnings.push({
            skillType,
            knowledgeName: knowledge.name,
            currentProficiency: knowledge.proficiency,
            daysUntilDecay,
            warningLevel
          });
        }
      }
    }

    return { decayedSkills, warnings };
  }

  /**
   * 復習技能以防止衰減
   */
  async reviewSkill(
    playerId: string, 
    skillType: SkillType, 
    knowledgeName: string
  ): Promise<{
    success: boolean;
    message: string;
    proficiencyRestored: number;
    experienceGained: number;
  }> {
    const playerSkills = await this.skillsService.getPlayerSkills(playerId);
    const skill = playerSkills.skills[skillType];
    
    if (!skill) {
      return {
        success: false,
        message: '技能未解鎖',
        proficiencyRestored: 0,
        experienceGained: 0
      };
    }

    const knowledge = skill.knowledges.find(k => k.name === knowledgeName);
    if (!knowledge) {
      return {
        success: false,
        message: '尚未學習此知識',
        proficiencyRestored: 0,
        experienceGained: 0
      };
    }

    // 復習效果：恢復一些熟練度，但不超過原始值的90%
    const maxRestoreProficiency = 900; // 復習最多恢復到900熟練度
    const currentProficiency = knowledge.proficiency;
    const restoreAmount = Math.min(50, maxRestoreProficiency - currentProficiency);
    
    if (restoreAmount > 0) {
      knowledge.proficiency += restoreAmount;
      
      // 復習也給少量經驗
      const experienceGained = Math.round(restoreAmount * 0.3);
      
      // 更新最後練習時間
      skill.lastPracticed = new Date();

      await this.logDecayEvent(playerId, skillType, knowledgeName, {
        type: DecayEventType.SKILL_RUST,
        originalValue: currentProficiency,
        newValue: knowledge.proficiency,
        daysSinceLastPractice: 0,
        decayAmount: -restoreAmount, // 負數表示恢復
        action: 'REVIEW'
      });

      return {
        success: true,
        message: `復習「${knowledgeName}」成功！熟練度恢復 ${restoreAmount} 點`,
        proficiencyRestored: restoreAmount,
        experienceGained
      };
    } else {
      return {
        success: false,
        message: '此知識的熟練度已經很高，無需復習',
        proficiencyRestored: 0,
        experienceGained: 0
      };
    }
  }

  /**
   * 獲取技能維護建議
   */
  async getSkillMaintenanceRecommendations(playerId: string): Promise<Array<{
    skillType: SkillType;
    knowledgeName: string;
    priority: 'HIGH' | 'MEDIUM' | 'LOW';
    recommendation: string;
    daysSinceLastPractice: number;
    currentProficiency: number;
  }>> {
    const { warnings } = await this.checkPlayerSkillDecay(playerId);
    
    return warnings.map(warning => {
      let priority: 'HIGH' | 'MEDIUM' | 'LOW' = 'LOW';
      let recommendation = '';

      switch (warning.warningLevel) {
        case 'CRITICAL':
          priority = 'HIGH';
          recommendation = `緊急！「${warning.knowledgeName}」熟練度過低，建議立即復習或練習`;
          break;
        case 'WARNING':
          priority = 'MEDIUM';
          recommendation = `注意：「${warning.knowledgeName}」熟練度下降中，建議近期練習`;
          break;
        case 'UPCOMING':
          priority = 'LOW';
          recommendation = `提醒：「${warning.knowledgeName}」將在 ${warning.daysUntilDecay} 天後開始衰減`;
          break;
      }

      return {
        skillType: warning.skillType,
        knowledgeName: warning.knowledgeName,
        priority,
        recommendation,
        daysSinceLastPractice: 0, // 需要從實際數據計算
        currentProficiency: warning.currentProficiency
      };
    });
  }

  // 輔助方法
  private async getAllActivePlayerIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: {
        gameCharacter: {
          isNot: null
        }
      },
      select: {
        id: true
      }
    });
    
    return users.map(user => user.id);
  }

  private getDaysSince(date: Date): number {
    const now = new Date();
    const timeDiff = now.getTime() - date.getTime();
    return Math.floor(timeDiff / (1000 * 60 * 60 * 24));
  }

  private async logDecayEvent(
    playerId: string, 
    skillType: SkillType, 
    knowledgeName: string, 
    eventData: any
  ): Promise<void> {
    try {
      // 獲取角色 ID
      const character = await this.prisma.gameCharacter.findUnique({
        where: { userId: playerId },
        select: { id: true }
      });

      if (!character) {
        this.logger.warn(`[SkillDecay] 找不到玩家 ${playerId} 的角色`);
        return;
      }

      // 記錄到資料庫
      await this.prisma.skillDecayLog.create({
        data: {
          characterId: character.id,
          skillType: skillType,
          knowledgeName: knowledgeName,
          eventType: eventData.type,
          originalValue: eventData.originalValue,
          newValue: eventData.newValue,
          decayAmount: eventData.decayAmount,
          daysSinceLastPractice: eventData.daysSinceLastPractice,
          action: eventData.action || 'AUTO_DECAY'
        }
      });

      this.logger.log(`[SkillDecay] ${playerId} - ${skillType}:${knowledgeName} - ${eventData.type} 衰減 ${eventData.decayAmount} 點`);
    } catch (error) {
      this.logger.error(`[SkillDecay] 記錄衰減事件失敗:`, error);
    }
  }

  private async triggerSkillWarning(
    playerId: string, 
    skillType: SkillType, 
    knowledgeName: string, 
    warningLevel: string
  ): Promise<void> {
    // 這裡可以發送通知給玩家
    this.logger.warn(`[SkillWarning] ${playerId} - ${skillType}:${knowledgeName} - ${warningLevel}`);
  }
}