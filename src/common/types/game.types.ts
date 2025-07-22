// 角色屬性類型
export interface CharacterStats {
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  level: number;
  exp: number;
  expToNextLevel: number;
  strength: number;
  dexterity: number;
  intelligence: number;
  vitality: number;
  luck: number;
  availableStatPoints: number;
}

// 戰鬥相關類型
export interface CombatStats {
  physicalAttack: number;
  magicalAttack: number;
  defense: number;
  magicalDefense: number;
  accuracy: number;
  evasion: number;
  criticalRate: number;
  criticalDamage: number;
}

// 任務狀態
export enum QuestStatus {
  AVAILABLE = 'available',
  ACCEPTED = 'accepted',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  TURNED_IN = 'turned_in',
  FAILED = 'failed',
}

// 任務類型
export enum QuestType {
  KILL = 'kill',           // 擊殺任務
  COLLECT = 'collect',     // 收集任務
  DELIVER = 'deliver',     // 運送任務
  TALK = 'talk',           // 對話任務
  EXPLORE = 'explore',     // 探索任務
  CRAFT = 'craft',         // 製作任務
}

// 物品稀有度
export enum ItemRarity {
  COMMON = 'common',
  UNCOMMON = 'uncommon',
  RARE = 'rare',
  EPIC = 'epic',
  LEGENDARY = 'legendary',
}

// 物品類型
export enum ItemType {
  WEAPON = 'weapon',
  ARMOR = 'armor',
  ACCESSORY = 'accessory',
  CONSUMABLE = 'consumable',
  MATERIAL = 'material',
  QUEST = 'quest',
}

// NPC 類型
export enum NpcType {
  QUEST_GIVER = 'quest_giver',
  MERCHANT = 'merchant',
  GUARD = 'guard',
  VILLAGER = 'villager',
  MONSTER = 'monster',
}

// 遊戲位置
export interface Position {
  x: number;
  y: number;
  z?: number;
  map: string;
}

// API 回應格式
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
}