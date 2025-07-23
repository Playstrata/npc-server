import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { SkillsService, SkillType } from './skills.service';
import { ResourceType } from './gathering.service';

// 製造配方類型
export enum RecipeType {
  // 鍛造配方
  IRON_SWORD = 'IRON_SWORD',
  STEEL_ARMOR = 'STEEL_ARMOR',
  GOLDEN_RING = 'GOLDEN_RING',
  
  // 製作配方
  WOODEN_SHIELD = 'WOODEN_SHIELD',
  LEATHER_BOOTS = 'LEATHER_BOOTS',
  ROPE = 'ROPE',
  
  // 煉金配方
  HEALTH_POTION = 'HEALTH_POTION',
  MANA_POTION = 'MANA_POTION',
  STRENGTH_ELIXIR = 'STRENGTH_ELIXIR',
  
  // 烹飪配方
  GRILLED_FISH = 'GRILLED_FISH',
  HERB_SOUP = 'HERB_SOUP',
  ENERGY_STEW = 'ENERGY_STEW'
}

// 製造配方
interface CraftingRecipe {
  id: string;
  name: string;
  recipeType: RecipeType;
  skillType: SkillType;
  requiredLevel: string;
  requiredKnowledge?: string;
  ingredients: Array<{
    resourceType: ResourceType | string;
    quantity: number;
    quality?: string; // 可選的品質要求
  }>;
  tools?: Array<{
    toolType: string;
    durabilityConsumed: number;
  }>;
  craftingTime: number; // 製作時間（秒）
  baseSuccessRate: number; // 基礎成功率（0-1）
  outputs: Array<{
    itemType: string;
    quantity: number;
    quality: string;
  }>;
  experienceReward: number;
}

// 製造結果
interface CraftingResult {
  success: boolean;
  itemsCreated: Array<{
    itemType: string;
    quantity: number;
    quality: string;
    durability?: number;
  }>;
  experienceGained: number;
  proficiencyGained: number;
  materialsConsumed: Array<{
    resourceType: string;
    quantity: number;
  }>;
  message: string;
  criticalSuccess?: boolean;
  bonusEffects?: string[];
}

@Injectable()
export class CraftingService {
  constructor(
    private prisma: PrismaService,
    private skillsService: SkillsService
  ) {}

  /**
   * 獲取所有製造配方
   */
  async getAllRecipes(): Promise<CraftingRecipe[]> {
    return [
      // 鍛造配方
      {
        id: 'recipe-iron-sword',
        name: '鐵劍',
        recipeType: RecipeType.IRON_SWORD,
        skillType: SkillType.BLACKSMITHING,
        requiredLevel: 'APPRENTICE',
        requiredKnowledge: '基礎鍛造技術',
        ingredients: [
          { resourceType: ResourceType.IRON_ORE, quantity: 3 },
          { resourceType: 'COAL', quantity: 2 }
        ],
        tools: [
          { toolType: 'FORGE', durabilityConsumed: 10 },
          { toolType: 'HAMMER', durabilityConsumed: 5 }
        ],
        craftingTime: 300, // 5分鐘
        baseSuccessRate: 0.8,
        outputs: [
          { itemType: 'IRON_SWORD', quantity: 1, quality: 'normal' }
        ],
        experienceReward: 50
      },
      {
        id: 'recipe-steel-armor',
        name: '鋼鐵盔甲',
        recipeType: RecipeType.STEEL_ARMOR,
        skillType: SkillType.BLACKSMITHING,
        requiredLevel: 'EXPERT',
        requiredKnowledge: '進階鍛造技術',
        ingredients: [
          { resourceType: ResourceType.IRON_ORE, quantity: 8 },
          { resourceType: ResourceType.GOLD_ORE, quantity: 2 },
          { resourceType: 'COAL', quantity: 5 }
        ],
        tools: [
          { toolType: 'FORGE', durabilityConsumed: 25 },
          { toolType: 'HAMMER', durabilityConsumed: 15 }
        ],
        craftingTime: 1200, // 20分鐘
        baseSuccessRate: 0.6,
        outputs: [
          { itemType: 'STEEL_ARMOR', quantity: 1, quality: 'good' }
        ],
        experienceReward: 200
      },

      // 製作配方
      {
        id: 'recipe-wooden-shield',
        name: '木盾',
        recipeType: RecipeType.WOODEN_SHIELD,
        skillType: SkillType.CRAFTING,
        requiredLevel: 'NOVICE',
        ingredients: [
          { resourceType: ResourceType.OAK_WOOD, quantity: 4 },
          { resourceType: 'LEATHER', quantity: 2 }
        ],
        tools: [
          { toolType: 'SAW', durabilityConsumed: 8 },
          { toolType: 'CHISEL', durabilityConsumed: 5 }
        ],
        craftingTime: 180, // 3分鐘
        baseSuccessRate: 0.9,
        outputs: [
          { itemType: 'WOODEN_SHIELD', quantity: 1, quality: 'normal' }
        ],
        experienceReward: 25
      },

      // 煉金配方
      {
        id: 'recipe-health-potion',
        name: '治療藥水',
        recipeType: RecipeType.HEALTH_POTION,
        skillType: SkillType.ALCHEMY,
        requiredLevel: 'NOVICE',
        requiredKnowledge: '基礎煉金術',
        ingredients: [
          { resourceType: ResourceType.HEALING_HERB, quantity: 3 },
          { resourceType: 'WATER', quantity: 1 },
          { resourceType: 'GLASS_BOTTLE', quantity: 1 }
        ],
        tools: [
          { toolType: 'ALCHEMY_KIT', durabilityConsumed: 5 }
        ],
        craftingTime: 120, // 2分鐘
        baseSuccessRate: 0.85,
        outputs: [
          { itemType: 'HEALTH_POTION', quantity: 1, quality: 'normal' }
        ],
        experienceReward: 30
      },
      {
        id: 'recipe-mana-potion',
        name: '魔力藥水',
        recipeType: RecipeType.MANA_POTION,
        skillType: SkillType.ALCHEMY,
        requiredLevel: 'APPRENTICE',
        requiredKnowledge: '中級煉金術',
        ingredients: [
          { resourceType: ResourceType.MANA_FLOWER, quantity: 2 },
          { resourceType: ResourceType.ANCIENT_ROOT, quantity: 1 },
          { resourceType: 'DISTILLED_WATER', quantity: 1 },
          { resourceType: 'GLASS_BOTTLE', quantity: 1 }
        ],
        tools: [
          { toolType: 'ALCHEMY_KIT', durabilityConsumed: 8 }
        ],
        craftingTime: 240, // 4分鐘
        baseSuccessRate: 0.75,
        outputs: [
          { itemType: 'MANA_POTION', quantity: 1, quality: 'good' }
        ],
        experienceReward: 60
      },

      // 烹飪配方
      {
        id: 'recipe-grilled-fish',
        name: '烤魚',
        recipeType: RecipeType.GRILLED_FISH,
        skillType: SkillType.COOKING,
        requiredLevel: 'NOVICE',
        ingredients: [
          { resourceType: ResourceType.COMMON_FISH, quantity: 1 },
          { resourceType: 'SALT', quantity: 1 }
        ],
        tools: [
          { toolType: 'COOKING_FIRE', durabilityConsumed: 0 }
        ],
        craftingTime: 60, // 1分鐘
        baseSuccessRate: 0.95,
        outputs: [
          { itemType: 'GRILLED_FISH', quantity: 1, quality: 'normal' }
        ],
        experienceReward: 15
      }
    ];
  }

  /**
   * 根據技能獲取可製造的配方
   */
  async getRecipesBySkill(skillType: SkillType): Promise<CraftingRecipe[]> {
    const allRecipes = await this.getAllRecipes();
    return allRecipes.filter(recipe => recipe.skillType === skillType);
  }

  /**
   * 執行製造
   */
  async performCrafting(
    playerId: string,
    recipeId: string,
    quantity: number = 1,
    useHighQualityMaterials: boolean = false
  ): Promise<CraftingResult> {
    const recipes = await this.getAllRecipes();
    const recipe = recipes.find(r => r.id === recipeId);

    if (!recipe) {
      return {
        success: false,
        itemsCreated: [],
        experienceGained: 0,
        proficiencyGained: 0,
        materialsConsumed: [],
        message: '配方不存在'
      };
    }

    // 檢查玩家技能
    const playerSkills = await this.skillsService.getPlayerSkills(playerId);
    const skill = playerSkills.skills[recipe.skillType];

    if (!skill) {
      return {
        success: false,
        itemsCreated: [],
        experienceGained: 0,
        proficiencyGained: 0,
        materialsConsumed: [],
        message: `你還沒有解鎖 ${this.getSkillTypeName(recipe.skillType)} 技能`
      };
    }

    // 檢查技能等級要求
    if (!this.meetsLevelRequirement(skill.level, recipe.requiredLevel)) {
      return {
        success: false,
        itemsCreated: [],
        experienceGained: 0,
        proficiencyGained: 0,
        materialsConsumed: [],
        message: `需要 ${recipe.requiredLevel} 等級的 ${this.getSkillTypeName(recipe.skillType)} 技能`
      };
    }

    // 檢查知識要求
    if (recipe.requiredKnowledge) {
      const hasKnowledge = skill.knowledges.some(k => k.name === recipe.requiredKnowledge);
      if (!hasKnowledge) {
        return {
          success: false,
          itemsCreated: [],
          experienceGained: 0,
          proficiencyGained: 0,
          materialsConsumed: [],
          message: `需要掌握「${recipe.requiredKnowledge}」知識才能製造此物品`
        };
      }
    }

    // 檢查材料是否足夠（這裡簡化為總是足夠）
    // 實際實現中應該檢查玩家背包

    // 計算成功率
    const successRate = this.calculateSuccessRate(recipe, skill, useHighQualityMaterials);
    const isSuccess = Math.random() < successRate;

    if (!isSuccess) {
      return {
        success: false,
        itemsCreated: [],
        experienceGained: Math.round(recipe.experienceReward * 0.3), // 失敗也給少量經驗
        proficiencyGained: 5,
        materialsConsumed: recipe.ingredients.map(ing => ({
          resourceType: ing.resourceType as string,
          quantity: Math.ceil(ing.quantity * quantity * 0.5) // 失敗消耗一半材料
        })),
        message: `製造失敗！損失了部分材料，但獲得了一些經驗。`
      };
    }

    // 成功製造
    const craftingResult = this.calculateCraftingResult(recipe, skill, quantity, useHighQualityMaterials);

    // 更新技能經驗
    await this.skillsService.practiceSkill(
      playerId,
      recipe.skillType,
      `製造${recipe.name}`,
      'normal',
      recipe.requiredKnowledge
    );

    console.log(`[CraftingService] 玩家 ${playerId} 成功製造了 ${quantity} 個 ${recipe.name}`);

    return craftingResult;
  }

  /**
   * 計算製造成功率
   */
  private calculateSuccessRate(
    recipe: CraftingRecipe,
    skill: any,
    useHighQualityMaterials: boolean
  ): number {
    let successRate = recipe.baseSuccessRate;

    // 技能等級加成
    const levelBonuses = {
      NOVICE: 0,
      APPRENTICE: 0.05,
      JOURNEYMAN: 0.1,
      EXPERT: 0.15,
      MASTER: 0.2,
      GRANDMASTER: 0.25
    };
    successRate += levelBonuses[skill.level as keyof typeof levelBonuses] || 0;

    // 知識熟練度加成
    if (recipe.requiredKnowledge) {
      const knowledge = skill.knowledges.find((k: any) => k.name === recipe.requiredKnowledge);
      if (knowledge) {
        successRate += (knowledge.proficiency / 1000) * 0.15; // 最多15%加成
      }
    }

    // 高品質材料加成
    if (useHighQualityMaterials) {
      successRate += 0.1;
    }

    return Math.min(0.99, successRate); // 最高99%成功率
  }

  /**
   * 計算製造結果
   */
  private calculateCraftingResult(
    recipe: CraftingRecipe,
    skill: any,
    quantity: number,
    useHighQualityMaterials: boolean
  ): CraftingResult {
    const itemsCreated: any[] = [];
    const materialsConsumed: any[] = [];
    const bonusEffects: string[] = [];

    // 檢查是否大成功
    const criticalChance = 0.05 + (skill.level === 'GRANDMASTER' ? 0.1 : 0);
    const isCritical = Math.random() < criticalChance;

    for (let i = 0; i < quantity; i++) {
      // 計算物品品質
      let quality = recipe.outputs[0].quality;
      
      if (isCritical) {
        quality = this.upgradeQuality(quality);
        bonusEffects.push('大成功！提升了物品品質');
      }

      if (useHighQualityMaterials) {
        quality = this.upgradeQuality(quality);
      }

      // 計算數量加成（有機率額外製造）
      let itemQuantity = recipe.outputs[0].quantity;
      if (isCritical && Math.random() < 0.3) {
        itemQuantity += 1;
        bonusEffects.push('額外產量！');
      }

      itemsCreated.push({
        itemType: recipe.outputs[0].itemType,
        quantity: itemQuantity,
        quality,
        durability: this.calculateInitialDurability(recipe.outputs[0].itemType, quality)
      });
    }

    // 計算材料消耗
    recipe.ingredients.forEach(ingredient => {
      materialsConsumed.push({
        resourceType: ingredient.resourceType as string,
        quantity: ingredient.quantity * quantity
      });
    });

    // 計算經驗值
    let experienceGained = recipe.experienceReward * quantity;
    if (isCritical) {
      experienceGained = Math.round(experienceGained * 1.5);
    }

    // 計算熟練度
    const baseProficiency = 20;
    let proficiencyGained = baseProficiency * quantity;
    if (useHighQualityMaterials) {
      proficiencyGained = Math.round(proficiencyGained * 1.3);
    }

    return {
      success: true,
      itemsCreated,
      experienceGained,
      proficiencyGained,
      materialsConsumed,
      message: `成功製造了 ${quantity} 個 ${recipe.name}${isCritical ? '（大成功！）' : ''}`,
      criticalSuccess: isCritical,
      bonusEffects: bonusEffects.length > 0 ? bonusEffects : undefined
    };
  }

  // 輔助方法
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

  private upgradeQuality(quality: string): string {
    const qualityOrder = ['poor', 'normal', 'good', 'excellent', 'perfect'];
    const currentIndex = qualityOrder.indexOf(quality);
    return qualityOrder[Math.min(qualityOrder.length - 1, currentIndex + 1)];
  }

  private calculateInitialDurability(itemType: string, quality: string): number {
    const baseDurability = {
      'IRON_SWORD': 100,
      'STEEL_ARMOR': 150,
      'WOODEN_SHIELD': 80,
      'HEALTH_POTION': 1, // 藥水類不需要耐久度
      'MANA_POTION': 1,
      'GRILLED_FISH': 1
    };

    const qualityMultipliers = {
      'poor': 0.7,
      'normal': 1.0,
      'good': 1.3,
      'excellent': 1.6,
      'perfect': 2.0
    };

    const base = baseDurability[itemType as keyof typeof baseDurability] || 50;
    const multiplier = qualityMultipliers[quality as keyof typeof qualityMultipliers] || 1.0;
    
    return Math.round(base * multiplier);
  }

  private getSkillTypeName(skillType: SkillType): string {
    const names = {
      [SkillType.BLACKSMITHING]: '鍛造',
      [SkillType.CRAFTING]: '製作',
      [SkillType.ALCHEMY]: '煉金術',
      [SkillType.COOKING]: '烹飪'
    };
    return names[skillType] || skillType;
  }
}