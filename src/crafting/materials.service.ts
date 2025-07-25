import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface MaterialInfo {
  id: string;
  name: string;
  description: string;
  type: MaterialType;
  rarity: MaterialRarity;
  weight: number;
  baseValue: number;
  sources: MaterialSource[];
}

export interface MaterialSource {
  method: 'GATHERING' | 'HUNTING' | 'MINING' | 'CRAFTING' | 'PURCHASE';
  location: string;
  requirements?: string[];
  dropRate?: number; // 0-100% for hunting/mining
  notes?: string;
}

export interface GatheringResult {
  success: boolean;
  materialsGained: Array<{
    itemId: string;
    name: string;
    quantity: number;
    quality: string;
  }>;
  experienceGained: number;
  message: string;
}

export enum MaterialType {
  FABRIC = 'FABRIC',           // 布料類
  LEATHER = 'LEATHER',         // 皮革類
  METAL = 'METAL',             // 金屬類
  WOOD = 'WOOD',               // 木材類
  COMPONENT = 'COMPONENT',     // 零件類
  MAGICAL = 'MAGICAL'          // 魔法材料
}

export enum MaterialRarity {
  COMMON = 'COMMON',           // 常見
  UNCOMMON = 'UNCOMMON',       // 不常見
  RARE = 'RARE',               // 稀有
  EPIC = 'EPIC',               // 史詩
  LEGENDARY = 'LEGENDARY'      // 傳說
}

@Injectable()
export class MaterialsService {
  private readonly logger = new Logger(MaterialsService.name);

  // 材料配置數據
  private readonly materialConfigs: Record<string, MaterialInfo> = {
    // 布料類材料
    'cotton-fabric': {
      id: 'cotton-fabric',
      name: '棉布',
      description: '從棉花纖維編織而成的柔軟布料',
      type: MaterialType.FABRIC,
      rarity: MaterialRarity.COMMON,
      weight: 0.1,
      baseValue: 5,
      sources: [
        {
          method: 'GATHERING',
          location: '蔓延平原',
          requirements: ['採集技能'],
          dropRate: 80,
          notes: '採集棉花後需要紡織處理'
        },
        {
          method: 'PURCHASE',
          location: '流浪商人',
          requirements: ['10金幣'],
          notes: '商人價格會波動'
        }
      ]
    },
    'linen-fabric': {
      id: 'linen-fabric',
      name: '亞麻布',
      description: '由亞麻纖維製成的耐用布料',
      type: MaterialType.FABRIC,
      rarity: MaterialRarity.UNCOMMON,
      weight: 0.12,
      baseValue: 8,
      sources: [
        {
          method: 'GATHERING',
          location: '翠綠森林',
          requirements: ['採集技能 Lv.2'],
          dropRate: 60,
          notes: '需要在森林深處尋找亞麻植物'
        }
      ]
    },

    // 皮革類材料
    'raw-leather': {
      id: 'raw-leather',
      name: '生皮',
      description: '未經處理的動物皮毛',
      type: MaterialType.LEATHER,
      rarity: MaterialRarity.COMMON,
      weight: 0.5,
      baseValue: 3,
      sources: [
        {
          method: 'HUNTING',
          location: '蔓延平原',
          requirements: ['狩獵技能'],
          dropRate: 70,
          notes: '獵取野兔、鹿等小型動物'
        }
      ]
    },
    'processed-leather': {
      id: 'processed-leather',
      name: '處理皮革',
      description: '經過鞣製處理的耐用皮革',
      type: MaterialType.LEATHER,
      rarity: MaterialRarity.UNCOMMON,
      weight: 0.4,
      baseValue: 12,
      sources: [
        {
          method: 'CRAFTING',
          location: '服裝製作商',
          requirements: ['生皮 x2', '處理劑 x1'],
          notes: '需要服裝製作商協助處理'
        }
      ]
    },
    'thick-leather': {
      id: 'thick-leather',
      name: '厚皮革',
      description: '來自大型野獸的厚實皮革',
      type: MaterialType.LEATHER,
      rarity: MaterialRarity.RARE,
      weight: 0.8,
      baseValue: 25,
      sources: [
        {
          method: 'HUNTING',
          location: '翠綠森林深處',
          requirements: ['狩獵技能 Lv.3', '團隊作戰'],
          dropRate: 30,
          notes: '需要獵取熊、野豬等大型野獸'
        }
      ]
    },

    // 金屬類材料
    'iron-ore': {
      id: 'iron-ore',
      name: '鐵礦石',
      description: '含有鐵元素的礦石',
      type: MaterialType.METAL,
      rarity: MaterialRarity.COMMON,
      weight: 1.0,
      baseValue: 4,
      sources: [
        {
          method: 'MINING',
          location: '幽影礦坑',
          requirements: ['採礦技能', '礦鎬'],
          dropRate: 85,
          notes: '礦坑表層較容易開採'
        }
      ]
    },
    'metal-buckle': {
      id: 'metal-buckle',
      name: '金屬扣環',
      description: '用於背包和裝備的金屬扣件',
      type: MaterialType.COMPONENT,
      rarity: MaterialRarity.COMMON,
      weight: 0.05,
      baseValue: 8,
      sources: [
        {
          method: 'CRAFTING',
          location: '鐵匠鋪',
          requirements: ['鐵礦石 x1', '鍛造技能'],
          notes: '鐵匠可以批量製作'
        }
      ]
    },
    'steel-buckle': {
      id: 'steel-buckle',
      name: '鋼製扣環',
      description: '高品質的鋼製扣件，更加耐用',
      type: MaterialType.COMPONENT,
      rarity: MaterialRarity.UNCOMMON,
      weight: 0.06,
      baseValue: 15,
      sources: [
        {
          method: 'CRAFTING',
          location: '鐵匠鋪',
          requirements: ['鐵礦石 x2', '煤炭 x1', '鍛造技能 Lv.2'],
          notes: '需要高溫鍛造技術'
        }
      ]
    },
    'metal-frame': {
      id: 'metal-frame',
      name: '金屬框架',
      description: '用於大型背包的金屬支撐框架',
      type: MaterialType.COMPONENT,
      rarity: MaterialRarity.UNCOMMON,
      weight: 0.3,
      baseValue: 20,
      sources: [
        {
          method: 'CRAFTING',
          location: '鐵匠鋪',
          requirements: ['鐵礦石 x3', '鍛造技能 Lv.2'],
          notes: '需要精確的金屬加工技術'
        }
      ]
    },

    // 木材類材料
    'common-wood': {
      id: 'common-wood',
      name: '普通木材',
      description: '常見樹木的木材，適合基礎製作',
      type: MaterialType.WOOD,
      rarity: MaterialRarity.COMMON,
      weight: 0.8,
      baseValue: 2,
      sources: [
        {
          method: 'GATHERING',
          location: '翠綠森林邊緣',
          requirements: ['伐木技能', '斧頭'],
          dropRate: 90,
          notes: '森林邊緣的樹木較易砍伐'
        }
      ]
    },
    'quality-wood': {
      id: 'quality-wood',
      name: '優質木材',
      description: '精選的高品質木材',
      type: MaterialType.WOOD,
      rarity: MaterialRarity.UNCOMMON,
      weight: 0.9,
      baseValue: 6,
      sources: [
        {
          method: 'GATHERING',
          location: '翠綠森林深處',
          requirements: ['伐木技能 Lv.2', '鋼斧'],
          dropRate: 50,
          notes: '需要深入森林尋找特定樹種'
        }
      ]
    },
    'rope': {
      id: 'rope',
      name: '繩索',
      description: '用植物纖維編織的結實繩索',
      type: MaterialType.COMPONENT,
      rarity: MaterialRarity.COMMON,
      weight: 0.2,
      baseValue: 3,
      sources: [
        {
          method: 'CRAFTING',
          location: '伐木工作坊',
          requirements: ['植物纖維 x3'],
          notes: '伐木工可以編織各種繩索'
        }
      ]
    },
    'wood-frame': {
      id: 'wood-frame',
      name: '木製框架',
      description: '用於背包的木製支撐結構',
      type: MaterialType.COMPONENT,
      rarity: MaterialRarity.COMMON,
      weight: 0.4,
      baseValue: 10,
      sources: [
        {
          method: 'CRAFTING',
          location: '伐木工作坊',
          requirements: ['優質木材 x2', '木工技能'],
          notes: '需要精細的木工技術'
        }
      ]
    },

    // 特殊材料
    'glass-vial': {
      id: 'glass-vial',
      name: '玻璃小瓶',
      description: '用於存放藥劑的小玻璃瓶',
      type: MaterialType.COMPONENT,
      rarity: MaterialRarity.UNCOMMON,
      weight: 0.05,
      baseValue: 6,
      sources: [
        {
          method: 'PURCHASE',
          location: '流浪商人',
          requirements: ['15金幣'],
          notes: '商人從城鎮進貨的特殊物品'
        }
      ]
    },
    'magic-thread': {
      id: 'magic-thread',
      name: '魔法絲線',
      description: '注入魔力的特殊絲線',
      type: MaterialType.MAGICAL,
      rarity: MaterialRarity.RARE,
      weight: 0.01,
      baseValue: 50,
      sources: [
        {
          method: 'PURCHASE',
          location: '流浪商人',
          requirements: ['100金幣', '運氣'],
          dropRate: 20,
          notes: '稀有物品，商人偶爾會有庫存'
        },
        {
          method: 'GATHERING',
          location: '魔法異變區域',
          requirements: ['魔法感知', '高等級'],
          dropRate: 5,
          notes: '在環境異變時偶爾出現'
        }
      ]
    }
  };

  constructor(private prisma: PrismaService) {}

  /**
   * 獲取所有材料信息
   */
  getAllMaterials(): MaterialInfo[] {
    return Object.values(this.materialConfigs);
  }

  /**
   * 獲取特定材料信息
   */
  getMaterialInfo(materialId: string): MaterialInfo | null {
    return this.materialConfigs[materialId] || null;
  }

  /**
   * 根據類型獲取材料列表
   */
  getMaterialsByType(type: MaterialType): MaterialInfo[] {
    return Object.values(this.materialConfigs).filter(
      material => material.type === type
    );
  }

  /**
   * 採集材料
   */
  async gatherMaterial(
    characterId: string,
    location: string,
    gatheringType: 'GATHERING' | 'HUNTING' | 'MINING'
  ): Promise<GatheringResult> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return {
        success: false,
        materialsGained: [],
        experienceGained: 0,
        message: '角色不存在'
      };
    }

    // 獲取該地點可採集的材料
    const availableMaterials = this.getAvailableMaterialsAtLocation(location, gatheringType);
    
    if (availableMaterials.length === 0) {
      return {
        success: false,
        materialsGained: [],
        experienceGained: 0,
        message: `在${location}沒有可${this.getGatheringActionName(gatheringType)}的材料`
      };
    }

    const materialsGained: Array<{
      itemId: string;
      name: string;
      quantity: number;
      quality: string;
    }> = [];

    let totalExperience = 0;

    // 計算幸運值影響
    const luckMultiplier = character.luckPercentage / 100;

    for (const material of availableMaterials) {
      const source = material.sources.find(s => s.method === gatheringType && s.location === location);
      if (!source || !source.dropRate) continue;

      // 計算成功率
      const baseSuccessRate = source.dropRate;
      const finalSuccessRate = Math.min(95, baseSuccessRate * luckMultiplier);
      
      if (Math.random() * 100 < finalSuccessRate) {
        // 計算數量（基礎1個，幸運值可能增加）
        let quantity = 1;
        if (luckMultiplier > 1.2) {
          quantity += Math.floor(Math.random() * 2); // 最多額外獲得1個
        }

        // 計算品質
        const quality = this.calculateMaterialQuality(luckMultiplier, material.rarity);

        materialsGained.push({
          itemId: material.id,
          name: material.name,
          quantity,
          quality
        });

        // 添加到玩家背包
        await this.addMaterialToInventory(characterId, material.id, quantity, quality);

        // 計算經驗值
        const baseExp = this.getBaseExperience(material.rarity);
        totalExperience += baseExp * quantity;
      }
    }

    // 更新採集技能經驗（如果有相關技能系統）
    if (totalExperience > 0) {
      await this.updateGatheringSkill(characterId, gatheringType, totalExperience);
    }

    this.logger.log(`[MaterialsService] 角色 ${characterId} 在 ${location} ${this.getGatheringActionName(gatheringType)}，獲得 ${materialsGained.length} 種材料`);

    return {
      success: materialsGained.length > 0,
      materialsGained,
      experienceGained: totalExperience,
      message: materialsGained.length > 0 
        ? `成功獲得 ${materialsGained.length} 種材料！`
        : '這次沒有收穫，下次再試試吧'
    };
  }

  /**
   * 檢查角色背包中的材料
   */
  async getCharacterMaterials(characterId: string): Promise<Array<{
    itemId: string;
    name: string;
    quantity: number;
    quality: string;
    totalWeight: number;
  }>> {
    const inventory = await this.prisma.playerInventory.findMany({
      where: { characterId }
    });

    return inventory.map(item => {
      const materialInfo = this.getMaterialInfo(item.itemId);
      return {
        itemId: item.itemId,
        name: materialInfo?.name || item.itemId,
        quantity: item.quantity,
        quality: item.quality,
        totalWeight: item.totalWeight
      };
    });
  }

  /**
   * 消耗材料（用於製作）
   */
  async consumeMaterials(
    characterId: string,
    materials: Record<string, number>
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.prisma.$transaction(async (prisma) => {
        for (const [materialId, quantity] of Object.entries(materials)) {
          const inventoryItem = await prisma.playerInventory.findFirst({
            where: {
              characterId,
              itemId: materialId,
              quantity: { gte: quantity }
            }
          });

          if (!inventoryItem) {
            throw new Error(`材料不足：${this.getMaterialInfo(materialId)?.name || materialId}`);
          }

          if (inventoryItem.quantity === quantity) {
            await prisma.playerInventory.delete({
              where: { id: inventoryItem.id }
            });
          } else {
            const newQuantity = inventoryItem.quantity - quantity;
            await prisma.playerInventory.update({
              where: { id: inventoryItem.id },
              data: {
                quantity: newQuantity,
                totalWeight: newQuantity * inventoryItem.weight,
                totalVolume: newQuantity * inventoryItem.volume
              }
            });
          }
        }
      });

      return { success: true, message: '材料消耗成功' };

    } catch (error) {
      this.logger.error('[MaterialsService] 消耗材料失敗:', error);
      return { success: false, message: error instanceof Error ? error.message : '消耗材料失敗' };
    }
  }

  // ========== 私有方法 ==========

  private getAvailableMaterialsAtLocation(location: string, gatheringType: string): MaterialInfo[] {
    return Object.values(this.materialConfigs).filter(material =>
      material.sources.some(source => 
        source.method === gatheringType && source.location === location
      )
    );
  }

  private getGatheringActionName(type: string): string {
    const actions = {
      'GATHERING': '採集',
      'HUNTING': '狩獵',
      'MINING': '挖礦'
    };
    return actions[type] || '收集';
  }

  private calculateMaterialQuality(luckMultiplier: number, rarity: MaterialRarity): string {
    if (rarity === MaterialRarity.LEGENDARY) return 'LEGENDARY';
    if (rarity === MaterialRarity.EPIC) return 'EPIC';
    
    // 基於幸運值計算品質
    const roll = Math.random() * luckMultiplier;
    if (roll > 0.95) return 'RARE';
    if (roll > 0.8) return 'UNCOMMON';
    return 'COMMON';
  }

  private getBaseExperience(rarity: MaterialRarity): number {
    const expMap = {
      [MaterialRarity.COMMON]: 5,
      [MaterialRarity.UNCOMMON]: 10,
      [MaterialRarity.RARE]: 20,
      [MaterialRarity.EPIC]: 40,
      [MaterialRarity.LEGENDARY]: 80
    };
    return expMap[rarity] || 5;
  }

  private async addMaterialToInventory(
    characterId: string,
    materialId: string,
    quantity: number,
    quality: string
  ): Promise<void> {
    const materialInfo = this.getMaterialInfo(materialId);
    if (!materialInfo) return;

    const existingItem = await this.prisma.playerInventory.findFirst({
      where: {
        characterId,
        itemId: materialId,
        quality
      }
    });

    if (existingItem && existingItem.isStackable) {
      // 疊加到現有物品
      const newQuantity = existingItem.quantity + quantity;
      await this.prisma.playerInventory.update({
        where: { id: existingItem.id },
        data: {
          quantity: newQuantity,
          totalWeight: newQuantity * materialInfo.weight,
          totalVolume: newQuantity * 1 // 假設每個物品體積為1
        }
      });
    } else {
      // 創建新的物品記錄
      await this.prisma.playerInventory.create({
        data: {
          characterId,
          itemId: materialId,
          quantity,
          quality,
          weight: materialInfo.weight,
          totalWeight: quantity * materialInfo.weight,
          volume: 1,
          totalVolume: quantity * 1,
          condition: 100,
          isStackable: true,
          maxStack: 99
        }
      });
    }
  }

  private async updateGatheringSkill(
    characterId: string,
    gatheringType: string,
    experience: number
  ): Promise<void> {
    const skillTypeMap = {
      'GATHERING': 'HERBALISM',
      'HUNTING': 'COMBAT',
      'MINING': 'MINING'
    };

    const skillType = skillTypeMap[gatheringType];
    if (!skillType) return;

    // 更新相關技能經驗（這裡簡化處理）
    try {
      const skill = await this.prisma.characterKnowledge.findFirst({
        where: {
          character: { id: characterId },
          skillType,
          knowledgeName: skillType
        }
      });

      if (skill) {
        await this.prisma.characterKnowledge.update({
          where: { id: skill.id },
          data: {
            proficiency: skill.proficiency + experience
          }
        });
      }
    } catch (error) {
      // 技能不存在時忽略錯誤
    }
  }
}