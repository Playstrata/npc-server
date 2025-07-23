import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { 
  BaseItem, 
  InventoryItem, 
  CraftingRecipe, 
  ItemQuality, 
  ItemType,
  calculateCraftingSuccessRate,
  calculateItemValue 
} from './items.types';
import { 
  getAllItems, 
  getItemsByType, 
  getCraftableItems, 
  CRAFTING_RECIPES 
} from './items.database';

@Injectable()
export class ItemsService {
  constructor(private prisma: PrismaService) {}

  /**
   * 獲取所有物品
   */
  getAllItems(): Record<string, BaseItem> {
    return getAllItems();
  }

  /**
   * 根據 ID 獲取物品
   */
  getItemById(itemId: string): BaseItem | null {
    const allItems = getAllItems();
    return allItems[itemId] || null;
  }

  /**
   * 根據類型獲取物品列表
   */
  getItemsByType(type: ItemType): BaseItem[] {
    return getItemsByType(type);
  }

  /**
   * 獲取所有礦石
   */
  getAllOres(): BaseItem[] {
    return this.getItemsByType(ItemType.ORE);
  }

  /**
   * 獲取所有武器
   */
  getAllWeapons(): BaseItem[] {
    return this.getItemsByType(ItemType.WEAPON);
  }

  /**
   * 獲取製作配方
   */
  getCraftingRecipe(recipeId: string): CraftingRecipe | null {
    return CRAFTING_RECIPES[recipeId] || null;
  }

  /**
   * 根據技能獲取可製作的配方
   */
  getCraftableRecipes(skillType: string, skillLevel: number): CraftingRecipe[] {
    return getCraftableItems(skillType, skillLevel);
  }

  /**
   * 計算製作成功率
   */
  calculateCraftingSuccessRate(
    recipeId: string,
    playerSkillLevel: number,
    materialQualities: ItemQuality[],
    toolBonus: number = 0
  ): number {
    const recipe = this.getCraftingRecipe(recipeId);
    if (!recipe) return 0;

    return calculateCraftingSuccessRate(
      recipe.successRate,
      playerSkillLevel,
      recipe.requirements.level,
      materialQualities,
      toolBonus
    );
  }

  /**
   * 執行製作
   */
  async performCrafting(
    playerId: string,
    recipeId: string,
    materials: Array<{ itemId: string; quantity: number; quality: ItemQuality }>,
    toolBonus: number = 0
  ): Promise<{
    success: boolean;
    message: string;
    resultItem?: InventoryItem;
    experienceGained: number;
    materialsConsumed: Array<{ itemId: string; quantity: number }>;
  }> {
    const recipe = this.getCraftingRecipe(recipeId);
    if (!recipe) {
      return {
        success: false,
        message: '配方不存在',
        experienceGained: 0,
        materialsConsumed: []
      };
    }

    // 檢查材料是否足夠
    const materialCheck = this.validateCraftingMaterials(recipe, materials);
    if (!materialCheck.valid) {
      return {
        success: false,
        message: materialCheck.message,
        experienceGained: 0,
        materialsConsumed: []
      };
    }

    // 獲取玩家技能等級（這裡需要整合技能系統）
    const playerSkillLevel = await this.getPlayerSkillLevel(playerId, recipe.requirements.skill);
    
    if (playerSkillLevel < recipe.requirements.level) {
      return {
        success: false,
        message: `需要 ${recipe.requirements.skill} 技能等級 ${recipe.requirements.level}`,
        experienceGained: 0,
        materialsConsumed: []
      };
    }

    // 計算成功率
    const materialQualities = materials.map(m => m.quality);
    const successRate = this.calculateCraftingSuccessRate(
      recipeId,
      playerSkillLevel,
      materialQualities,
      toolBonus
    );

    // 判斷製作是否成功
    const isSuccess = Math.random() * 100 < successRate;
    
    // 消耗材料
    const materialsConsumed = recipe.materials.map(m => ({
      itemId: m.itemId,
      quantity: m.quantity
    }));

    let resultItem: InventoryItem | undefined;
    let experienceGained = Math.round(recipe.experienceGain * 0.5); // 失敗也給一半經驗

    if (isSuccess) {
      // 製作成功，創建結果物品
      const baseItem = this.getItemById(recipe.resultItem.itemId);
      if (baseItem) {
        // 根據技能等級和材料品質決定結果品質
        const resultQuality = this.calculateResultQuality(
          recipe.resultItem.quality,
          playerSkillLevel,
          recipe.requirements.level,
          materialQualities
        );

        resultItem = {
          ...baseItem,
          quality: resultQuality,
          quantity: recipe.resultItem.quantity,
          condition: 100,
          acquiredAt: new Date()
        };

        experienceGained = recipe.experienceGain;
      }
    }

    return {
      success: isSuccess,
      message: isSuccess ? 
        `成功製作 ${recipe.name}！` : 
        `製作 ${recipe.name} 失敗了，但你從中學到了一些東西。`,
      resultItem,
      experienceGained,
      materialsConsumed
    };
  }

  /**
   * 驗證製作材料
   */
  private validateCraftingMaterials(
    recipe: CraftingRecipe,
    availableMaterials: Array<{ itemId: string; quantity: number; quality: ItemQuality }>
  ): { valid: boolean; message: string } {
    for (const requiredMaterial of recipe.materials) {
      const available = availableMaterials.find(m => m.itemId === requiredMaterial.itemId);
      
      if (!available) {
        const item = this.getItemById(requiredMaterial.itemId);
        return {
          valid: false,
          message: `缺少材料: ${item?.name || requiredMaterial.itemId}`
        };
      }

      if (available.quantity < requiredMaterial.quantity) {
        const item = this.getItemById(requiredMaterial.itemId);
        return {
          valid: false,
          message: `${item?.name || requiredMaterial.itemId} 數量不足 (需要 ${requiredMaterial.quantity}，有 ${available.quantity})`
        };
      }

      // 檢查品質要求
      if (requiredMaterial.quality && available.quality !== requiredMaterial.quality) {
        const item = this.getItemById(requiredMaterial.itemId);
        return {
          valid: false,
          message: `${item?.name || requiredMaterial.itemId} 品質不符要求`
        };
      }
    }

    return { valid: true, message: '' };
  }

  /**
   * 計算製作結果品質
   */
  private calculateResultQuality(
    baseQuality: ItemQuality,
    playerSkillLevel: number,
    requiredSkillLevel: number,
    materialQualities: ItemQuality[]
  ): ItemQuality {
    // 技能等級加成
    const skillBonus = playerSkillLevel - requiredSkillLevel;
    
    // 材料品質平均值
    const avgMaterialQuality = materialQualities.reduce((sum, quality) => {
      const qualityValues = {
        [ItemQuality.POOR]: 0,
        [ItemQuality.COMMON]: 1,
        [ItemQuality.UNCOMMON]: 2,
        [ItemQuality.RARE]: 3,
        [ItemQuality.EPIC]: 4,
        [ItemQuality.LEGENDARY]: 5,
        [ItemQuality.ARTIFACT]: 6
      };
      return sum + qualityValues[quality];
    }, 0) / materialQualities.length;

    // 計算最終品質等級
    const baseQualityValue = {
      [ItemQuality.POOR]: 0,
      [ItemQuality.COMMON]: 1,
      [ItemQuality.UNCOMMON]: 2,
      [ItemQuality.RARE]: 3,
      [ItemQuality.EPIC]: 4,
      [ItemQuality.LEGENDARY]: 5,
      [ItemQuality.ARTIFACT]: 6
    }[baseQuality];

    let finalQualityValue = baseQualityValue;

    // 技能加成（每10級技能優勢有機會提升品質）
    if (skillBonus >= 10 && Math.random() < 0.3) {
      finalQualityValue = Math.min(6, finalQualityValue + 1);
    }

    // 高品質材料加成
    if (avgMaterialQuality > baseQualityValue && Math.random() < 0.2) {
      finalQualityValue = Math.min(6, finalQualityValue + 1);
    }

    const qualityArray = [
      ItemQuality.POOR,
      ItemQuality.COMMON,
      ItemQuality.UNCOMMON,
      ItemQuality.RARE,
      ItemQuality.EPIC,
      ItemQuality.LEGENDARY,
      ItemQuality.ARTIFACT
    ];

    return qualityArray[finalQualityValue];
  }

  /**
   * 獲取玩家技能等級（需要整合技能系統）
   */
  private async getPlayerSkillLevel(playerId: string, skillType: string): Promise<number> {
    // 這裡應該調用技能系統來獲取玩家的實際技能等級
    // 暫時返回模擬數據
    return 25;
  }

  /**
   * 計算物品價值
   */
  calculateItemValue(itemId: string, quality: ItemQuality, condition: number = 100): number {
    const item = this.getItemById(itemId);
    if (!item) return 0;

    const itemWithQuality = { ...item, quality };
    return calculateItemValue(itemWithQuality, condition);
  }

  /**
   * 獲取市場需求資訊
   */
  getMarketDemand(itemId: string): {
    currentDemand: number;
    priceMultiplier: number;
    trend: 'rising' | 'stable' | 'falling';
  } {
    const item = this.getItemById(itemId);
    if (!item || !item.marketInfo) {
      return {
        currentDemand: 0,
        priceMultiplier: 1.0,
        trend: 'stable'
      };
    }

    // 模擬市場需求（實際應該基於遊戲數據）
    const baseDemand = item.marketInfo.demandMultiplier;
    const randomVariation = 0.8 + Math.random() * 0.4; // 0.8 到 1.2 的變動
    
    return {
      currentDemand: baseDemand * randomVariation,
      priceMultiplier: randomVariation,
      trend: randomVariation > 1.1 ? 'rising' : randomVariation < 0.9 ? 'falling' : 'stable'
    };
  }

  /**
   * 獲取推薦的製作配方（基於玩家技能和市場需求）
   */
  async getRecommendedRecipes(playerId: string, skillType: string): Promise<Array<{
    recipe: CraftingRecipe;
    profitPotential: number;
    difficultyRating: number;
    marketDemand: string;
  }>> {
    const playerSkillLevel = await this.getPlayerSkillLevel(playerId, skillType);
    const craftableRecipes = this.getCraftableRecipes(skillType, playerSkillLevel);

    return craftableRecipes.map(recipe => {
      const resultItem = this.getItemById(recipe.resultItem.itemId);
      const marketDemand = this.getMarketDemand(recipe.resultItem.itemId);
      
      // 計算材料成本
      const materialCost = recipe.materials.reduce((total, material) => {
        const item = this.getItemById(material.itemId);
        const cost = item?.marketInfo?.basePrice || 0;
        return total + (cost * material.quantity);
      }, 0);

      // 計算潛在利潤
      const resultValue = resultItem?.marketInfo?.basePrice || 0;
      const profitPotential = (resultValue * marketDemand.priceMultiplier) - materialCost;

      return {
        recipe,
        profitPotential,
        difficultyRating: recipe.difficulty,
        marketDemand: marketDemand.trend
      };
    }).sort((a, b) => b.profitPotential - a.profitPotential);
  }
}