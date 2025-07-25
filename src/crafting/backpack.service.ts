import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BackpackInfo {
  id: string;
  type: BackpackType;
  name: string;
  description: string;
  capacity: number;
  weight: number;
  durability: number;
  maxDurability: number;
  specialFeatures: string[];
  price: number;
  craftingCost: number;
  requiredMaterials: BackpackMaterial[];
}

export interface BackpackMaterial {
  itemId: string;
  name: string;
  quantity: number;
  source: string; // where to obtain this material
}

export interface CraftingRecipe {
  id: string;
  backpackType: BackpackType;
  requiredSkillLevel: number;
  materials: BackpackMaterial[];
  craftingTime: number; // in minutes
  successRate: number; // 0-100%
  experienceGained: number;
}

export interface TailoringProgress {
  characterId: string;
  skillLevel: number;
  experience: number;
  experienceToNext: number;
  unlockedRecipes: string[];
  completedProjects: number;
  reputation: number;
}

export enum BackpackType {
  SMALL_CLOTH = 'SMALL_CLOTH',
  MEDIUM_LEATHER = 'MEDIUM_LEATHER',
  LARGE_COMPOSITE = 'LARGE_COMPOSITE',
  MAGE_SPECIALIZED = 'MAGE_SPECIALIZED',
  WARRIOR_SPECIALIZED = 'WARRIOR_SPECIALIZED',
  ARCHER_SPECIALIZED = 'ARCHER_SPECIALIZED',
  ROGUE_SPECIALIZED = 'ROGUE_SPECIALIZED'
}

export enum TailoringSkillLevel {
  NOVICE = 0,      // 新手
  APPRENTICE = 1,  // 學徒
  SKILLED = 2,     // 熟練
  EXPERT = 3,      // 專家
  MASTER = 4       // 大師
}

@Injectable()
export class BackpackService {
  private readonly logger = new Logger(BackpackService.name);

  // 背包配置數據
  private readonly backpackConfigs: Record<BackpackType, BackpackInfo> = {
    [BackpackType.SMALL_CLOTH]: {
      id: 'backpack-small-cloth',
      type: BackpackType.SMALL_CLOTH,
      name: '小型布背包',
      description: '用棉布製作的基礎背包，輕便但容量有限',
      capacity: 25,
      weight: 0.5,
      durability: 100,
      maxDurability: 100,
      specialFeatures: ['輕量化'],
      price: 100,
      craftingCost: 60,
      requiredMaterials: [
        { itemId: 'cotton-fabric', name: '棉布', quantity: 5, source: '平原採集棉花' },
        { itemId: 'rope', name: '繩索', quantity: 2, source: '伐木工製作' }
      ]
    },
    [BackpackType.MEDIUM_LEATHER]: {
      id: 'backpack-medium-leather',
      type: BackpackType.MEDIUM_LEATHER,
      name: '中型皮革背包',
      description: '用處理過的皮革製作，耐用且容量適中',
      capacity: 40,
      weight: 1.2,
      durability: 200,
      maxDurability: 200,
      specialFeatures: ['耐用', '防水'],
      price: 500,
      craftingCost: 300,
      requiredMaterials: [
        { itemId: 'processed-leather', name: '處理皮革', quantity: 3, source: '獸皮+處理劑' },
        { itemId: 'metal-buckle', name: '金屬扣環', quantity: 5, source: '鐵匠製作' }
      ]
    },
    [BackpackType.LARGE_COMPOSITE]: {
      id: 'backpack-large-composite',
      type: BackpackType.LARGE_COMPOSITE,
      name: '大型複合背包',
      description: '結合多種材料的高級背包，容量大且功能豐富',
      capacity: 60,
      weight: 2.0,
      durability: 300,
      maxDurability: 300,
      specialFeatures: ['大容量', '分類整理', '快速存取'],
      price: 2000,
      craftingCost: 1200,
      requiredMaterials: [
        { itemId: 'processed-leather', name: '處理皮革', quantity: 2, source: '獸皮+處理劑' },
        { itemId: 'cotton-fabric', name: '棉布', quantity: 3, source: '平原採集棉花' },
        { itemId: 'metal-frame', name: '金屬框架', quantity: 1, source: '鐵匠製作' },
        { itemId: 'wood-frame', name: '木製框架', quantity: 1, source: '伐木工製作' }
      ]
    },
    [BackpackType.MAGE_SPECIALIZED]: {
      id: 'backpack-mage-specialized',
      type: BackpackType.MAGE_SPECIALIZED,
      name: '法師專精背包',
      description: '為法師設計的專業背包，具有多個分隔用於組織藥劑和材料',
      capacity: 45,
      weight: 1.5,
      durability: 250,
      maxDurability: 250,
      specialFeatures: ['多分隔設計', '藥劑保護', '魔力親和'],
      price: 1500,
      craftingCost: 900,
      requiredMaterials: [
        { itemId: 'cotton-fabric', name: '棉布', quantity: 4, source: '平原採集棉花' },
        { itemId: 'processed-leather', name: '處理皮革', quantity: 2, source: '獸皮+處理劑' },
        { itemId: 'glass-vial', name: '玻璃小瓶', quantity: 6, source: '商人購買' },
        { itemId: 'magic-thread', name: '魔法絲線', quantity: 1, source: '稀有材料' }
      ]
    },
    [BackpackType.WARRIOR_SPECIALIZED]: {
      id: 'backpack-warrior-specialized',
      type: BackpackType.WARRIOR_SPECIALIZED,
      name: '戰士專精背包',
      description: '為戰士設計的堅固背包，承重能力強且耐用',
      capacity: 35,
      weight: 2.5,
      durability: 400,
      maxDurability: 400,
      specialFeatures: ['超耐用', '高承重', '武器掛架'],
      price: 1200,
      craftingCost: 700,
      requiredMaterials: [
        { itemId: 'thick-leather', name: '厚皮革', quantity: 4, source: '大型野獸皮革' },
        { itemId: 'metal-reinforcement', name: '金屬加固', quantity: 3, source: '鐵匠製作' },
        { itemId: 'steel-buckle', name: '鋼製扣環', quantity: 6, source: '鐵匠製作' }
      ]
    },
    [BackpackType.ARCHER_SPECIALIZED]: {
      id: 'backpack-archer-specialized',
      type: BackpackType.ARCHER_SPECIALIZED,
      name: '弓箭手專精背包',
      description: '整合箭袋設計的專業背包，方便攜帶箭矢和遠程裝備',
      capacity: 38,
      weight: 1.8,
      durability: 280,
      maxDurability: 280,
      specialFeatures: ['箭袋整合', '輕量化', '快速取箭'],
      price: 1300,
      craftingCost: 800,
      requiredMaterials: [
        { itemId: 'processed-leather', name: '處理皮革', quantity: 3, source: '獸皮+處理劑' },
        { itemId: 'linen-fabric', name: '亞麻布', quantity: 2, source: '森林採集亞麻' },
        { itemId: 'wood-separator', name: '木製分隔', quantity: 4, source: '伐木工製作' },
        { itemId: 'leather-strap', name: '皮革束帶', quantity: 2, source: '皮革加工' }
      ]
    },
    [BackpackType.ROGUE_SPECIALIZED]: {
      id: 'backpack-rogue-specialized',
      type: BackpackType.ROGUE_SPECIALIZED,
      name: '盜賊專精背包',
      description: '具有隱蔽口袋的特殊背包，適合存放偷竊物品和工具',
      capacity: 42,
      weight: 1.3,
      durability: 220,
      maxDurability: 220,
      specialFeatures: ['隱蔽口袋', '靜音設計', '防盜鎖'],
      price: 1400,
      craftingCost: 850,
      requiredMaterials: [
        { itemId: 'soft-leather', name: '軟皮革', quantity: 3, source: '特殊處理皮革' },
        { itemId: 'cotton-fabric', name: '棉布', quantity: 2, source: '平原採集棉花' },
        { itemId: 'silent-buckle', name: '靜音扣環', quantity: 4, source: '特殊金屬工藝' },
        { itemId: 'lock-mechanism', name: '鎖具機構', quantity: 1, source: '鐵匠特製' }
      ]
    }
  };

  // 製作配方
  private readonly craftingRecipes: Record<BackpackType, CraftingRecipe> = {
    [BackpackType.SMALL_CLOTH]: {
      id: 'recipe-small-cloth',
      backpackType: BackpackType.SMALL_CLOTH,
      requiredSkillLevel: TailoringSkillLevel.NOVICE,
      materials: this.backpackConfigs[BackpackType.SMALL_CLOTH].requiredMaterials,
      craftingTime: 30,
      successRate: 95,
      experienceGained: 50
    },
    [BackpackType.MEDIUM_LEATHER]: {
      id: 'recipe-medium-leather',
      backpackType: BackpackType.MEDIUM_LEATHER,
      requiredSkillLevel: TailoringSkillLevel.APPRENTICE,
      materials: this.backpackConfigs[BackpackType.MEDIUM_LEATHER].requiredMaterials,
      craftingTime: 60,
      successRate: 85,
      experienceGained: 120
    },
    [BackpackType.LARGE_COMPOSITE]: {
      id: 'recipe-large-composite',
      backpackType: BackpackType.LARGE_COMPOSITE,
      requiredSkillLevel: TailoringSkillLevel.SKILLED,
      materials: this.backpackConfigs[BackpackType.LARGE_COMPOSITE].requiredMaterials,
      craftingTime: 120,
      successRate: 75,
      experienceGained: 250
    },
    [BackpackType.MAGE_SPECIALIZED]: {
      id: 'recipe-mage-specialized',
      backpackType: BackpackType.MAGE_SPECIALIZED,
      requiredSkillLevel: TailoringSkillLevel.SKILLED,
      materials: this.backpackConfigs[BackpackType.MAGE_SPECIALIZED].requiredMaterials,
      craftingTime: 90,
      successRate: 80,
      experienceGained: 200
    },
    [BackpackType.WARRIOR_SPECIALIZED]: {
      id: 'recipe-warrior-specialized',
      backpackType: BackpackType.WARRIOR_SPECIALIZED,
      requiredSkillLevel: TailoringSkillLevel.SKILLED,
      materials: this.backpackConfigs[BackpackType.WARRIOR_SPECIALIZED].requiredMaterials,
      craftingTime: 100,
      successRate: 78,
      experienceGained: 220
    },
    [BackpackType.ARCHER_SPECIALIZED]: {
      id: 'recipe-archer-specialized',
      backpackType: BackpackType.ARCHER_SPECIALIZED,
      requiredSkillLevel: TailoringSkillLevel.SKILLED,
      materials: this.backpackConfigs[BackpackType.ARCHER_SPECIALIZED].requiredMaterials,
      craftingTime: 85,
      successRate: 82,
      experienceGained: 210
    },
    [BackpackType.ROGUE_SPECIALIZED]: {
      id: 'recipe-rogue-specialized',
      backpackType: BackpackType.ROGUE_SPECIALIZED,
      requiredSkillLevel: TailoringSkillLevel.EXPERT,
      materials: this.backpackConfigs[BackpackType.ROGUE_SPECIALIZED].requiredMaterials,
      craftingTime: 110,
      successRate: 70,
      experienceGained: 280
    }
  };

  constructor(private prisma: PrismaService) {}

  /**
   * 獲取所有可用的背包類型
   */
  getAvailableBackpacks(): BackpackInfo[] {
    return Object.values(this.backpackConfigs);
  }

  /**
   * 獲取特定背包的詳細信息
   */
  getBackpackInfo(backpackType: BackpackType): BackpackInfo | null {
    return this.backpackConfigs[backpackType] || null;
  }

  /**
   * 從商人購買背包
   */
  async purchaseBackpackFromMerchant(
    characterId: string,
    backpackType: BackpackType
  ): Promise<{
    success: boolean;
    message: string;
    backpackId?: string;
  }> {
    const backpackInfo = this.getBackpackInfo(backpackType);
    if (!backpackInfo) {
      return { success: false, message: '背包類型不存在' };
    }

    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return { success: false, message: '角色不存在' };
    }

    if (character.goldAmount < backpackInfo.price) {
      return { 
        success: false, 
        message: `金幣不足，需要 ${backpackInfo.price} 金幣，目前有 ${character.goldAmount} 金幣` 
      };
    }

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // 扣除金幣
        await prisma.gameCharacter.update({
          where: { id: characterId },
          data: { goldAmount: character.goldAmount - backpackInfo.price }
        });

        // 添加背包到背包庫存
        const newBackpack = await prisma.playerInventory.create({
          data: {
            characterId,
            itemId: backpackInfo.id,
            quantity: 1,
            quality: 'COMMON',
            weight: backpackInfo.weight,
            totalWeight: backpackInfo.weight,
            volume: 1,
            totalVolume: 1,
            condition: 100,
            isStackable: false,
            maxStack: 1
          }
        });

        return newBackpack;
      });

      this.logger.log(`[BackpackService] 角色 ${characterId} 購買背包 ${backpackInfo.name}，花費 ${backpackInfo.price} 金幣`);

      return {
        success: true,
        message: `成功購買 ${backpackInfo.name}`,
        backpackId: result.id
      };

    } catch (error) {
      this.logger.error('[BackpackService] 購買背包失敗:', error);
      return { success: false, message: '購買失敗，請稍後再試' };
    }
  }

  /**
   * 獲取角色的裁縫技能進度
   */
  async getTailoringProgress(characterId: string): Promise<TailoringProgress> {
    // 從技能系統獲取裁縫技能數據
    const tailoringSkill = await this.prisma.characterKnowledge.findFirst({
      where: {
        character: { id: characterId },
        skillType: 'TAILORING',
        knowledgeName: 'Tailoring'
      }
    });

    if (!tailoringSkill) {
      return {
        characterId,
        skillLevel: TailoringSkillLevel.NOVICE,
        experience: 0,
        experienceToNext: 100,
        unlockedRecipes: ['recipe-small-cloth'],
        completedProjects: 0,
        reputation: 0
      };
    }

    const skillLevel = this.calculateSkillLevel(tailoringSkill.proficiency);
    const unlockedRecipes = this.getUnlockedRecipes(skillLevel);

    return {
      characterId,
      skillLevel,
      experience: tailoringSkill.proficiency,
      experienceToNext: this.getExperienceToNextLevel(skillLevel),
      unlockedRecipes,
      completedProjects: Math.floor(tailoringSkill.proficiency / 10) || 0,
      reputation: this.calculateReputation(tailoringSkill.proficiency, Math.floor(tailoringSkill.proficiency / 10) || 0)
    };
  }

  /**
   * 學習裁縫技能
   */
  async learnTailoringSkill(
    characterId: string,
    teacherNpcId: string = 'tailor-npc'
  ): Promise<{
    success: boolean;
    message: string;
    skillLevel?: number;
  }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return { success: false, message: '角色不存在' };
    }

    // 檢查是否已經學習過裁縫技能
    const existingSkill = await this.prisma.characterKnowledge.findFirst({
      where: {
        character: { id: characterId },
        skillType: 'TAILORING',
        knowledgeName: 'Tailoring'
      }
    });

    if (existingSkill) {
      return { success: false, message: '已經學習過裁縫技能' };
    }

    try {
      // 創建裁縫技能記錄
      await this.prisma.characterKnowledge.create({
        data: {
          character: { connect: { id: characterId } },
          skillType: 'TAILORING',
          knowledgeType: 'BASIC',
          knowledgeName: 'Tailoring',
          proficiency: 0,
          teacherNpcId: teacherNpcId,
          description: '從服裝製作商學習的基礎裁縫技能'
        }
      });

      this.logger.log(`[BackpackService] 角色 ${characterId} 學習裁縫技能`);

      return {
        success: true,
        message: '成功學習裁縫技能！現在可以製作小型布背包',
        skillLevel: TailoringSkillLevel.NOVICE
      };

    } catch (error) {
      this.logger.error('[BackpackService] 學習裁縫技能失敗:', error);
      return { success: false, message: '學習失敗，請稍後再試' };
    }
  }

  /**
   * 製作背包
   */
  async craftBackpack(
    characterId: string,
    backpackType: BackpackType,
    materials: Record<string, number>
  ): Promise<{
    success: boolean;
    message: string;
    backpackId?: string;
    experienceGained?: number;
  }> {
    const recipe = this.craftingRecipes[backpackType];
    if (!recipe) {
      return { success: false, message: '製作配方不存在' };
    }

    // 檢查裁縫技能等級
    const progress = await this.getTailoringProgress(characterId);
    if (progress.skillLevel < recipe.requiredSkillLevel) {
      return { 
        success: false, 
        message: `裁縫技能等級不足，需要 ${recipe.requiredSkillLevel} 級，目前 ${progress.skillLevel} 級` 
      };
    }

    // 檢查材料是否足夠
    for (const material of recipe.materials) {
      const providedQuantity = materials[material.itemId] || 0;
      if (providedQuantity < material.quantity) {
        return {
          success: false,
          message: `材料不足：需要 ${material.quantity} 個 ${material.name}，提供了 ${providedQuantity} 個`
        };
      }
    }

    // 計算成功率（基於技能等級和運氣）
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return { success: false, message: '角色不存在' };
    }

    const luckMultiplier = character.luckPercentage / 100;
    const finalSuccessRate = Math.min(95, recipe.successRate * luckMultiplier);
    const craftingSuccess = Math.random() * 100 < finalSuccessRate;

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // 消耗材料（從背包中移除）
        for (const material of recipe.materials) {
          await this.consumeMaterial(characterId, material.itemId, material.quantity, prisma);
        }

        // 增加裁縫經驗
        await this.addTailoringExperience(characterId, recipe.experienceGained, prisma);

        if (craftingSuccess) {
          // 製作成功，創建背包
          const backpackInfo = this.getBackpackInfo(backpackType)!;
          const newBackpack = await prisma.playerInventory.create({
            data: {
              characterId,
              itemId: backpackInfo.id,
              quantity: 1,
              quality: 'COMMON',
              weight: backpackInfo.weight,
              totalWeight: backpackInfo.weight,
              volume: 1,
              totalVolume: 1,
              condition: 100,
              isStackable: false,
              maxStack: 1
            }
          });

          return { success: true, backpackId: newBackpack.id };
        } else {
          // 製作失敗，但仍給予少量經驗
          await this.addTailoringExperience(characterId, Math.floor(recipe.experienceGained * 0.3), prisma);
          return { success: false };
        }
      });

      if (result.success) {
        this.logger.log(`[BackpackService] 角色 ${characterId} 成功製作 ${backpackType} 背包`);
        return {
          success: true,
          message: `成功製作 ${this.getBackpackInfo(backpackType)!.name}！`,
          backpackId: result.backpackId,
          experienceGained: recipe.experienceGained
        };
      } else {
        return {
          success: false,
          message: '製作失敗，但獲得了一些經驗',
          experienceGained: Math.floor(recipe.experienceGained * 0.3)
        };
      }

    } catch (error) {
      this.logger.error('[BackpackService] 製作背包失敗:', error);
      return { success: false, message: '製作失敗，請稍後再試' };
    }
  }

  /**
   * 獲取製作配方列表
   */
  getCraftingRecipes(skillLevel: TailoringSkillLevel): CraftingRecipe[] {
    return Object.values(this.craftingRecipes).filter(
      recipe => recipe.requiredSkillLevel <= skillLevel
    );
  }

  // ========== 私有方法 ==========

  private calculateSkillLevel(proficiency: number): TailoringSkillLevel {
    if (proficiency >= 1000) return TailoringSkillLevel.MASTER;
    if (proficiency >= 500) return TailoringSkillLevel.EXPERT;
    if (proficiency >= 200) return TailoringSkillLevel.SKILLED;
    if (proficiency >= 50) return TailoringSkillLevel.APPRENTICE;
    return TailoringSkillLevel.NOVICE;
  }

  private getExperienceToNextLevel(currentLevel: TailoringSkillLevel): number {
    const thresholds = [50, 200, 500, 1000, 9999];
    return thresholds[currentLevel] || 0;
  }

  private getUnlockedRecipes(skillLevel: TailoringSkillLevel): string[] {
    const recipes = [];
    if (skillLevel >= TailoringSkillLevel.NOVICE) recipes.push('recipe-small-cloth');
    if (skillLevel >= TailoringSkillLevel.APPRENTICE) recipes.push('recipe-medium-leather');
    if (skillLevel >= TailoringSkillLevel.SKILLED) {
      recipes.push('recipe-large-composite', 'recipe-mage-specialized', 
                  'recipe-warrior-specialized', 'recipe-archer-specialized');
    }
    if (skillLevel >= TailoringSkillLevel.EXPERT) recipes.push('recipe-rogue-specialized');
    return recipes;
  }

  private calculateReputation(proficiency: number, completedProjects: number): number {
    return Math.min(100, Math.floor(proficiency / 10) + completedProjects * 2);
  }

  private async consumeMaterial(
    characterId: string, 
    itemId: string, 
    quantity: number, 
    prisma: any
  ): Promise<void> {
    const inventoryItem = await prisma.playerInventory.findFirst({
      where: {
        characterId,
        itemId,
        quantity: { gte: quantity }
      }
    });

    if (!inventoryItem) {
      throw new Error(`材料不足：${itemId}`);
    }

    if (inventoryItem.quantity === quantity) {
      await prisma.playerInventory.delete({
        where: { id: inventoryItem.id }
      });
    } else {
      await prisma.playerInventory.update({
        where: { id: inventoryItem.id },
        data: { 
          quantity: inventoryItem.quantity - quantity,
          totalWeight: (inventoryItem.quantity - quantity) * inventoryItem.weight,
          totalVolume: (inventoryItem.quantity - quantity) * inventoryItem.volume
        }
      });
    }
  }

  private async addTailoringExperience(
    characterId: string, 
    experience: number, 
    prisma: any
  ): Promise<void> {
    const skill = await prisma.characterKnowledge.findFirst({
      where: {
        character: { id: characterId },
        skillType: 'TAILORING',
        knowledgeName: 'Tailoring'
      }
    });

    if (skill) {
      await prisma.characterKnowledge.update({
        where: { id: skill.id },
        data: {
          proficiency: skill.proficiency + experience,
          practiceCount: skill.practiceCount + 1
        }
      });
    }
  }
}