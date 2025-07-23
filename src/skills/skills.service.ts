import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

// 技能類型枚舉
export enum SkillType {
  // 戰鬥技能
  COMBAT = 'COMBAT',           // 戰鬥（打怪獲得經驗）
  
  // 採集技能
  MINING = 'MINING',           // 挖礦
  WOODCUTTING = 'WOODCUTTING', // 伐木
  FISHING = 'FISHING',         // 釣魚
  HERBALISM = 'HERBALISM',     // 草藥學
  
  // 製造技能
  CRAFTING = 'CRAFTING',       // 製作
  BLACKSMITHING = 'BLACKSMITHING', // 鍛造
  ALCHEMY = 'ALCHEMY',         // 煉金術
  COOKING = 'COOKING',         // 烹飪
  
  // 學術技能
  SCHOLARSHIP = 'SCHOLARSHIP', // 學術研究
  MAGIC = 'MAGIC',             // 魔法學
  
  // 特殊技能
  MAGICAL_STORAGE = 'MAGICAL_STORAGE', // 魔法收納
  
  // 社交技能
  TRADING = 'TRADING',         // 貿易
  NEGOTIATION = 'NEGOTIATION'  // 談判
}

// 技能等級
export enum SkillLevel {
  NOVICE = 'NOVICE',           // 新手 (0-99)
  APPRENTICE = 'APPRENTICE',   // 學徒 (100-299)
  JOURNEYMAN = 'JOURNEYMAN',   // 熟練工 (300-699)
  EXPERT = 'EXPERT',           // 專家 (700-1499)
  MASTER = 'MASTER',           // 大師 (1500-2999)
  GRANDMASTER = 'GRANDMASTER'  // 宗師 (3000+)
}

// 技能知識類型
export enum KnowledgeType {
  BASIC = 'BASIC',           // 基礎知識
  INTERMEDIATE = 'INTERMEDIATE', // 中級知識
  ADVANCED = 'ADVANCED',     // 高級知識
  MASTER = 'MASTER'          // 大師級知識
}

// 技能數據接口
interface SkillData {
  skillType: SkillType;
  experience: number;
  level: SkillLevel;
  knowledges: Array<{
    type: KnowledgeType;
    name: string;
    learnedAt: Date;
    teacherNpcId?: string;
    proficiency: number; // 熟練度 0-1000
  }>;
  practiceHistory: Array<{
    timestamp: Date;
    practiceType: string;
    experienceGained: number;
    proficiencyGained: number;
  }>;
  unlockedAt: Date;
  lastPracticed: Date;
}

// 玩家技能進度
interface PlayerSkills {
  playerId: string;
  skills: { [skillType: string]: SkillData };
  totalSkillPoints: number;
  masteriesUnlocked: string[];
}

@Injectable()
export class SkillsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 獲取技能等級所需經驗值表
   */
  private getSkillLevelRequirements(): { [level: string]: number } {
    return {
      [SkillLevel.NOVICE]: 0,
      [SkillLevel.APPRENTICE]: 100,
      [SkillLevel.JOURNEYMAN]: 300,
      [SkillLevel.EXPERT]: 700,
      [SkillLevel.MASTER]: 1500,
      [SkillLevel.GRANDMASTER]: 3000
    };
  }

  /**
   * 根據經驗值計算技能等級
   */
  private calculateSkillLevel(experience: number): SkillLevel {
    const requirements = this.getSkillLevelRequirements();
    
    if (experience >= requirements[SkillLevel.GRANDMASTER]) return SkillLevel.GRANDMASTER;
    if (experience >= requirements[SkillLevel.MASTER]) return SkillLevel.MASTER;
    if (experience >= requirements[SkillLevel.EXPERT]) return SkillLevel.EXPERT;
    if (experience >= requirements[SkillLevel.JOURNEYMAN]) return SkillLevel.JOURNEYMAN;
    if (experience >= requirements[SkillLevel.APPRENTICE]) return SkillLevel.APPRENTICE;
    return SkillLevel.NOVICE;
  }

  /**
   * 獲取玩家的所有技能
   */
  async getPlayerSkills(playerId: string): Promise<PlayerSkills> {
    // 模擬數據，實際應該從資料庫獲取
    const mockSkills: PlayerSkills = {
      playerId,
      skills: {
        [SkillType.COMBAT]: {
          skillType: SkillType.COMBAT,
          experience: 150,
          level: SkillLevel.APPRENTICE,
          knowledges: [
            {
              type: KnowledgeType.BASIC,
              name: '基礎劍術',
              learnedAt: new Date(Date.now() - 86400000 * 5),
              teacherNpcId: 'npc-guard-captain',
              proficiency: 450
            }
          ],
          practiceHistory: [],
          unlockedAt: new Date(Date.now() - 86400000 * 10),
          lastPracticed: new Date(Date.now() - 86400000 * 2)
        },
        [SkillType.WOODCUTTING]: {
          skillType: SkillType.WOODCUTTING,
          experience: 85,
          level: SkillLevel.NOVICE,
          knowledges: [
            {
              type: KnowledgeType.BASIC,
              name: '基礎伐木技術',
              learnedAt: new Date(Date.now() - 86400000 * 3),
              teacherNpcId: 'npc-001', // 老杰克
              proficiency: 320
            }
          ],
          practiceHistory: [
            {
              timestamp: new Date(Date.now() - 86400000 * 1),
              practiceType: '伐木練習',
              experienceGained: 15,
              proficiencyGained: 25
            }
          ],
          unlockedAt: new Date(Date.now() - 86400000 * 7),
          lastPracticed: new Date(Date.now() - 86400000 * 1)
        }
      },
      totalSkillPoints: 235,
      masteriesUnlocked: []
    };

    return mockSkills;
  }

  /**
   * 從 NPC 學習技能知識
   */
  async learnSkillFromNpc(
    playerId: string,
    npcId: string,
    skillType: SkillType,
    knowledgeType: KnowledgeType,
    knowledgeName: string
  ): Promise<{
    success: boolean;
    message: string;
    knowledgeLearned?: any;
    costPaid?: number;
  }> {
    const playerSkills = await this.getPlayerSkills(playerId);
    
    // 檢查玩家是否已解鎖該技能
    if (!playerSkills.skills[skillType]) {
      // 自動解鎖技能
      playerSkills.skills[skillType] = {
        skillType,
        experience: 0,
        level: SkillLevel.NOVICE,
        knowledges: [],
        practiceHistory: [],
        unlockedAt: new Date(),
        lastPracticed: new Date()
      };
    }

    const skill = playerSkills.skills[skillType];
    
    // 檢查是否已經學過該知識
    const existingKnowledge = skill.knowledges.find(k => k.name === knowledgeName);
    if (existingKnowledge) {
      return {
        success: false,
        message: `你已經學過「${knowledgeName}」了`
      };
    }

    // 檢查技能等級是否足夠學習該知識
    const levelRequirements = {
      [KnowledgeType.BASIC]: SkillLevel.NOVICE,
      [KnowledgeType.INTERMEDIATE]: SkillLevel.APPRENTICE,
      [KnowledgeType.ADVANCED]: SkillLevel.JOURNEYMAN,
      [KnowledgeType.MASTER]: SkillLevel.EXPERT
    };

    const requiredLevel = levelRequirements[knowledgeType];
    if (this.getSkillLevelOrder(skill.level) < this.getSkillLevelOrder(requiredLevel)) {
      return {
        success: false,
        message: `你的${this.getSkillTypeName(skillType)}等級不足，需要達到${this.getSkillLevelName(requiredLevel)}才能學習此知識`
      };
    }

    // 計算學習費用
    const learningCost = this.calculateLearningCost(knowledgeType);
    
    // 添加知識到玩家技能
    const newKnowledge = {
      type: knowledgeType,
      name: knowledgeName,
      learnedAt: new Date(),
      teacherNpcId: npcId,
      proficiency: 0
    };

    skill.knowledges.push(newKnowledge);

    console.log(`[SkillsService] 玩家 ${playerId} 從 NPC ${npcId} 學習了 ${knowledgeName}`);

    return {
      success: true,
      message: `成功學習了「${knowledgeName}」！`,
      knowledgeLearned: newKnowledge,
      costPaid: learningCost
    };
  }

  /**
   * 練習技能獲得經驗和熟練度
   */
  async practiceSkill(
    playerId: string,
    skillType: SkillType,
    practiceType: string,
    practiceIntensity: 'light' | 'normal' | 'intense' = 'normal',
    knowledgeUsed?: string
  ): Promise<{
    success: boolean;
    message: string;
    experienceGained: number;
    proficiencyGained: number;
    levelUp?: boolean;
  }> {
    const playerSkills = await this.getPlayerSkills(playerId);
    const skill = playerSkills.skills[skillType];
    
    if (!skill) {
      return {
        success: false,
        message: '你尚未解鎖此技能',
        experienceGained: 0,
        proficiencyGained: 0
      };
    }

    // 計算基礎經驗和熟練度獲得
    const intensityMultipliers = {
      light: 0.7,
      normal: 1.0,
      intense: 1.5
    };

    const baseExperience = this.getBaseExperienceForPractice(skillType, practiceType);
    const baseProficiency = this.getBaseProficiencyForPractice(skillType, practiceType);
    
    const multiplier = intensityMultipliers[practiceIntensity];
    let experienceGained = Math.round(baseExperience * multiplier);
    let proficiencyGained = Math.round(baseProficiency * multiplier);

    // 如果使用了特定知識，增加額外獎勵
    if (knowledgeUsed) {
      const knowledge = skill.knowledges.find(k => k.name === knowledgeUsed);
      if (knowledge) {
        const knowledgeBonus = Math.min(knowledge.proficiency / 1000, 0.5); // 最多50%獎勵
        experienceGained = Math.round(experienceGained * (1 + knowledgeBonus));
        proficiencyGained = Math.round(proficiencyGained * (1 + knowledgeBonus));
        
        // 提升該知識的熟練度
        knowledge.proficiency = Math.min(1000, knowledge.proficiency + Math.round(proficiencyGained * 0.5));
      }
    }

    // 更新技能經驗
    const oldLevel = skill.level;
    skill.experience += experienceGained;
    skill.level = this.calculateSkillLevel(skill.experience);
    skill.lastPracticed = new Date();

    // 記錄練習歷史
    skill.practiceHistory.push({
      timestamp: new Date(),
      practiceType,
      experienceGained,
      proficiencyGained
    });

    // 檢查是否升級
    const levelUp = oldLevel !== skill.level;
    
    console.log(`[SkillsService] 玩家 ${playerId} 練習 ${skillType}，獲得 ${experienceGained} 經驗，${proficiencyGained} 熟練度${levelUp ? `，升級到 ${skill.level}` : ''}`);

    return {
      success: true,
      message: `練習${this.getSkillTypeName(skillType)}成功！獲得 ${experienceGained} 經驗${levelUp ? `，恭喜升級到 ${this.getSkillLevelName(skill.level)}！` : ''}`,
      experienceGained,
      proficiencyGained,
      levelUp
    };
  }

  /**
   * 獲取 NPC 可教授的技能知識
   */
  async getNpcTeachableSkills(npcId: string): Promise<Array<{
    skillType: SkillType;
    knowledgeType: KnowledgeType;
    knowledgeName: string;
    description: string;
    cost: number;
    prerequisites: string[];
  }>> {
    // 根據不同 NPC 返回可教授的技能
    const teachableSkills: { [npcId: string]: any[] } = {
      'npc-001': [ // 老杰克 - 伐木工
        {
          skillType: SkillType.WOODCUTTING,
          knowledgeType: KnowledgeType.BASIC,
          knowledgeName: '基礎伐木技術',
          description: '學習如何安全有效地砍伐樹木',
          cost: 50,
          prerequisites: []
        },
        {
          skillType: SkillType.WOODCUTTING,
          knowledgeType: KnowledgeType.INTERMEDIATE,
          knowledgeName: '高效伐木法',
          description: '提高伐木效率的進階技巧',
          cost: 200,
          prerequisites: ['基礎伐木技術']
        }
      ],
      'npc-002': [ // 艾莉絲 - 商人
        {
          skillType: SkillType.TRADING,
          knowledgeType: KnowledgeType.BASIC,
          knowledgeName: '基礎貿易知識',
          description: '了解基本的商品買賣原理',
          cost: 100,
          prerequisites: []
        },
        {
          skillType: SkillType.NEGOTIATION,
          knowledgeType: KnowledgeType.BASIC,
          knowledgeName: '談判技巧',
          description: '學會在交易中爭取更好的價格',
          cost: 150,
          prerequisites: ['基礎貿易知識']
        }
      ],
      'npc-003': [ // 智者奧丁 - 學者
        {
          skillType: SkillType.MAGIC,
          knowledgeType: KnowledgeType.BASIC,
          knowledgeName: '魔法基礎理論',
          description: '理解魔法的基本原理和運作方式',
          cost: 300,
          prerequisites: []
        },
        {
          skillType: SkillType.SCHOLARSHIP,
          knowledgeType: KnowledgeType.BASIC,
          knowledgeName: '學術研究方法',
          description: '掌握系統化的知識研究方法',
          cost: 250,
          prerequisites: []
        },
        {
          skillType: SkillType.MAGICAL_STORAGE,
          knowledgeType: KnowledgeType.INTERMEDIATE,
          knowledgeName: '空間魔法 - 魔法收納術',
          description: '學習將物品儲存到魔法空間的秘術，只有法師才能學習',
          cost: 5000,
          prerequisites: ['魔法基礎理論']
        }
      ]
    };

    return teachableSkills[npcId] || [];
  }

  // 輔助方法
  private getSkillLevelOrder(level: SkillLevel): number {
    const orders = {
      [SkillLevel.NOVICE]: 0,
      [SkillLevel.APPRENTICE]: 1,
      [SkillLevel.JOURNEYMAN]: 2,
      [SkillLevel.EXPERT]: 3,
      [SkillLevel.MASTER]: 4,
      [SkillLevel.GRANDMASTER]: 5
    };
    return orders[level];
  }

  private getSkillTypeName(skillType: SkillType): string {
    const names = {
      [SkillType.COMBAT]: '戰鬥',
      [SkillType.MINING]: '挖礦',
      [SkillType.WOODCUTTING]: '伐木',
      [SkillType.FISHING]: '釣魚',
      [SkillType.HERBALISM]: '草藥學',
      [SkillType.CRAFTING]: '製作',
      [SkillType.BLACKSMITHING]: '鍛造',
      [SkillType.ALCHEMY]: '煉金術',
      [SkillType.COOKING]: '烹飪',
      [SkillType.SCHOLARSHIP]: '學術研究',
      [SkillType.MAGIC]: '魔法學',
      [SkillType.MAGICAL_STORAGE]: '魔法收納',
      [SkillType.TRADING]: '貿易',
      [SkillType.NEGOTIATION]: '談判'
    };
    return names[skillType] || skillType;
  }

  private getSkillLevelName(level: SkillLevel): string {
    const names = {
      [SkillLevel.NOVICE]: '新手',
      [SkillLevel.APPRENTICE]: '學徒',
      [SkillLevel.JOURNEYMAN]: '熟練工',
      [SkillLevel.EXPERT]: '專家',
      [SkillLevel.MASTER]: '大師',
      [SkillLevel.GRANDMASTER]: '宗師'
    };
    return names[level];
  }

  private calculateLearningCost(knowledgeType: KnowledgeType): number {
    const costs = {
      [KnowledgeType.BASIC]: 50,
      [KnowledgeType.INTERMEDIATE]: 200,
      [KnowledgeType.ADVANCED]: 500,
      [KnowledgeType.MASTER]: 1000
    };
    return costs[knowledgeType];
  }

  private getBaseExperienceForPractice(skillType: SkillType, practiceType: string): number {
    // 不同技能的基礎經驗獲得
    const baseExperiences = {
      [SkillType.COMBAT]: 0, // 戰鬥經驗只能通過打怪獲得
      [SkillType.WOODCUTTING]: 10,
      [SkillType.MINING]: 8,
      [SkillType.FISHING]: 6,
      [SkillType.CRAFTING]: 12,
      [SkillType.COOKING]: 8,
      [SkillType.ALCHEMY]: 15,
      [SkillType.SCHOLARSHIP]: 5,
      [SkillType.MAGIC]: 20
    };
    
    return baseExperiences[skillType] || 5;
  }

  private getBaseProficiencyForPractice(skillType: SkillType, practiceType: string): number {
    // 不同技能的基礎熟練度獲得
    const baseProficiencies = {
      [SkillType.COMBAT]: 0,
      [SkillType.WOODCUTTING]: 15,
      [SkillType.MINING]: 12,
      [SkillType.FISHING]: 10,
      [SkillType.CRAFTING]: 18,
      [SkillType.COOKING]: 12,
      [SkillType.ALCHEMY]: 25,
      [SkillType.SCHOLARSHIP]: 8,
      [SkillType.MAGIC]: 30
    };
    
    return baseProficiencies[skillType] || 10;
  }
}