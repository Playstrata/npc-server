// 怪物類型定義
export enum MonsterType {
  BEAST = "BEAST", // 野獸類
  UNDEAD = "UNDEAD", // 不死族
  ELEMENTAL = "ELEMENTAL", // 元素類
  HUMANOID = "HUMANOID", // 人形類
  DRAGON = "DRAGON", // 龍族
  DEMON = "DEMON", // 魔族
}

// 怪物等級區間
export enum MonsterTier {
  WEAK = "WEAK", // 弱小 (1-5級)
  NORMAL = "NORMAL", // 普通 (6-15級)
  STRONG = "STRONG", // 強壯 (16-25級)
  ELITE = "ELITE", // 精英 (26-35級)
  BOSS = "BOSS", // 首領 (36-50級)
  LEGENDARY = "LEGENDARY", // 傳奇 (50+級)
}

// 怪物基礎屬性
export interface MonsterStats {
  level: number; // 怪物等級
  health: number; // 生命值
  maxHealth: number; // 最大生命值
  mana: number; // 魔力值
  maxMana: number; // 最大魔力值
  physicalAttack: number; // 物理攻擊力
  magicalAttack: number; // 魔法攻擊力
  physicalDefense: number; // 物理防禦力
  magicalDefense: number; // 魔法防禦力
  speed: number; // 攻擊速度
  criticalRate: number; // 爆擊率 (0-1)
  criticalDamage: number; // 爆擊倍數
  accuracy: number; // 命中率 (0-1)
  evasion: number; // 閃避率 (0-1)
}

// 怪物掉落物品
export interface MonsterDrop {
  itemId: string; // 物品ID
  dropRate: number; // 掉落機率 (0-1)
  minQuantity: number; // 最小數量
  maxQuantity: number; // 最大數量
  quality: string; // 物品品質
  isGuaranteed: boolean; // 是否必掉
}

// 怪物經驗值獎勵
export interface MonsterRewards {
  baseExperience: number; // 基礎經驗值
  experienceRange: {
    // 經驗值浮動範圍
    min: number;
    max: number;
  };
  combatSkillExperience: number; // 戰鬥技能經驗
  goldReward: {
    // 金幣獎勵
    min: number;
    max: number;
  };
  drops: MonsterDrop[]; // 掉落物品
  specialRewards?: {
    // 特殊獎勵
    reputationGain?: number;
    luckBonus?: number;
    skillBooks?: string[];
  };
}

// 怪物AI行為
export interface MonsterBehavior {
  aggroRange: number; // 仇恨範圍
  attackRange: number; // 攻擊範圍
  moveSpeed: number; // 移動速度
  attackCooldown: number; // 攻擊冷卻時間
  fleeThreshold: number; // 逃跑血量閾值 (0-1)
  isAggressive: boolean; // 是否主動攻擊
  canUseMagic: boolean; // 能否使用魔法
  specialAbilities: string[]; // 特殊能力列表
}

// 怪物弱點與抗性
export interface MonsterResistances {
  physicalResistance: number; // 物理抗性 (-1 to 1, 負數為弱點)
  magicalResistance: number; // 魔法抗性
  fireResistance: number; // 火抗性
  waterResistance: number; // 水抗性
  earthResistance: number; // 土抗性
  airResistance: number; // 風抗性
  criticalResistance: number; // 爆擊抗性
}

// 完整怪物定義
export interface MonsterDefinition {
  id: string; // 怪物唯一ID
  name: string; // 怪物名稱
  description: string; // 怪物描述
  type: MonsterType; // 怪物類型
  tier: MonsterTier; // 怪物等級區間
  stats: MonsterStats; // 基礎屬性
  behavior: MonsterBehavior; // AI行為
  resistances: MonsterResistances; // 抗性與弱點
  rewards: MonsterRewards; // 獎勵設定
  spawnLocations: string[]; // 刷新地點
  spawnConditions?: {
    // 刷新條件
    timeOfDay?: "DAY" | "NIGHT" | "ANY";
    weatherCondition?: string;
    playerLevelRange?: { min: number; max: number };
    specialEvents?: string[];
  };
  visualInfo: {
    // 視覺信息
    spriteId: string; // 精靈圖ID
    size: "SMALL" | "MEDIUM" | "LARGE" | "GIANT";
    colorVariant?: string;
    animationSet: string;
  };
}

// 怪物實例狀態
export interface MonsterInstance {
  instanceId: string; // 實例ID
  monsterId: string; // 怪物定義ID
  currentStats: MonsterStats; // 當前屬性
  position: {
    // 位置信息
    x: number;
    y: number;
    mapId: string;
  };
  state: MonsterState; // 當前狀態
  targetPlayerId?: string; // 目標玩家ID
  lastAttackTime: Date; // 最後攻擊時間
  spawnTime: Date; // 刷新時間
  statusEffects: MonsterStatusEffect[]; // 狀態效果
}

// 怪物狀態
export enum MonsterState {
  IDLE = "IDLE", // 閒置
  PATROLLING = "PATROLLING", // 巡邏
  CHASING = "CHASING", // 追擊
  ATTACKING = "ATTACKING", // 攻擊中
  FLEEING = "FLEEING", // 逃跑
  DEAD = "DEAD", // 死亡
  STUNNED = "STUNNED", // 暈眩
}

// 怪物狀態效果
export interface MonsterStatusEffect {
  effectId: string; // 效果ID
  type: string; // 效果類型 (POISON, BURN, FREEZE, etc.)
  duration: number; // 持續時間(秒)
  strength: number; // 效果強度
  appliedAt: Date; // 施加時間
  sourcePlayerId?: string; // 施加者玩家ID
}

// 戰鬥事件類型
export enum CombatEventType {
  PLAYER_ATTACK = "PLAYER_ATTACK",
  MONSTER_ATTACK = "MONSTER_ATTACK",
  PLAYER_DAMAGE = "PLAYER_DAMAGE",
  MONSTER_DAMAGE = "MONSTER_DAMAGE",
  CRITICAL_HIT = "CRITICAL_HIT",
  MISS = "MISS",
  DODGE = "DODGE",
  MONSTER_DEATH = "MONSTER_DEATH",
  PLAYER_DEATH = "PLAYER_DEATH",
  EXPERIENCE_GAIN = "EXPERIENCE_GAIN",
  LOOT_DROP = "LOOT_DROP",
}

// 戰鬥事件
export interface CombatEvent {
  id: string;
  type: CombatEventType;
  timestamp: Date;
  playerId: string;
  monsterInstanceId: string;
  damage?: number;
  healing?: number;
  experienceGained?: number;
  lootDropped?: MonsterDrop[];
  isCritical?: boolean;
  statusEffectApplied?: string;
  additionalData?: any;
}

// 戰鬥結果
export interface CombatResult {
  success: boolean; // 戰鬥是否成功
  playerVictory: boolean; // 玩家是否獲勝
  events: CombatEvent[]; // 戰鬥事件序列
  rewards?: {
    // 獎勵(如果獲勝)
    experience: number;
    combatSkillExperience: number;
    gold: number;
    items: MonsterDrop[];
    specialRewards?: any;
  };
  playerDamage?: {
    // 玩家受到的傷害
    healthLost: number;
    manaLost: number;
    statusEffects: string[];
  };
  combatDuration: number; // 戰鬥持續時間(秒)
}
