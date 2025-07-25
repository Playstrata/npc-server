import { 
  BaseItem, 
  ItemType, 
  ItemQuality, 
  OreType, 
  WeaponType, 
  ArmorType,
  CraftingRecipe 
} from './items.types';

// 基礎礦石數據
export const ORES: Record<string, BaseItem> = {
  'ore-copper': {
    id: 'ore-copper',
    name: '銅礦石',
    description: '最常見的礦石，用於製作基礎的銅製裝備',
    type: ItemType.ORE,
    subType: OreType.COPPER,
    quality: ItemQuality.COMMON,
    stackable: true,
    maxStack: 100,
    attributes: {
      weight: 0.8,
      volume: 0.05
    },
    marketInfo: {
      basePrice: 5,
      demandMultiplier: 1.0,
      rarityMultiplier: 1.0,
      vendorPrice: 3
    }
  },
  'ore-tin': {
    id: 'ore-tin',
    name: '錫礦石',
    description: '與銅礦混合可製作青銅，比純銅更加堅硬',
    type: ItemType.ORE,
    subType: OreType.TIN,
    quality: ItemQuality.COMMON,
    stackable: true,
    maxStack: 100,
    attributes: {},
    marketInfo: {
      basePrice: 7,
      demandMultiplier: 1.2,
      rarityMultiplier: 1.1,
      vendorPrice: 4
    }
  },
  'ore-iron': {
    id: 'ore-iron',
    name: '鐵礦石',
    description: '堅硬的鐵礦石，是製作武器和工具的重要材料',
    type: ItemType.ORE,
    subType: OreType.IRON,
    quality: ItemQuality.UNCOMMON,
    stackable: true,
    maxStack: 100,
    attributes: {},
    marketInfo: {
      basePrice: 15,
      demandMultiplier: 1.5,
      rarityMultiplier: 1.3,
      vendorPrice: 10
    }
  },
  'ore-silver': {
    id: 'ore-silver',
    name: '銀礦石',
    description: '珍貴的銀礦石，具有魔法傳導性，常用於製作魔法裝備',
    type: ItemType.ORE,
    subType: OreType.SILVER,
    quality: ItemQuality.RARE,
    stackable: true,
    maxStack: 50,
    attributes: {},
    marketInfo: {
      basePrice: 35,
      demandMultiplier: 2.0,
      rarityMultiplier: 1.8,
      vendorPrice: 25
    }
  },
  'ore-gold': {
    id: 'ore-gold',
    name: '金礦石',
    description: '珍貴的金礦石，除了製作裝備外也是重要的貨幣來源',
    type: ItemType.ORE,
    subType: OreType.GOLD,
    quality: ItemQuality.RARE,
    stackable: true,
    maxStack: 50,
    attributes: {},
    marketInfo: {
      basePrice: 50,
      demandMultiplier: 1.8,
      rarityMultiplier: 2.0,
      vendorPrice: 40
    }
  },
  'ore-mithril': {
    id: 'ore-mithril',
    name: '秘銀礦石',
    description: '傳說中的秘銀礦石，質輕如羽毛卻堅硬如鋼',
    type: ItemType.ORE,
    subType: OreType.MITHRIL,
    quality: ItemQuality.EPIC,
    stackable: true,
    maxStack: 25,
    attributes: {},
    marketInfo: {
      basePrice: 150,
      demandMultiplier: 3.0,
      rarityMultiplier: 4.0,
      vendorPrice: 120
    }
  }
};

// 金屬錠數據
export const INGOTS: Record<string, BaseItem> = {
  'ingot-copper': {
    id: 'ingot-copper',
    name: '銅錠',
    description: '冶煉過的銅錠，可用於製作基礎銅製裝備',
    type: ItemType.INGOT,
    quality: ItemQuality.COMMON,
    stackable: true,
    maxStack: 50,
    attributes: {},
    craftingInfo: {
      recipe: [{ materialId: 'ore-copper', quantity: 2 }],
      requiredSkill: 'BLACKSMITHING',
      skillLevel: 1,
      craftingTime: 30,
      successRate: 95,
      experienceGain: 5
    },
    marketInfo: {
      basePrice: 12,
      demandMultiplier: 1.2,
      rarityMultiplier: 1.0,
      vendorPrice: 8
    }
  },
  'ingot-bronze': {
    id: 'ingot-bronze',
    name: '青銅錠',
    description: '銅和錫的合金，比純銅更加堅硬耐用',
    type: ItemType.INGOT,
    quality: ItemQuality.COMMON,
    stackable: true,
    maxStack: 50,
    attributes: {},
    craftingInfo: {
      recipe: [
        { materialId: 'ore-copper', quantity: 3 },
        { materialId: 'ore-tin', quantity: 1 }
      ],
      requiredSkill: 'BLACKSMITHING',
      skillLevel: 5,
      craftingTime: 45,
      successRate: 90,
      experienceGain: 8
    },
    marketInfo: {
      basePrice: 25,
      demandMultiplier: 1.3,
      rarityMultiplier: 1.1,
      vendorPrice: 18
    }
  },
  'ingot-iron': {
    id: 'ingot-iron',
    name: '鐵錠',
    description: '冶煉過的鐵錠，製作中級裝備的主要材料',
    type: ItemType.INGOT,
    quality: ItemQuality.UNCOMMON,
    stackable: true,
    maxStack: 50,
    attributes: {},
    craftingInfo: {
      recipe: [{ materialId: 'ore-iron', quantity: 2 }],
      requiredSkill: 'BLACKSMITHING',
      skillLevel: 15,
      craftingTime: 60,
      successRate: 85,
      experienceGain: 12
    },
    marketInfo: {
      basePrice: 35,
      demandMultiplier: 1.8,
      rarityMultiplier: 1.3,
      vendorPrice: 25
    }
  },
  'ingot-steel': {
    id: 'ingot-steel',
    name: '鋼錠',
    description: '高溫鍛造的鋼錠，具有優異的強度和韌性',
    type: ItemType.INGOT,
    quality: ItemQuality.UNCOMMON,
    stackable: true,
    maxStack: 50,
    attributes: {},
    craftingInfo: {
      recipe: [
        { materialId: 'ore-iron', quantity: 3 },
        { materialId: 'coal', quantity: 2 }
      ],
      requiredSkill: 'BLACKSMITHING',
      skillLevel: 25,
      craftingTime: 90,
      successRate: 80,
      experienceGain: 18
    },
    marketInfo: {
      basePrice: 65,
      demandMultiplier: 2.2,
      rarityMultiplier: 1.5,
      vendorPrice: 45
    }
  }
};

// 武器數據
export const WEAPONS: Record<string, BaseItem> = {
  'weapon-copper-sword': {
    id: 'weapon-copper-sword',
    name: '銅劍',
    description: '用銅錠打造的基礎劍，適合新手使用',
    type: ItemType.WEAPON,
    subType: WeaponType.SWORD,
    quality: ItemQuality.COMMON,
    stackable: false,
    attributes: {
      attack: 12,
      durability: 100,
      maxDurability: 100,
      weight: 2.5
    },
    requirements: {
      level: 1,
      strength: 5
    },
    craftingInfo: {
      recipe: [
        { materialId: 'ingot-copper', quantity: 3 },
        { materialId: 'wood-oak', quantity: 1 }
      ],
      requiredSkill: 'BLACKSMITHING',
      skillLevel: 5,
      craftingTime: 120,
      successRate: 85,
      experienceGain: 15
    },
    marketInfo: {
      basePrice: 50,
      demandMultiplier: 1.5,
      rarityMultiplier: 1.0,
      vendorPrice: 30
    }
  },
  'weapon-bronze-sword': {
    id: 'weapon-bronze-sword',
    name: '青銅劍',
    description: '青銅打造的劍，比銅劍更加鋒利和耐用',
    type: ItemType.WEAPON,
    subType: WeaponType.SWORD,
    quality: ItemQuality.COMMON,
    stackable: false,
    attributes: {
      attack: 18,
      durability: 150,
      maxDurability: 150,
      weight: 3.0,
      accuracy: 5
    },
    requirements: {
      level: 5,
      strength: 8
    },
    craftingInfo: {
      recipe: [
        { materialId: 'ingot-bronze', quantity: 3 },
        { materialId: 'wood-oak', quantity: 1 }
      ],
      requiredSkill: 'BLACKSMITHING',
      skillLevel: 15,
      craftingTime: 150,
      successRate: 80,
      experienceGain: 25
    },
    marketInfo: {
      basePrice: 85,
      demandMultiplier: 1.8,
      rarityMultiplier: 1.1,
      vendorPrice: 55
    }
  },
  'weapon-iron-sword': {
    id: 'weapon-iron-sword',
    name: '鐵劍',
    description: '鐵製的劍，是冒險者的可靠伙伴',
    type: ItemType.WEAPON,
    subType: WeaponType.SWORD,
    quality: ItemQuality.UNCOMMON,
    stackable: false,
    attributes: {
      attack: 28,
      durability: 200,
      maxDurability: 200,
      weight: 3.5,
      accuracy: 8,
      criticalRate: 2
    },
    requirements: {
      level: 10,
      strength: 12
    },
    craftingInfo: {
      recipe: [
        { materialId: 'ingot-iron', quantity: 4 },
        { materialId: 'wood-oak', quantity: 1 },
        { materialId: 'leather-strip', quantity: 2 }
      ],
      requiredSkill: 'BLACKSMITHING',
      skillLevel: 30,
      craftingTime: 240,
      successRate: 75,
      experienceGain: 40
    },
    marketInfo: {
      basePrice: 150,
      demandMultiplier: 2.5,
      rarityMultiplier: 1.3,
      vendorPrice: 100
    }
  },
  'weapon-steel-sword': {
    id: 'weapon-steel-sword',
    name: '鋼劍',
    description: '精鋼打造的劍，鋒利無比，是真正戰士的武器',
    type: ItemType.WEAPON,
    subType: WeaponType.SWORD,
    quality: ItemQuality.UNCOMMON,
    stackable: false,
    attributes: {
      attack: 42,
      durability: 300,
      maxDurability: 300,
      weight: 4.0,
      accuracy: 12,
      criticalRate: 5
    },
    requirements: {
      level: 20,
      strength: 18
    },
    craftingInfo: {
      recipe: [
        { materialId: 'ingot-steel', quantity: 4 },
        { materialId: 'wood-hardwood', quantity: 1 },
        { materialId: 'leather-strip', quantity: 2 },
        { materialId: 'gem-small', quantity: 1 }
      ],
      requiredSkill: 'BLACKSMITHING',
      skillLevel: 50,
      craftingTime: 360,
      successRate: 70,
      experienceGain: 60
    },
    marketInfo: {
      basePrice: 280,
      demandMultiplier: 3.0,
      rarityMultiplier: 1.5,
      vendorPrice: 200
    }
  }
};

// 背包物品數據
export const BACKPACKS: Record<string, BaseItem> = {
  'backpack-small-leather': {
    id: 'backpack-small-leather',
    name: '小型皮革背包',
    description: '由柔軟的皮革製成的小背包，可以攜帶一些基本物品',
    type: ItemType.BACKPACK,
    quality: ItemQuality.COMMON,
    stackable: false,
    attributes: {
      weight: 1.5,
      volume: 0.5,
      durability: 100,
      maxDurability: 100
    },
    equipment: {
      capacityBonus: 15.0,    // +15kg 攜帶能力
      volumeBonus: 12.0,      // +12L 體積
      slots: 16,              // 16個格子
      durability: 100,
      repairCost: 1.2
    },
    requirements: {
      level: 1
    },
    craftingInfo: {
      recipe: [
        { materialId: 'leather-processed', quantity: 8 },
        { materialId: 'leather-strip', quantity: 4 }
      ],
      requiredSkill: 'LEATHERWORKING',
      skillLevel: 5,
      craftingTime: 120,
      successRate: 95,
      experienceGain: 15
    },
    marketInfo: {
      basePrice: 45,
      demandMultiplier: 1.8,
      rarityMultiplier: 1.0,
      vendorPrice: 30
    }
  },
  'backpack-medium-canvas': {
    id: 'backpack-medium-canvas',
    name: '中型帆布背包',
    description: '由耐用的帆布製成的中型背包，適合長途旅行',
    type: ItemType.BACKPACK,
    quality: ItemQuality.UNCOMMON,
    stackable: false,
    attributes: {
      weight: 2.5,
      volume: 0.8,
      durability: 150,
      maxDurability: 150
    },
    equipment: {
      capacityBonus: 25.0,    // +25kg 攜帶能力
      volumeBonus: 20.0,      // +20L 體積
      slots: 24,              // 24個格子
      durability: 150,
      repairCost: 1.5
    },
    requirements: {
      level: 8,
      strength: 12
    },
    craftingInfo: {
      recipe: [
        { materialId: 'fabric-canvas', quantity: 12 },
        { materialId: 'leather-strip', quantity: 6 },
        { materialId: 'metal-buckle', quantity: 4 }
      ],
      requiredSkill: 'TAILORING',
      skillLevel: 20,
      craftingTime: 180,
      successRate: 85,
      experienceGain: 35
    },
    marketInfo: {
      basePrice: 120,
      demandMultiplier: 2.2,
      rarityMultiplier: 1.3,
      vendorPrice: 80
    }
  },
  'backpack-large-reinforced': {
    id: 'backpack-large-reinforced',
    name: '大型強化背包',
    description: '由多層皮革和金屬加強件製成的大型背包，專為重載運輸設計',
    type: ItemType.BACKPACK,
    quality: ItemQuality.RARE,
    stackable: false,
    attributes: {
      weight: 4.0,
      volume: 1.2,
      durability: 200,
      maxDurability: 200
    },
    equipment: {
      capacityBonus: 40.0,    // +40kg 攜帶能力
      volumeBonus: 35.0,      // +35L 體積
      slots: 32,              // 32個格子
      durability: 200,
      repairCost: 2.0
    },
    requirements: {
      level: 15,
      strength: 18,
      stamina: 15
    },
    craftingInfo: {
      recipe: [
        { materialId: 'leather-processed', quantity: 20 },
        { materialId: 'ingot-iron', quantity: 6 },
        { materialId: 'fabric-canvas', quantity: 8 },
        { materialId: 'leather-strip', quantity: 10 }
      ],
      requiredSkill: 'LEATHERWORKING',
      skillLevel: 40,
      craftingTime: 300,
      successRate: 75,
      experienceGain: 60
    },
    marketInfo: {
      basePrice: 280,
      demandMultiplier: 2.8,
      rarityMultiplier: 1.8,
      vendorPrice: 200
    }
  },
  'backpack-expedition': {
    id: 'backpack-expedition',
    name: '探險家背包',
    description: '專為長期探險設計的頂級背包，具有多個分隔和防水功能',
    type: ItemType.BACKPACK,
    quality: ItemQuality.EPIC,
    stackable: false,
    attributes: {
      weight: 3.5,
      volume: 1.0,
      durability: 300,
      maxDurability: 300,
      enchantments: ['waterproof', 'lightweight']
    },
    equipment: {
      capacityBonus: 50.0,    // +50kg 攜帶能力
      volumeBonus: 45.0,      // +45L 體積
      slots: 40,              // 40個格子
      durability: 300,
      repairCost: 2.5
    },
    requirements: {
      level: 25,
      strength: 22,
      stamina: 18
    },
    craftingInfo: {
      recipe: [
        { materialId: 'leather-masterwork', quantity: 15 },
        { materialId: 'ingot-steel', quantity: 4 },
        { materialId: 'fabric-silk', quantity: 6 },
        { materialId: 'gem-medium', quantity: 2 },
        { materialId: 'enchanted-thread', quantity: 8 }
      ],
      requiredSkill: 'LEATHERWORKING',
      skillLevel: 65,
      craftingTime: 480,
      successRate: 60,
      experienceGain: 100
    },
    marketInfo: {
      basePrice: 650,
      demandMultiplier: 4.0,
      rarityMultiplier: 2.5,
      vendorPrice: 450
    }
  },
  'backpack-hands-only': {
    id: 'backpack-hands-only',
    name: '雙手攜帶',
    description: '無裝備時只能用雙手攜帶物品，容量和體積都很有限',
    type: ItemType.MISC,
    quality: ItemQuality.POOR,
    stackable: false,
    attributes: {
      weight: 0,
      volume: 0
    },
    equipment: {
      capacityBonus: 0,       // 無加成
      volumeBonus: 0,         // 無加成
      slots: 8,               // 只有8個格子
      durability: 999,
      repairCost: 0
    },
    marketInfo: {
      basePrice: 0,
      demandMultiplier: 0,
      rarityMultiplier: 0,
      vendorPrice: 0
    }
  }
};

// 製作配方數據庫
export const CRAFTING_RECIPES: Record<string, CraftingRecipe> = {
  'recipe-smelt-copper': {
    id: 'recipe-smelt-copper',
    name: '冶煉銅錠',
    description: '將銅礦石冶煉成銅錠',
    resultItem: {
      itemId: 'ingot-copper',
      quantity: 1,
      quality: ItemQuality.COMMON
    },
    materials: [
      { itemId: 'ore-copper', quantity: 2 }
    ],
    requirements: {
      skill: 'BLACKSMITHING',
      level: 1,
      workstation: 'forge'
    },
    craftingTime: 30,
    difficulty: 1,
    successRate: 95,
    experienceGain: 5
  },
  'recipe-forge-copper-sword': {
    id: 'recipe-forge-copper-sword',
    name: '鍛造銅劍',
    description: '用銅錠和木材鍛造一把基礎的銅劍',
    resultItem: {
      itemId: 'weapon-copper-sword',
      quantity: 1,
      quality: ItemQuality.COMMON
    },
    materials: [
      { itemId: 'ingot-copper', quantity: 3 },
      { itemId: 'wood-oak', quantity: 1 }
    ],
    requirements: {
      skill: 'BLACKSMITHING',
      level: 5,
      tool: 'hammer',
      workstation: 'anvil'
    },
    craftingTime: 120,
    difficulty: 2,
    successRate: 85,
    experienceGain: 15,
    unlockConditions: {
      npcRelationship: {
        npcId: 'npc-blacksmith-001',
        minimumReputation: 10
      }
    }
  },
  'recipe-forge-steel-sword': {
    id: 'recipe-forge-steel-sword',
    name: '鍛造鋼劍',
    description: '鍛造一把優質的鋼劍，需要高超的技藝',
    resultItem: {
      itemId: 'weapon-steel-sword',
      quantity: 1,
      quality: ItemQuality.UNCOMMON
    },
    materials: [
      { itemId: 'ingot-steel', quantity: 4 },
      { itemId: 'wood-hardwood', quantity: 1 },
      { itemId: 'leather-strip', quantity: 2 },
      { itemId: 'gem-small', quantity: 1 }
    ],
    requirements: {
      skill: 'BLACKSMITHING',
      level: 50,
      tool: 'master-hammer',
      workstation: 'master-anvil'
    },
    craftingTime: 360,
    difficulty: 7,
    successRate: 70,
    experienceGain: 60,
    unlockConditions: {
      questCompleted: ['quest-master-blacksmith'],
      npcRelationship: {
        npcId: 'npc-blacksmith-001',
        minimumReputation: 75
      }
    }
  }
};

// 輔助函數：獲取所有物品
export function getAllItems(): Record<string, BaseItem> {
  return {
    ...ORES,
    ...INGOTS,
    ...WEAPONS,
    ...BACKPACKS
  };
}

// 輔助函數：根據類型獲取物品
export function getItemsByType(type: ItemType): BaseItem[] {
  const allItems = getAllItems();
  return Object.values(allItems).filter(item => item.type === type);
}

// 輔助函數：根據品質獲取物品
export function getItemsByQuality(quality: ItemQuality): BaseItem[] {
  const allItems = getAllItems();
  return Object.values(allItems).filter(item => item.quality === quality);
}

// 輔助函數：獲取可製作的物品（根據技能等級）
export function getCraftableItems(skillType: string, skillLevel: number): CraftingRecipe[] {
  return Object.values(CRAFTING_RECIPES).filter(recipe => 
    recipe.requirements.skill === skillType && 
    recipe.requirements.level <= skillLevel
  );
}