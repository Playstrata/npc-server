// 即時戰鬥系統類型定義

// 位置和向量
export interface Vector2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

// 移動狀態
export interface MovementState {
  position: Vector2D;
  velocity: Vector2D;
  direction: number; // 朝向角度 (0-359度)
  isMoving: boolean;
  speed: number;
  lastUpdateTime: Date;
}

// 攻擊狀態
export interface AttackState {
  isAttacking: boolean;
  attackType: 'MELEE' | 'RANGED' | 'MAGIC' | 'SKILL';
  attackStartTime?: Date;
  attackDuration: number; // 攻擊動作持續時間(毫秒)
  cooldownEndTime?: Date;
  targetPosition?: Vector2D;
  hitbox?: BoundingBox; // 攻擊判定框
}

// 即時戰鬥中的玩家狀態
export interface RealtimePlayerState {
  playerId: string;
  characterId: string;
  movement: MovementState;
  attack: AttackState;
  currentStats: {
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
    stamina: number;
    maxStamina: number;
  };
  combatStats: {
    physicalAttack: number;
    magicalAttack: number;
    physicalDefense: number;
    magicalDefense: number;
    attackSpeed: number; // 攻擊速度倍率
    moveSpeed: number;    // 移動速度
    attackRange: number;  // 攻擊範圍
    criticalRate: number;
    criticalDamage: number;
    accuracy: number;
    evasion: number;
  };
  statusEffects: StatusEffect[];
  lastActionTime: Date;
  isInCombat: boolean;
}

// 即時戰鬥中的怪物狀態
export interface RealtimeMonsterState {
  instanceId: string;
  monsterId: string;
  movement: MovementState;
  attack: AttackState;
  currentStats: {
    health: number;
    maxHealth: number;
    mana: number;
    maxMana: number;
  };
  combatStats: {
    physicalAttack: number;
    magicalAttack: number;
    physicalDefense: number;
    magicalDefense: number;
    attackSpeed: number;
    moveSpeed: number;
    attackRange: number;
    aggroRange: number;   // 仇恨範圍
    criticalRate: number;
    criticalDamage: number;
    accuracy: number;
    evasion: number;
  };
  ai: MonsterAIState;
  statusEffects: StatusEffect[];
  targetPlayerId?: string;
  lastActionTime: Date;
  spawnTime: Date;
}

// 怪物AI狀態
export interface MonsterAIState {
  currentBehavior: 'IDLE' | 'PATROL' | 'CHASE' | 'ATTACK' | 'FLEE' | 'RETURN';
  homePosition: Vector2D; // 怪物的原始位置
  patrolPoints: Vector2D[]; // 巡邏路線
  currentPatrolIndex: number;
  aggroList: Array<{
    playerId: string;
    aggroValue: number;
    lastSeenPosition: Vector2D;
    lastSeenTime: Date;
  }>;
  nextDecisionTime: Date;
  isAggressive: boolean;
  fleeThreshold: number; // 逃跑血量閾值
}

// 狀態效果
export interface StatusEffect {
  id: string;
  type: 'BUFF' | 'DEBUFF' | 'DOT' | 'HOT'; // DOT=持續傷害, HOT=持續治療
  name: string;
  description: string;
  duration: number; // 剩餘持續時間(毫秒)
  strength: number; // 效果強度
  tickInterval: number; // 生效間隔(毫秒)
  lastTickTime: Date;
  sourceId?: string; // 施加者ID
  stackCount: number; // 疊加層數
  maxStacks: number;
}

// 即時戰鬥事件
export enum RealtimeCombatEventType {
  PLAYER_MOVE = 'PLAYER_MOVE',
  MONSTER_MOVE = 'MONSTER_MOVE',
  PLAYER_ATTACK_START = 'PLAYER_ATTACK_START',
  PLAYER_ATTACK_HIT = 'PLAYER_ATTACK_HIT',
  PLAYER_ATTACK_MISS = 'PLAYER_ATTACK_MISS',
  MONSTER_ATTACK_START = 'MONSTER_ATTACK_START',
  MONSTER_ATTACK_HIT = 'MONSTER_ATTACK_HIT',
  MONSTER_ATTACK_MISS = 'MONSTER_ATTACK_MISS',
  DAMAGE_DEALT = 'DAMAGE_DEALT',
  HEALING_RECEIVED = 'HEALING_RECEIVED',
  STATUS_EFFECT_APPLIED = 'STATUS_EFFECT_APPLIED',
  STATUS_EFFECT_REMOVED = 'STATUS_EFFECT_REMOVED',
  CRITICAL_HIT = 'CRITICAL_HIT',
  PLAYER_DEATH = 'PLAYER_DEATH',
  MONSTER_DEATH = 'MONSTER_DEATH',
  MONSTER_SPAWN = 'MONSTER_SPAWN',
  COMBAT_START = 'COMBAT_START',
  COMBAT_END = 'COMBAT_END',
  PLAYER_LEVEL_UP = 'PLAYER_LEVEL_UP',
  ITEM_DROP = 'ITEM_DROP'
}

// 即時戰鬥事件
export interface RealtimeCombatEvent {
  id: string;
  type: RealtimeCombatEventType;
  timestamp: Date;
  mapId: string;
  playerId?: string;
  monsterInstanceId?: string;
  position?: Vector2D;
  data: {
    // 移動事件
    newPosition?: Vector2D;
    direction?: number;
    speed?: number;
    
    // 攻擊事件
    attackType?: string;
    damage?: number;
    healing?: number;
    isCritical?: boolean;
    hitPosition?: Vector2D;
    
    // 投射物相關
    projectileType?: string;
    damageType?: string;
    killedBy?: string;
    explosionRadius?: number;
    
    // 戰鬥結果
    isDodged?: boolean;
    distanceFromCenter?: number;
    
    // 狀態效果事件  
    statusEffect?: StatusEffect;
    
    // 其他數據
    experience?: number;
    gold?: number;
    items?: any[];
    additionalData?: any;
  };
}

// 碰撞檢測結果
export interface CollisionResult {
  hasCollision: boolean;
  collisionPoint?: Vector2D;
  distance: number;
}

// 攻擊判定結果
export interface AttackHitResult {
  isHit: boolean;
  isDodged: boolean;
  damage: number;
  isCritical: boolean;
  statusEffectsApplied: StatusEffect[];
  hitPosition: Vector2D;
}

// 即時戰鬥房間
export interface RealtimeCombatRoom {
  id: string;
  mapId: string;
  bounds: BoundingBox; // 地圖邊界
  players: Map<string, RealtimePlayerState>;
  monsters: Map<string, RealtimeMonsterState>;
  events: RealtimeCombatEvent[];
  lastUpdateTime: Date;
  isActive: boolean;
  maxPlayers: number;
}

// 玩家輸入動作
export interface PlayerInputAction {
  type: 'MOVE' | 'ATTACK' | 'CAST_SKILL' | 'USE_ITEM' | 'STOP';
  timestamp: Date;
  data: {
    // 移動相關
    targetPosition?: Vector2D;
    direction?: number;
    
    // 攻擊相關
    attackType?: 'MELEE' | 'RANGED' | 'MAGIC';
    targetMonsterIds?: string[];
    
    // 技能/物品相關
    skillId?: string;
    itemId?: string;
  };
}

// WebSocket 訊息類型
export enum WSMessageType {
  // 客戶端 -> 伺服器
  JOIN_COMBAT = 'JOIN_COMBAT',
  LEAVE_COMBAT = 'LEAVE_COMBAT',
  PLAYER_ACTION = 'PLAYER_ACTION',
  
  // 伺服器 -> 客戶端  
  COMBAT_STATE_UPDATE = 'COMBAT_STATE_UPDATE',
  COMBAT_EVENT = 'COMBAT_EVENT',
  PLAYER_JOINED = 'PLAYER_JOINED',
  PLAYER_LEFT = 'PLAYER_LEFT',
  ERROR = 'ERROR'
}

// WebSocket 訊息格式
export interface WSMessage {
  type: WSMessageType;
  timestamp: Date;
  data: any;
}

// 戰鬥配置
export interface CombatConfig {
  tickRate: number;        // 伺服器更新頻率 (次/秒)
  maxCombatDuration: number; // 最大戰鬥時間 (毫秒)
  playerRespawnTime: number; // 玩家復活時間 (毫秒)
  monsterRespawnTime: number; // 怪物重生時間 (毫秒)
  aggroDecayRate: number;  // 仇恨值衰減速率
  statusEffectTickInterval: number; // 狀態效果生效間隔
  movementSyncThreshold: number; // 位置同步閾值
}