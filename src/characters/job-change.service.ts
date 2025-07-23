import { Injectable, Logger, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService } from '../skills/skills.service';
import { 
  CharacterClass, 
  getJobChangeRequirements, 
  canChangeToJob,
  getClassData,
  JobChangeResult,
  CLASS_DISPLAY_NAMES
} from './character-classes.types';

@Injectable()
export class JobChangeService {
  private readonly logger = new Logger(JobChangeService.name);

  constructor(
    private prisma: PrismaService,
    private skillsService: SkillsService
  ) {}

  /**
   * 檢查角色轉職資格
   */
  async checkJobChangeEligibility(
    characterId: string,
    targetClass: CharacterClass
  ): Promise<{ canChange: boolean; missingRequirements: string[]; cost: number }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      include: {
        knowledges: true
      }
    });

    if (!character) {
      throw new BadRequestException('角色不存在');
    }

    // 獲取角色已學習的知識列表
    const learnedKnowledge = character.knowledges.map(k => k.knowledgeName);

    // 檢查轉職條件
    const eligibilityCheck = canChangeToJob(
      character.characterClass as CharacterClass,
      targetClass,
      character.level,
      {
        strength: character.strength,
        dexterity: character.dexterity,
        intelligence: character.intelligence,
        vitality: character.vitality,
        luck: character.luck
      },
      character.mana,
      learnedKnowledge,
      character.goldAmount
    );

    const requirements = getJobChangeRequirements(targetClass);
    const cost = requirements?.goldCost || 0;

    return {
      canChange: eligibilityCheck.canChange,
      missingRequirements: eligibilityCheck.missingRequirements,
      cost
    };
  }

  /**
   * 獲取角色可以轉職的職業列表
   */
  async getAvailableJobs(characterId: string): Promise<Array<{
    class: CharacterClass;
    name: string;
    description: string;
    canChange: boolean;
    missingRequirements: string[];
    cost: number;
    npcRequired: string;
  }>> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      include: {
        knowledges: true
      }
    });

    if (!character) {
      throw new BadRequestException('角色不存在');
    }

    const availableJobs = [];
    const jobsToCheck = [CharacterClass.WARRIOR, CharacterClass.MAGE, CharacterClass.ARCHER, CharacterClass.ROGUE];

    for (const jobClass of jobsToCheck) {
      const eligibility = await this.checkJobChangeEligibility(characterId, jobClass);
      const requirements = getJobChangeRequirements(jobClass);
      const classData = getClassData(jobClass);

      if (requirements) {
        availableJobs.push({
          class: jobClass,
          name: classData.name,
          description: classData.description,
          canChange: eligibility.canChange,
          missingRequirements: eligibility.missingRequirements,
          cost: eligibility.cost,
          npcRequired: requirements.npcRequired
        });
      }
    }

    return availableJobs;
  }

  /**
   * 執行轉職
   */
  async performJobChange(
    characterId: string,
    targetClass: CharacterClass,
    npcTrainerId: string
  ): Promise<JobChangeResult> {
    // 檢查轉職資格
    const eligibility = await this.checkJobChangeEligibility(characterId, targetClass);
    
    if (!eligibility.canChange) {
      return {
        success: false,
        message: `轉職條件不滿足：${eligibility.missingRequirements.join(', ')}`
      };
    }

    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return {
        success: false,
        message: '角色不存在'
      };
    }

    const requirements = getJobChangeRequirements(targetClass);
    if (!requirements) {
      return {
        success: false,
        message: '無效的目標職業'
      };
    }

    // 驗證NPC
    if (npcTrainerId !== requirements.npcRequired) {
      return {
        success: false,
        message: '請找正確的NPC進行轉職'
      };
    }

    const oldClass = character.characterClass as CharacterClass;
    const newClassData = getClassData(targetClass);

    try {
      await this.prisma.$transaction(async (prisma) => {
        // 扣除金幣
        await prisma.gameCharacter.update({
          where: { id: characterId },
          data: {
            goldAmount: character.goldAmount - requirements.goldCost
          }
        });

        // 執行轉職 - 更新職業和屬性
        const updatedCharacter = await prisma.gameCharacter.update({
          where: { id: characterId },
          data: {
            characterClass: targetClass,
            // 不重置現有屬性，只是改變職業標識
            // 成長率將在之後的升級中生效
          }
        });

        // 記錄轉職歷史
        await prisma.jobChangeHistory.create({
          data: {
            characterId,
            fromClass: oldClass,
            toClass: targetClass,
            npcTrainerId,
            costPaid: requirements.goldCost,
            levelAtChange: character.level,
            notes: `從 ${CLASS_DISPLAY_NAMES[oldClass]} 轉職為 ${CLASS_DISPLAY_NAMES[targetClass]}`
          }
        });

        // 如果轉職為法師且有智力，但不自動開啟魔法收納
        // 玩家需要後續學習「空間魔法」技能
        if (targetClass === CharacterClass.MAGE) {
          // 不自動初始化魔法收納，需要學習技能
          this.logger.log(`角色 ${characterId} 轉職為法師，魔法收納需要後續學習`);
        }

        // 給予職業起始技能（如果尚未擁有）
        if (this.skillsService && newClassData.startingSkills.length > 0) {
          for (const skillType of newClassData.startingSkills) {
            try {
              await this.skillsService.practiceSkill(
                character.userId,
                skillType as any,
                `轉職為${newClassData.name}獲得的技能`,
                'light'
              );
            } catch (error) {
              this.logger.warn(`[JobChangeService] 給予起始技能失敗: ${skillType}`, error);
            }
          }
        }
      });

      this.logger.log(`角色 ${characterId} 成功從 ${CLASS_DISPLAY_NAMES[oldClass]} 轉職為 ${CLASS_DISPLAY_NAMES[targetClass]}`);

      return {
        success: true,
        message: `恭喜！您已成功轉職為${CLASS_DISPLAY_NAMES[targetClass]}！`,
        newClass: targetClass,
        oldClass,
        bonusesApplied: [
          `獲得${CLASS_DISPLAY_NAMES[targetClass]}的職業特性`,
          `新的成長率將在下次升級時生效`
        ],
        costsDeducted: {
          gold: requirements.goldCost
        }
      };

    } catch (error) {
      this.logger.error('轉職過程中發生錯誤:', error);
      return {
        success: false,
        message: '轉職過程中發生錯誤，請稍後再試'
      };
    }
  }

  /**
   * 獲取角色轉職歷史
   */
  async getJobChangeHistory(characterId: string) {
    const history = await this.prisma.jobChangeHistory.findMany({
      where: { characterId },
      orderBy: { changedAt: 'desc' }
    });

    return history.map(record => ({
      id: record.id,
      fromClass: CLASS_DISPLAY_NAMES[record.fromClass as CharacterClass] || record.fromClass,
      toClass: CLASS_DISPLAY_NAMES[record.toClass as CharacterClass] || record.toClass,
      changedAt: record.changedAt,
      npcTrainerId: record.npcTrainerId,
      costPaid: record.costPaid,
      levelAtChange: record.levelAtChange,
      notes: record.notes
    }));
  }

  /**
   * 檢查NPC是否可以進行轉職服務
   */
  isNpcJobTrainer(npcId: string): { isTrainer: boolean; trainableClass?: CharacterClass } {
    const trainerMapping = {
      'npc-warrior-trainer': CharacterClass.WARRIOR,
      'npc-003': CharacterClass.MAGE, // 智者奧丁
      'npc-archer-trainer': CharacterClass.ARCHER,
      'npc-rogue-trainer': CharacterClass.ROGUE
    };

    const trainableClass = trainerMapping[npcId as keyof typeof trainerMapping];
    
    return {
      isTrainer: !!trainableClass,
      trainableClass
    };
  }

  /**
   * 計算轉職總費用（包括金幣和物品）
   */
  calculateJobChangeCost(targetClass: CharacterClass): {
    goldCost: number;
    itemCosts: Array<{ itemId: string; quantity: number; name: string }>;
    totalEstimatedValue: number;
  } {
    const requirements = getJobChangeRequirements(targetClass);
    
    if (!requirements) {
      return {
        goldCost: 0,
        itemCosts: [],
        totalEstimatedValue: 0
      };
    }

    // 目前只有金幣費用，未來可擴展物品費用
    return {
      goldCost: requirements.goldCost,
      itemCosts: [],
      totalEstimatedValue: requirements.goldCost
    };
  }
}