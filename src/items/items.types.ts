// 物品品質等級
export enum ItemQuality {
  POOR = 'POOR',           // 粗糙 (灰色)
  COMMON = 'COMMON',       // 普通 (白色)
  UNCOMMON = 'UNCOMMON',   // 優良 (綠色)
  RARE = 'RARE',           // 稀有 (藍色)
  EPIC = 'EPIC',           // 史詩 (紫色)
  LEGENDARY = 'LEGENDARY', // 傳說 (橙色)
  ARTIFACT = 'ARTIFACT'    // 神器 (紅色)
}

// 物品類型
export enum ItemType {
  // 原材料
  RAW_MATERIAL = 'RAW_MATERIAL',   // 原材料
  ORE = 'ORE',                     // 礦石
  WOOD = 'WOOD',                   // 木材
  LEATHER = 'LEATHER',             // 皮革
  HERB = 'HERB',                   // 草藥
  STONE = 'STONE',                 // 石材
  GEM = 'GEM',                     // 寶石
  
  // 製作材料
  INGOT = 'INGOT',                 // 金屬錠
  PLANK = 'PLANK',                 // 木板
  FABRIC = 'FABRIC',               // 布料
  PROCESSED_LEATHER = 'PROCESSED_LEATHER', // 處理過的皮革
  
  // 成品
  WEAPON = 'WEAPON',               // 武器
  ARMOR = 'ARMOR',                 // 防具
  BACKPACK = 'BACKPACK',           // 背包
  TOOL = 'TOOL',                   // 工具
  ACCESSORY = 'ACCESSORY',         // 飾品
  CONSUMABLE = 'CONSUMABLE',       // 消耗品
  MISC = 'MISC'                    // 雜項
}

// 武器類型
export enum WeaponType {
  SWORD = 'SWORD',         // 劍
  AXE = 'AXE',            // 斧頭
  HAMMER = 'HAMMER',       // 錘子
  BOW = 'BOW',            // 弓
  STAFF = 'STAFF',        // 法杖
  DAGGER = 'DAGGER',      // 匕首
  SPEAR = 'SPEAR'         // 長槍
}

// 防具類型
export enum ArmorType {
  HELMET = 'HELMET',       // 頭盔
  CHEST = 'CHEST',         // 胸甲
  LEGS = 'LEGS',          // 腿甲
  BOOTS = 'BOOTS',        // 靴子
  GLOVES = 'GLOVES',      // 手套
  SHIELD = 'SHIELD'       // 盾牌
}

// 礦石類型
export enum OreType {
  COPPER = 'COPPER',       // 銅礦
  TIN = 'TIN',            // 錫礦
  IRON = 'IRON',          // 鐵礦
  SILVER = 'SILVER',      // 銀礦
  GOLD = 'GOLD',          // 金礦
  MITHRIL = 'MITHRIL',    // 秘銀
  ADAMANT = 'ADAMANT',    // 金剛石
  RUNITE = 'RUNITE'       // 符文礦
}

// 物品屬性
export interface ItemAttributes {
  attack?: number;         // 攻擊力
  defense?: number;        // 防禦力
  durability?: number;     // 耐久度
  maxDurability?: number;  // 最大耐久度
  weight?: number;         // 重量(公斤)
  volume?: number;         // 體積(公升)
  value?: number;          // 基礎價值
  magicAttack?: number;    // 魔法攻擊
  magicDefense?: number;   // 魔法防禦
  accuracy?: number;       // 命中率
  criticalRate?: number;   // 暴擊率
  enchantments?: string[]; // 附魔效果
}

// 基礎物品介面
export interface BaseItem {
  id: string;
  name: string;
  description: string;
  type: ItemType;
  subType?: WeaponType | ArmorType | OreType | string;
  quality: ItemQuality;
  stackable: boolean;      // 是否可堆疊
  maxStack?: number;       // 最大堆疊數量
  attributes: ItemAttributes;
  requirements?: {         // 使用需求
    level?: number;
    strength?: number;
    dexterity?: number;
    intelligence?: number;
    stamina?: number;
  };
  craftingInfo?: {         // 製作資訊
    recipe: Array<{
      materialId: string;
      quantity: number;
      quality?: ItemQuality; // 需要的材料品質
    }>;
    requiredSkill: string;   // 需要的技能
    skillLevel: number;      // 需要的技能等級
    craftingTime: number;    // 製作時間（分鐘）
    successRate: number;     // 成功率（0-100）
    experienceGain: number;  // 獲得的技能經驗
  };
  marketInfo?: {           // 市場資訊
    basePrice: number;       // 基礎價格
    demandMultiplier: number; // 需求倍數
    rarityMultiplier: number; // 稀有度倍數
    vendorPrice?: number;     // NPC 收購價格
  };
  equipment?: {            // 裝備屬性（適用於背包、武器、護甲）
    capacityBonus?: number;   // 重量容量加成(公斤)
    volumeBonus?: number;     // 體積容量加成(公升)
    slots?: number;           // 格子數量（背包專用）
    durability?: number;      // 耐久度上限
    repairCost?: number;      // 修理成本倍數
  };
  combat?: {               // 戰鬥屬性（武器、護甲）
    damage?: number;          // 傷害值（武器）
    defense?: number;         // 防禦值（護甲）
    accuracy?: number;        // 命中率加成
    criticalRate?: number;    // 暴擊率加成
    attackSpeed?: number;     // 攻擊速度倍數
  };
}

// 庫存物品（包含數量和狀態）
export interface InventoryItem extends BaseItem {
  quantity: number;
  condition?: number;      // 物品狀況（0-100）
  enchantmentLevel?: number; // 強化等級
  bindingType?: 'NONE' | 'CHARACTER' | 'ACCOUNT'; // 綁定類型
  acquiredAt: Date;        // 獲得時間
  lastUsed?: Date;         // 最後使用時間
}

// 製作配方
export interface CraftingRecipe {
  id: string;
  name: string;
  description: string;
  resultItem: {
    itemId: string;
    quantity: number;
    quality: ItemQuality;
  };
  materials: Array<{
    itemId: string;
    quantity: number;
    quality?: ItemQuality;
  }>;
  requirements: {
    skill: string;
    level: number;
    tool?: string;          // 需要的工具
    workstation?: string;   // 需要的工作台
  };
  craftingTime: number;     // 製作時間（秒）
  difficulty: number;       // 難度等級（1-10）
  successRate: number;      // 基礎成功率
  experienceGain: number;   // 獲得經驗
  unlockConditions?: {      // 解鎖條件
    questCompleted?: string[];
    npcRelationship?: {
      npcId: string;
      minimumReputation: number;
    };
    itemsDiscovered?: string[];
  };
}

// 品質獎勵倍數
export const QUALITY_MULTIPLIERS: Record<ItemQuality, number> = {
  [ItemQuality.POOR]: 0.5,
  [ItemQuality.COMMON]: 1.0,
  [ItemQuality.UNCOMMON]: 1.5,
  [ItemQuality.RARE]: 2.5,
  [ItemQuality.EPIC]: 4.0,
  [ItemQuality.LEGENDARY]: 7.0,
  [ItemQuality.ARTIFACT]: 12.0
};

// 品質顏色代碼（用於 UI 顯示）
export const QUALITY_COLORS: Record<ItemQuality, string> = {
  [ItemQuality.POOR]: '#9d9d9d',      // 灰色
  [ItemQuality.COMMON]: '#ffffff',     // 白色
  [ItemQuality.UNCOMMON]: '#1eff00',   // 綠色
  [ItemQuality.RARE]: '#0070dd',       // 藍色
  [ItemQuality.EPIC]: '#a335ee',       // 紫色
  [ItemQuality.LEGENDARY]: '#ff8000',  // 橙色
  [ItemQuality.ARTIFACT]: '#e6cc80'    // 金色
};

// 製作成功率計算函數
export function calculateCraftingSuccessRate(
  baseRate: number,
  playerSkillLevel: number,
  requiredSkillLevel: number,
  materialQuality: ItemQuality[],
  toolBonus: number = 0
): number {
  // 技能等級加成
  const skillBonus = Math.max(0, (playerSkillLevel - requiredSkillLevel) * 2);
  
  // 材料品質加成
  const materialBonus = materialQuality.reduce((total, quality) => {
    return total + (QUALITY_MULTIPLIERS[quality] - 1) * 10;
  }, 0) / materialQuality.length;
  
  // 計算最終成功率
  const finalRate = baseRate + skillBonus + materialBonus + toolBonus;
  
  // 限制在 5% 到 95% 之間
  return Math.max(5, Math.min(95, finalRate));
}

// 計算物品價值
export function calculateItemValue(item: BaseItem, condition: number = 100): number {
  if (!item.marketInfo) return 0;
  
  const baseValue = item.marketInfo.basePrice;
  const qualityMultiplier = QUALITY_MULTIPLIERS[item.quality];
  const conditionMultiplier = condition / 100;
  const rarityMultiplier = item.marketInfo.rarityMultiplier;
  
  return Math.round(baseValue * qualityMultiplier * conditionMultiplier * rarityMultiplier);
}