// 角色職業類型定義
import { SkillType } from '../skills/skills.service';

// 職業枚舉
export enum CharacterClass {
  NOVICE = 'NOVICE',       // 初心者 - 所有角色的起始職業
  WARRIOR = 'WARRIOR',     // 劍士 - 近戰物理輸出
  MAGE = 'MAGE',          // 法師 - 魔法輸出與魔法收納
  ARCHER = 'ARCHER',       // 弓箭手 - 遠程物理輸出
  ROGUE = 'ROGUE'         // 盜賊 - 敏捷與爆擊
}

// 職業基本屬性
export interface ClassBaseStats {
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  luck: number;
  health: number;
  mana: number;
}

// 職業成長率（每級提升的屬性）
export interface ClassGrowthRates {
  strengthPerLevel: number;
  dexterityPerLevel: number;
  intelligencePerLevel: number;
  vitalityPerLevel: number;
  luckPerLevel: number;
  healthPerLevel: number;
  manaPerLevel: number;
}

// 職業特殊能力
export interface ClassSpecialAbilities {
  hasPhysicalCombatBonus: boolean;    // 物理戰鬥加成
  hasMagicalCombatBonus: boolean;     // 魔法戰鬥加成
  hasRangedCombatBonus: boolean;      // 遠程戰鬥加成
  hasStealthAbilities: boolean;       // 潛行能力
  hasMagicalStorage: boolean;         // 魔法收納能力
  hasEnhancedCritical: boolean;       // 強化爆擊
  hasWeaponMastery: string[];         // 武器精通列表
  canUseMagic: boolean;               // 能否使用魔法
}

// 職業資料結構
export interface CharacterClassData {
  classType: CharacterClass;
  name: string;
  description: string;
  baseStats: ClassBaseStats;
  growthRates: ClassGrowthRates;
  specialAbilities: ClassSpecialAbilities;
  startingSkills: string[];           // 起始技能
  preferredWeapons: string[];         // 偏好武器類型
  startingEquipment: string[];        // 起始裝備
}

// 轉職條件
export interface JobChangeRequirements {
  minimumLevel: number;           // 最低等級要求
  attributeRequirements: {        // 屬性要求
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    vitality?: number;
    luck?: number;
  };
  skillRequirements?: {           // 技能要求
    skillType: SkillType;
    knowledgeName: string;        // 需要學會的知識名稱
  }[];
  questRequirements?: string[];   // 任務要求
  goldCost: number;              // 轉職費用
  npcRequired: string;           // 需要的NPC ID
  description: string;           // 轉職條件描述
}

// 轉職結果
export interface JobChangeResult {
  success: boolean;
  message: string;
  newClass?: CharacterClass;
  oldClass?: CharacterClass;
  bonusesApplied?: string[];
  costsDeducted?: {
    gold?: number;
    items?: Array<{ itemId: string; quantity: number }>;
  };
}

// 魔法收納配置
export interface MagicalStorageConfig {
  baseCapacity: number;               // 基礎容量（基於智力）
  capacityPerIntelligence: number;    // 每點智力增加的容量
  manaMultipliers: {                  // 基於物品品質的魔力消耗倍數
    POOR: number;
    COMMON: number;
    UNCOMMON: number;
    RARE: number;
    EPIC: number;
    LEGENDARY: number;
    ARTIFACT: number;
  };
  storageEfficiency: number;          // 收納效率（1.0 = 100%）
  retrievalCost: number;              // 取出物品的魔力消耗比例
}

// 職業數據庫
export const CHARACTER_CLASSES: Record<CharacterClass, CharacterClassData> = {
  [CharacterClass.NOVICE]: {
    classType: CharacterClass.NOVICE,
    name: '初心者',
    description: '剛踏上冒險旅程的新手，還未確定自己的職業方向，擁有均衡的成長潛力',
    baseStats: {
      strength: 10,       // 均衡屬性
      dexterity: 10,
      intelligence: 10,
      vitality: 10,
      luck: 10,
      health: 100,        // 標準生命值
      mana: 50           // 標準魔力
    },
    growthRates: {
      strengthPerLevel: 1.0,     // 均衡成長
      dexterityPerLevel: 1.0,
      intelligencePerLevel: 1.0,
      vitalityPerLevel: 1.0,
      luckPerLevel: 1.0,
      healthPerLevel: 5,
      manaPerLevel: 3
    },
    specialAbilities: {
      hasPhysicalCombatBonus: false,   // 無特殊能力
      hasMagicalCombatBonus: false,
      hasRangedCombatBonus: false,
      hasStealthAbilities: false,
      hasMagicalStorage: false,
      hasEnhancedCritical: false,
      hasWeaponMastery: [],           // 無武器精通
      canUseMagic: false
    },
    startingSkills: [],               // 無起始技能
    preferredWeapons: [],             // 無偏好武器
    startingEquipment: ['backpack-hands-only'] // 只有雙手攜帶
  },

  [CharacterClass.WARRIOR]: {
    classType: CharacterClass.WARRIOR,
    name: '劍士',
    description: '近戰專家，擅長使用各種近戰武器，具有高生命值和防禦力',
    baseStats: {
      strength: 15,      // 劍士力量較高
      dexterity: 8,
      intelligence: 5,
      vitality: 12,      // 較高體質
      luck: 5,
      health: 120,       // 較高生命值
      mana: 30          // 較低魔力
    },
    growthRates: {
      strengthPerLevel: 2.5,
      dexterityPerLevel: 1.0,
      intelligencePerLevel: 0.5,
      vitalityPerLevel: 2.0,
      luckPerLevel: 0.5,
      healthPerLevel: 8,
      manaPerLevel: 2
    },
    specialAbilities: {
      hasPhysicalCombatBonus: true,
      hasMagicalCombatBonus: false,
      hasRangedCombatBonus: false,
      hasStealthAbilities: false,
      hasMagicalStorage: false,
      hasEnhancedCritical: false,
      hasWeaponMastery: ['SWORD', 'AXE', 'MACE', 'SHIELD'],
      canUseMagic: false
    },
    startingSkills: ['COMBAT', 'BLACKSMITHING'],
    preferredWeapons: ['weapon-copper-sword', 'weapon-bronze-sword'],
    startingEquipment: ['weapon-copper-sword', 'backpack-small-leather']
  },

  [CharacterClass.MAGE]: {
    classType: CharacterClass.MAGE,
    name: '法師',
    description: '魔法專家，擅長元素魔法和魔法收納技能，具有高魔力值',
    baseStats: {
      strength: 5,
      dexterity: 7,
      intelligence: 15,   // 法師智力最高
      vitality: 8,
      luck: 10,
      health: 80,         // 較低生命值
      mana: 100          // 最高魔力
    },
    growthRates: {
      strengthPerLevel: 0.5,
      dexterityPerLevel: 1.0,
      intelligencePerLevel: 2.5,
      vitalityPerLevel: 1.0,
      luckPerLevel: 1.5,
      healthPerLevel: 4,
      manaPerLevel: 6
    },
    specialAbilities: {
      hasPhysicalCombatBonus: false,
      hasMagicalCombatBonus: true,
      hasRangedCombatBonus: false,
      hasStealthAbilities: false,
      hasMagicalStorage: true,        // 只有法師有魔法收納
      hasEnhancedCritical: false,
      hasWeaponMastery: ['STAFF', 'WAND'],
      canUseMagic: true
    },
    startingSkills: ['MAGIC', 'ALCHEMY', 'SCHOLARSHIP'],
    preferredWeapons: ['weapon-magic-staff', 'weapon-basic-wand'],
    startingEquipment: ['weapon-basic-wand', 'spell-pouch']
  },

  [CharacterClass.ARCHER]: {
    classType: CharacterClass.ARCHER,
    name: '弓箭手',
    description: '遠程專家，擅長弓箭和投擲武器，具有高敏捷和精準度',
    baseStats: {
      strength: 10,
      dexterity: 15,      // 弓箭手敏捷最高
      intelligence: 8,
      vitality: 10,
      luck: 12,           // 較高幸運
      health: 100,
      mana: 50
    },
    growthRates: {
      strengthPerLevel: 1.5,
      dexterityPerLevel: 2.5,
      intelligencePerLevel: 1.0,
      vitalityPerLevel: 1.5,
      luckPerLevel: 2.0,
      healthPerLevel: 6,
      manaPerLevel: 3
    },
    specialAbilities: {
      hasPhysicalCombatBonus: false,
      hasMagicalCombatBonus: false,
      hasRangedCombatBonus: true,     // 遠程戰鬥加成
      hasStealthAbilities: true,      // 有潛行能力
      hasMagicalStorage: false,
      hasEnhancedCritical: true,      // 強化爆擊
      hasWeaponMastery: ['BOW', 'CROSSBOW', 'THROWING'],
      canUseMagic: false
    },
    startingSkills: ['COMBAT', 'WOODCUTTING', 'HERBALISM'],
    preferredWeapons: ['weapon-short-bow', 'weapon-hunting-knife'],
    startingEquipment: ['weapon-short-bow', 'arrows-20', 'backpack-small-leather']
  },

  [CharacterClass.ROGUE]: {
    classType: CharacterClass.ROGUE,
    name: '盜賊',
    description: '敏捷專家，擅長潛行、開鎖和爆擊攻擊，具有高爆擊率',
    baseStats: {
      strength: 8,
      dexterity: 13,
      intelligence: 10,
      vitality: 9,
      luck: 15,           // 盜賊幸運最高
      health: 90,
      mana: 60
    },
    growthRates: {
      strengthPerLevel: 1.0,
      dexterityPerLevel: 2.0,
      intelligencePerLevel: 1.5,
      vitalityPerLevel: 1.0,
      luckPerLevel: 2.5,
      healthPerLevel: 5,
      manaPerLevel: 4
    },
    specialAbilities: {
      hasPhysicalCombatBonus: false,
      hasMagicalCombatBonus: false,
      hasRangedCombatBonus: false,
      hasStealthAbilities: true,      // 最強潛行能力
      hasMagicalStorage: false,
      hasEnhancedCritical: true,      // 最強爆擊
      hasWeaponMastery: ['DAGGER', 'SHORT_SWORD', 'THROWING'],
      canUseMagic: true              // 可以學習一些輔助魔法
    },
    startingSkills: ['COMBAT', 'TRADING', 'NEGOTIATION'],
    preferredWeapons: ['weapon-steel-dagger', 'weapon-throwing-knife'],
    startingEquipment: ['weapon-steel-dagger', 'lockpicks', 'backpack-small-leather']
  }
};

// 魔法收納系統配置
export const MAGICAL_STORAGE_CONFIG: MagicalStorageConfig = {
  baseCapacity: 10.0,                // 基礎10kg容量
  capacityPerIntelligence: 2.0,      // 每點智力 +2kg
  manaMultipliers: {
    POOR: 0.5,
    COMMON: 1.0,
    UNCOMMON: 1.5,
    RARE: 2.5,
    EPIC: 4.0,
    LEGENDARY: 6.0,
    ARTIFACT: 10.0
  },
  storageEfficiency: 1.0,            // 100% 效率
  retrievalCost: 0.1                 // 取出時消耗10%的儲存魔力
};

// 輔助函數：獲取職業數據
export function getClassData(characterClass: CharacterClass): CharacterClassData {
  return CHARACTER_CLASSES[characterClass];
}

// 輔助函數：計算法師魔法收納容量
export function calculateMagicalStorageCapacity(intelligence: number): number {
  return MAGICAL_STORAGE_CONFIG.baseCapacity + 
         (intelligence * MAGICAL_STORAGE_CONFIG.capacityPerIntelligence);
}

// 輔助函數：計算物品儲存魔力消耗
export function calculateStorageMana(itemWeight: number, quality: string): number {
  const qualityMultiplier = MAGICAL_STORAGE_CONFIG.manaMultipliers[quality as keyof typeof MAGICAL_STORAGE_CONFIG.manaMultipliers] || 1.0;
  return itemWeight * qualityMultiplier * MAGICAL_STORAGE_CONFIG.storageEfficiency;
}

// 輔助函數：計算物品取出魔力消耗
export function calculateRetrievalMana(storageMana: number): number {
  return storageMana * MAGICAL_STORAGE_CONFIG.retrievalCost;
}

// 職業驗證函數
export function isValidCharacterClass(className: string): className is CharacterClass {
  return Object.values(CharacterClass).includes(className as CharacterClass);
}

// 職業中文名稱映射
export const CLASS_DISPLAY_NAMES = {
  [CharacterClass.NOVICE]: '初心者',
  [CharacterClass.WARRIOR]: '劍士',
  [CharacterClass.MAGE]: '法師', 
  [CharacterClass.ARCHER]: '弓箭手',
  [CharacterClass.ROGUE]: '盜賊'
};

// 轉職條件配置
export const JOB_CHANGE_REQUIREMENTS: Record<CharacterClass, JobChangeRequirements | null> = {
  [CharacterClass.NOVICE]: null, // 初心者無需轉職條件
  
  [CharacterClass.WARRIOR]: {
    minimumLevel: 10,
    attributeRequirements: {
      strength: 15,
      vitality: 12
    },
    skillRequirements: [
      {
        skillType: SkillType.COMBAT,
        knowledgeName: '基礎劍術'
      }
    ],
    goldCost: 1000,
    npcRequired: 'npc-warrior-trainer',
    description: '需要達到10級，力量≥15，體質≥12，並學會基礎劍術'
  },

  [CharacterClass.MAGE]: {
    minimumLevel: 8, // 法師提前轉職
    attributeRequirements: {
      intelligence: 12,
      mana: 80
    },
    skillRequirements: [
      {
        skillType: SkillType.MAGIC,
        knowledgeName: '魔法基礎理論'
      }
    ],
    goldCost: 1500,
    npcRequired: 'npc-003', // 智者奧丁
    description: '需要達到8級，智力≥12，魔力≥80，並學會魔法基礎理論'
  },

  [CharacterClass.ARCHER]: {
    minimumLevel: 10,
    attributeRequirements: {
      dexterity: 15,
      luck: 12
    },
    skillRequirements: [
      {
        skillType: SkillType.WOODCUTTING,
        knowledgeName: '基礎伐木技術'
      }
    ],
    goldCost: 1200,
    npcRequired: 'npc-archer-trainer',
    description: '需要達到10級，敏捷≥15，幸運≥12，並學會基礎伐木技術'
  },

  [CharacterClass.ROGUE]: {
    minimumLevel: 10,
    attributeRequirements: {
      luck: 12,
      dexterity: 13
    },
    skillRequirements: [
      {
        skillType: SkillType.TRADING,
        knowledgeName: '基礎貿易知識'
      }
    ],
    goldCost: 800,
    npcRequired: 'npc-rogue-trainer',
    description: '需要達到10級，幸運≥12，敏捷≥13，並學會基礎貿易知識'
  }
};

// 輔助函數：獲取轉職條件
export function getJobChangeRequirements(targetClass: CharacterClass): JobChangeRequirements | null {
  return JOB_CHANGE_REQUIREMENTS[targetClass];
}

// 輔助函數：檢查角色是否可以轉職到指定職業
export function canChangeToJob(
  currentClass: CharacterClass,
  targetClass: CharacterClass,
  characterLevel: number,
  characterStats: {
    strength: number;
    dexterity: number;
    intelligence: number;
    vitality: number;
    luck: number;
  },
  characterMana: number,
  learnedKnowledge: string[],
  gold: number
): { canChange: boolean; missingRequirements: string[] } {
  // 只有初心者可以轉職
  if (currentClass !== CharacterClass.NOVICE) {
    return {
      canChange: false,
      missingRequirements: ['只有初心者可以轉職到其他職業']
    };
  }

  const requirements = getJobChangeRequirements(targetClass);
  if (!requirements) {
    return {
      canChange: false,
      missingRequirements: ['無效的目標職業']
    };
  }

  const missingRequirements: string[] = [];

  // 檢查等級
  if (characterLevel < requirements.minimumLevel) {
    missingRequirements.push(`需要達到 ${requirements.minimumLevel} 級`);
  }

  // 檢查屬性
  const attrReq = requirements.attributeRequirements;
  if (attrReq.strength && characterStats.strength < attrReq.strength) {
    missingRequirements.push(`力量需要達到 ${attrReq.strength}`);
  }
  if (attrReq.dexterity && characterStats.dexterity < attrReq.dexterity) {
    missingRequirements.push(`敏捷需要達到 ${attrReq.dexterity}`);
  }
  if (attrReq.intelligence && characterStats.intelligence < attrReq.intelligence) {
    missingRequirements.push(`智力需要達到 ${attrReq.intelligence}`);
  }
  if (attrReq.vitality && characterStats.vitality < attrReq.vitality) {
    missingRequirements.push(`體質需要達到 ${attrReq.vitality}`);
  }
  if (attrReq.luck && characterStats.luck < attrReq.luck) {
    missingRequirements.push(`幸運需要達到 ${attrReq.luck}`);
  }

  // 特殊檢查：法師需要檢查魔力
  if (targetClass === CharacterClass.MAGE && characterMana < 80) {
    missingRequirements.push('魔力需要達到 80');
  }

  // 檢查技能知識
  if (requirements.skillRequirements) {
    for (const skillReq of requirements.skillRequirements) {
      if (!learnedKnowledge.includes(skillReq.knowledgeName)) {
        missingRequirements.push(`需要學會「${skillReq.knowledgeName}」`);
      }
    }
  }

  // 檢查金錢
  if (gold < requirements.goldCost) {
    missingRequirements.push(`需要 ${requirements.goldCost} 金幣`);
  }

  return {
    canChange: missingRequirements.length === 0,
    missingRequirements
  };
}