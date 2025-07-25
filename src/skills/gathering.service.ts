import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService, SkillType } from './skills.service';

// 採集資源類型
export enum ResourceType {
  // 伐木資源
  OAK_WOOD = 'OAK_WOOD',
  BIRCH_WOOD = 'BIRCH_WOOD',
  PINE_WOOD = 'PINE_WOOD',
  RARE_MAHOGANY = 'RARE_MAHOGANY',
  
  // 挖礦資源
  IRON_ORE = 'IRON_ORE',
  COPPER_ORE = 'COPPER_ORE',
  GOLD_ORE = 'GOLD_ORE',
  DIAMOND = 'DIAMOND',
  
  // 草藥資源
  HEALING_HERB = 'HEALING_HERB',
  MANA_FLOWER = 'MANA_FLOWER',
  POISON_IVY = 'POISON_IVY',
  ANCIENT_ROOT = 'ANCIENT_ROOT',
  
  // 釣魚資源
  COMMON_FISH = 'COMMON_FISH',
  SILVER_FISH = 'SILVER_FISH',
  GOLDEN_FISH = 'GOLDEN_FISH',
  LEGENDARY_FISH = 'LEGENDARY_FISH'
}

// 採集點資料
export interface GatheringNode {
  id: string;
  name: string;
  resourceType: ResourceType;
  skillType: SkillType;
  requiredLevel: string;
  requiredKnowledge?: string;
  baseYield: number;
  rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
  respawnTime: number; // 秒
  location: {
    mapId: string;
    x: number;
    y: number;
  };
  lastHarvested?: Date;
  harvestedBy?: string;
}

// 採集結果
interface GatheringResult {
  success: boolean;
  resourcesGathered: Array<{
    resourceType: ResourceType;
    quantity: number;
    quality: 'poor' | 'normal' | 'good' | 'excellent' | 'perfect';
  }>;
  experienceGained: number;
  proficiencyGained: number;
  message: string;
  bonusEffects?: string[];
}

@Injectable()
export class GatheringService {
  constructor(
    private prisma: PrismaService,
    private skillsService: SkillsService
  ) {}

  /**
   * 獲取所有採集點
   */
  async getAllGatheringNodes(): Promise<GatheringNode[]> {
    // 模擬採集點數據
    return [
      // 伐木點
      {
        id: 'tree-001',
        name: '古老橡樹',
        resourceType: ResourceType.OAK_WOOD,
        skillType: SkillType.WOODCUTTING,
        requiredLevel: 'NOVICE',
        baseYield: 3,
        rarity: 'common',
        respawnTime: 300, // 5分鐘
        location: { mapId: 'forest_area', x: 120, y: 80 }
      },
      {
        id: 'tree-002',
        name: '稀有紅木',
        resourceType: ResourceType.RARE_MAHOGANY,
        skillType: SkillType.WOODCUTTING,
        requiredLevel: 'EXPERT',
        requiredKnowledge: '珍稀木材識別',
        baseYield: 1,
        rarity: 'rare',
        respawnTime: 1800, // 30分鐘
        location: { mapId: 'deep_forest', x: 200, y: 150 }
      },
      // 挖礦點
      {
        id: 'mine-001',
        name: '鐵礦脈',
        resourceType: ResourceType.IRON_ORE,
        skillType: SkillType.MINING,
        requiredLevel: 'NOVICE',
        baseYield: 2,
        rarity: 'common',
        respawnTime: 600, // 10分鐘
        location: { mapId: 'mountain_cave', x: 50, y: 30 }
      },
      {
        id: 'mine-002',
        name: '黃金礦脈',
        resourceType: ResourceType.GOLD_ORE,
        skillType: SkillType.MINING,
        requiredLevel: 'JOURNEYMAN',
        baseYield: 1,
        rarity: 'uncommon',
        respawnTime: 1200, // 20分鐘
        location: { mapId: 'deep_mine', x: 80, y: 60 }
      },
      // 草藥點
      {
        id: 'herb-001',
        name: '治療草叢',
        resourceType: ResourceType.HEALING_HERB,
        skillType: SkillType.HERBALISM,
        requiredLevel: 'NOVICE',
        baseYield: 2,
        rarity: 'common',
        respawnTime: 180, // 3分鐘
        location: { mapId: 'meadow', x: 100, y: 100 }
      },
      // 釣魚點
      {
        id: 'fishing-001',
        name: '寧靜湖泊',
        resourceType: ResourceType.COMMON_FISH,
        skillType: SkillType.FISHING,
        requiredLevel: 'NOVICE',
        baseYield: 1,
        rarity: 'common',
        respawnTime: 60, // 1分鐘
        location: { mapId: 'lakeside', x: 150, y: 120 }
      }
    ];
  }

  /**
   * 執行採集動作
   */
  async performGathering(
    playerId: string,
    nodeId: string,
    toolQuality: 'basic' | 'good' | 'excellent' = 'basic'
  ): Promise<GatheringResult> {
    // 獲取採集點信息
    const nodes = await this.getAllGatheringNodes();
    const node = nodes.find(n => n.id === nodeId);
    
    if (!node) {
      return {
        success: false,
        resourcesGathered: [],
        experienceGained: 0,
        proficiencyGained: 0,
        message: '採集點不存在'
      };
    }

    // 檢查採集點是否可用（冷卻時間）
    if (node.lastHarvested && node.harvestedBy !== playerId) {
      const timeSince = (Date.now() - node.lastHarvested.getTime()) / 1000;
      if (timeSince < node.respawnTime) {
        const remainingTime = Math.ceil(node.respawnTime - timeSince);
        return {
          success: false,
          resourcesGathered: [],
          experienceGained: 0,
          proficiencyGained: 0,
          message: `採集點還需要 ${remainingTime} 秒才能重新採集`
        };
      }
    }

    // 獲取玩家技能信息
    const playerSkills = await this.skillsService.getPlayerSkills(playerId);
    const skill = playerSkills.skills[node.skillType];

    if (!skill) {
      return {
        success: false,
        resourcesGathered: [],
        experienceGained: 0,
        proficiencyGained: 0,
        message: `你還沒有解鎖 ${this.getSkillTypeName(node.skillType)} 技能`
      };
    }

    // 檢查技能等級要求
    if (!this.meetsLevelRequirement(skill.level, node.requiredLevel)) {
      return {
        success: false,
        resourcesGathered: [],
        experienceGained: 0,
        proficiencyGained: 0,
        message: `需要 ${node.requiredLevel} 等級的 ${this.getSkillTypeName(node.skillType)} 技能`
      };
    }

    // 檢查知識要求
    if (node.requiredKnowledge) {
      const hasKnowledge = skill.knowledges.some(k => k.name === node.requiredKnowledge);
      if (!hasKnowledge) {
        return {
          success: false,
          resourcesGathered: [],
          experienceGained: 0,
          proficiencyGained: 0,
          message: `需要掌握「${node.requiredKnowledge}」知識才能採集此資源`
        };
      }
    }

    // 計算採集結果
    const gatheringResult = this.calculateGatheringResult(node, skill, toolQuality);

    // 更新採集點狀態
    node.lastHarvested = new Date();
    node.harvestedBy = playerId;

    // 更新玩家技能經驗
    await this.skillsService.practiceSkill(
      playerId,
      node.skillType,
      `採集${this.getResourceName(node.resourceType)}`,
      'normal',
      node.requiredKnowledge
    );

    console.log(`[GatheringService] 玩家 ${playerId} 在 ${node.name} 採集了 ${gatheringResult.resourcesGathered.length} 個資源`);

    return gatheringResult;
  }

  /**
   * 計算採集結果
   */
  private calculateGatheringResult(
    node: GatheringNode,
    skill: any,
    toolQuality: string
  ): GatheringResult {
    // 基礎產量
    let baseYield = node.baseYield;

    // 工具品質加成
    const toolMultipliers = {
      basic: 1.0,
      good: 1.3,
      excellent: 1.6
    };
    const toolMultiplier = toolMultipliers[toolQuality as keyof typeof toolMultipliers];

    // 技能等級加成
    const levelMultipliers = {
      NOVICE: 1.0,
      APPRENTICE: 1.1,
      JOURNEYMAN: 1.25,
      EXPERT: 1.4,
      MASTER: 1.6,
      GRANDMASTER: 2.0
    };
    const levelMultiplier = levelMultipliers[skill.level as keyof typeof levelMultipliers];

    // 知識熟練度加成
    let knowledgeBonus = 1.0;
    if (node.requiredKnowledge) {
      const knowledge = skill.knowledges.find((k: any) => k.name === node.requiredKnowledge);
      if (knowledge) {
        knowledgeBonus = 1 + (knowledge.proficiency / 1000 * 0.5); // 最多50%加成
      }
    }

    // 計算最終數量
    const finalYield = Math.max(1, Math.round(baseYield * toolMultiplier * levelMultiplier * knowledgeBonus));

    // 品質計算
    const qualityChance = Math.random();
    let quality: 'poor' | 'normal' | 'good' | 'excellent' | 'perfect';

    if (qualityChance < 0.05) quality = 'perfect';
    else if (qualityChance < 0.15) quality = 'excellent';
    else if (qualityChance < 0.35) quality = 'good';
    else if (qualityChance < 0.80) quality = 'normal';
    else quality = 'poor';

    // 經驗值計算
    const baseExp = this.getBaseExperienceForResource(node.resourceType);
    const rarityMultiplier = this.getRarityMultiplier(node.rarity);
    const experienceGained = Math.round(baseExp * rarityMultiplier * toolMultiplier);

    // 熟練度計算
    const baseProficiency = 10;
    const proficiencyGained = Math.round(baseProficiency * rarityMultiplier);

    // 特殊效果
    const bonusEffects: string[] = [];
    if (quality === 'perfect') bonusEffects.push('完美品質加成！');
    if (finalYield > node.baseYield) bonusEffects.push('額外產量！');

    return {
      success: true,
      resourcesGathered: [{
        resourceType: node.resourceType,
        quantity: finalYield,
        quality
      }],
      experienceGained,
      proficiencyGained,
      message: `成功採集到 ${finalYield} 個${this.getResourceName(node.resourceType)}（${this.getQualityName(quality)}）`,
      bonusEffects: bonusEffects.length > 0 ? bonusEffects : undefined
    };
  }

  /**
   * 獲取地區內的採集點
   */
  async getGatheringNodesByLocation(
    mapId: string,
    x: number,
    y: number,
    radius: number = 100
  ): Promise<GatheringNode[]> {
    const allNodes = await this.getAllGatheringNodes();
    
    return allNodes.filter(node => {
      if (node.location.mapId !== mapId) return false;
      
      const distance = Math.sqrt(
        Math.pow(node.location.x - x, 2) + Math.pow(node.location.y - y, 2)
      );
      
      return distance <= radius;
    });
  }

  /**
   * 檢查技能等級是否符合要求
   */
  private meetsLevelRequirement(playerLevel: string, requiredLevel: string): boolean {
    const levelOrder = {
      NOVICE: 0,
      APPRENTICE: 1,
      JOURNEYMAN: 2,
      EXPERT: 3,
      MASTER: 4,
      GRANDMASTER: 5
    };

    return levelOrder[playerLevel as keyof typeof levelOrder] >= 
           levelOrder[requiredLevel as keyof typeof levelOrder];
  }

  // 輔助方法
  private getSkillTypeName(skillType: SkillType): string {
    const names = {
      [SkillType.WOODCUTTING]: '伐木',
      [SkillType.MINING]: '挖礦',
      [SkillType.FISHING]: '釣魚',
      [SkillType.HERBALISM]: '草藥學'
    };
    return names[skillType] || skillType;
  }

  private getResourceName(resourceType: ResourceType): string {
    const names = {
      [ResourceType.OAK_WOOD]: '橡樹木',
      [ResourceType.BIRCH_WOOD]: '樺樹木',
      [ResourceType.PINE_WOOD]: '松樹木',
      [ResourceType.RARE_MAHOGANY]: '稀有紅木',
      [ResourceType.IRON_ORE]: '鐵礦石',
      [ResourceType.COPPER_ORE]: '銅礦石',
      [ResourceType.GOLD_ORE]: '黃金礦石',
      [ResourceType.DIAMOND]: '鑽石',
      [ResourceType.HEALING_HERB]: '治療草藥',
      [ResourceType.MANA_FLOWER]: '魔法花朵',
      [ResourceType.POISON_IVY]: '毒藤',
      [ResourceType.ANCIENT_ROOT]: '遠古根莖',
      [ResourceType.COMMON_FISH]: '普通魚類',
      [ResourceType.SILVER_FISH]: '銀鱗魚',
      [ResourceType.GOLDEN_FISH]: '金鱗魚',
      [ResourceType.LEGENDARY_FISH]: '傳說魚王'
    };
    return names[resourceType] || resourceType;
  }

  private getQualityName(quality: string): string {
    const names = {
      poor: '劣質',
      normal: '普通',
      good: '優良',
      excellent: '精良',
      perfect: '完美'
    };
    return names[quality as keyof typeof names] || quality;
  }

  private getBaseExperienceForResource(resourceType: ResourceType): number {
    const rarityExp = {
      [ResourceType.OAK_WOOD]: 8,
      [ResourceType.BIRCH_WOOD]: 10,
      [ResourceType.PINE_WOOD]: 12,
      [ResourceType.RARE_MAHOGANY]: 50,
      [ResourceType.IRON_ORE]: 15,
      [ResourceType.COPPER_ORE]: 10,
      [ResourceType.GOLD_ORE]: 25,
      [ResourceType.DIAMOND]: 100,
      [ResourceType.HEALING_HERB]: 5,
      [ResourceType.MANA_FLOWER]: 8,
      [ResourceType.POISON_IVY]: 12,
      [ResourceType.ANCIENT_ROOT]: 30,
      [ResourceType.COMMON_FISH]: 6,
      [ResourceType.SILVER_FISH]: 15,
      [ResourceType.GOLDEN_FISH]: 30,
      [ResourceType.LEGENDARY_FISH]: 150
    };
    return rarityExp[resourceType] || 10;
  }

  private getRarityMultiplier(rarity: string): number {
    const multipliers = {
      common: 1.0,
      uncommon: 1.5,
      rare: 2.0,
      epic: 3.0,
      legendary: 5.0
    };
    return multipliers[rarity as keyof typeof multipliers] || 1.0;
  }
}