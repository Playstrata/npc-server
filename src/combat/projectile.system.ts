import { Injectable } from "@nestjs/common";
import {
  Vector2D,
  BoundingBox,
  RealtimeCombatEvent,
  RealtimeCombatEventType,
} from "./realtime-combat.types";
import {
  CharacterClass,
  getClassData,
} from "../characters/character-classes.types";

// 投射物類型
export enum ProjectileType {
  // 物理投射物
  ARROW = "ARROW", // 箭矢
  THROWING_KNIFE = "THROWING_KNIFE", // 飛刀
  STONE = "STONE", // 石頭
  SPEAR = "SPEAR", // 長矛

  // 魔法投射物
  FIREBALL = "FIREBALL", // 火球術
  ICE_SHARD = "ICE_SHARD", // 冰錐術
  LIGHTNING_BOLT = "LIGHTNING_BOLT", // 閃電箭
  MAGIC_MISSILE = "MAGIC_MISSILE", // 魔法飛彈
  HEAL_ORB = "HEAL_ORB", // 治療球

  // 特殊投射物
  POISON_DART = "POISON_DART", // 毒鏢
  EXPLOSIVE_BOMB = "EXPLOSIVE_BOMB", // 爆炸彈
  CHAIN_LIGHTNING = "CHAIN_LIGHTNING", // 連鎖閃電
  HOMING_MISSILE = "HOMING_MISSILE", // 追蹤飛彈
}

// 投射物行為類型
export enum ProjectileBehavior {
  LINEAR = "LINEAR", // 直線飛行
  HOMING = "HOMING", // 追蹤目標
  PARABOLIC = "PARABOLIC", // 拋物線軌跡
  BOUNCING = "BOUNCING", // 彈跳
  PIERCING = "PIERCING", // 穿透
  EXPLOSIVE = "EXPLOSIVE", // 爆炸
}

// 投射物狀態
export interface ProjectileState {
  id: string;
  type: ProjectileType;
  behavior: ProjectileBehavior;

  // 位置和移動
  position: Vector2D;
  velocity: Vector2D;
  direction: number; // 飛行方向 (度)
  speed: number; // 飛行速度 (像素/秒)

  // 軌跡和物理
  trajectory: Vector2D[]; // 軌跡記錄
  gravity: number; // 重力影響 (拋物線用)
  bounceCount: number; // 已彈跳次數
  maxBounces: number; // 最大彈跳次數

  // 目標和追蹤
  targetId?: string; // 追蹤目標ID
  targetType: "PLAYER" | "MONSTER"; // 目標類型
  homingStrength: number; // 追蹤強度

  // 攻擊屬性
  damage: number; // 傷害值
  damageType: "PHYSICAL" | "MAGICAL" | "HEAL"; // 傷害類型
  statusEffects: Array<{
    // 狀態效果
    type: string;
    duration: number;
    strength: number;
  }>;

  // 碰撞和範圍
  hitbox: BoundingBox; // 碰撞框
  explosionRadius?: number; // 爆炸範圍
  pierceCount: number; // 已穿透次數
  maxPierces: number; // 最大穿透次數
  hitTargets: Set<string>; // 已命中的目標ID

  // 生命週期
  sourceId: string; // 發射者ID
  sourceType: "PLAYER" | "MONSTER"; // 發射者類型
  creationTime: Date; // 創建時間
  lifespan: number; // 生存時間 (毫秒)
  isActive: boolean; // 是否活躍

  // 視覺效果
  visualInfo: {
    spriteId: string; // 精靈圖ID
    scale: number; // 縮放比例
    rotation: number; // 旋轉角度
    trail: boolean; // 是否有拖尾效果
    glowEffect: boolean; // 是否有發光效果
    particleEffect?: string; // 粒子效果
  };
}

// 投射物定義模板
export interface ProjectileDefinition {
  type: ProjectileType;
  behavior: ProjectileBehavior;

  // 基礎屬性
  baseSpeed: number; // 基礎速度
  baseLifespan: number; // 基礎生存時間
  baseDamage: number; // 基礎傷害

  // 物理屬性
  gravity: number; // 重力系數
  maxBounces: number; // 最大彈跳次數
  maxPierces: number; // 最大穿透次數

  // 特殊屬性
  explosionRadius?: number; // 爆炸半徑
  homingStrength?: number; // 追蹤強度
  chainCount?: number; // 連鎖次數

  // 視覺設定
  visualInfo: {
    spriteId: string;
    scale: number;
    hasTrail: boolean;
    hasGlow: boolean;
    particleEffect?: string;
  };

  // 音效設定
  soundEffects: {
    launch?: string; // 發射音效
    flight?: string; // 飛行音效
    hit?: string; // 命中音效
    explosion?: string; // 爆炸音效
  };
}

// 弓箭手攻擊參數
export interface ArcherAttackParams {
  characterClass: CharacterClass;
  dexterity: number;
  level: number;
  weaponType: string;
  weaponQuality?: string;
  attackerPosition: Vector2D;
  targetPosition: Vector2D;
}

// 射程計算結果
export interface RangeCalculationResult {
  maxRange: number; // 最大射程
  effectiveRange: number; // 有效射程
  distance: number; // 實際距離
  isInRange: boolean; // 是否在射程內
  accuracyModifier: number; // 精準度修正
  damageModifier: number; // 傷害修正
  rangeCategory: "CLOSE" | "EFFECTIVE" | "LONG" | "EXTREME" | "OUT_OF_RANGE";
}

// 武器射程配置
export interface WeaponRangeConfig {
  baseRange: number; // 基礎射程
  dexterityMultiplier: number; // 敏捷倍數
  classBonus: number; // 職業加成
  qualityBonus: number; // 品質加成
  accuracyFalloff: number; // 精準度衰減
  damageFalloff: number; // 傷害衰減
}

@Injectable()
export class ProjectileSystem {
  private projectiles: Map<string, ProjectileState> = new Map();
  private projectileDefinitions: Map<ProjectileType, ProjectileDefinition> =
    new Map();
  private weaponRangeConfigs: Map<string, WeaponRangeConfig> = new Map();

  constructor() {
    this.initializeProjectileDefinitions();
    this.initializeWeaponRangeConfigs();
  }

  /**
   * 創建投射物
   */
  createProjectile(
    type: ProjectileType,
    sourceId: string,
    sourceType: "PLAYER" | "MONSTER",
    startPosition: Vector2D,
    targetPosition: Vector2D,
    damage: number,
    targetId?: string,
    targetType?: "PLAYER" | "MONSTER",
  ): ProjectileState {
    const definition = this.projectileDefinitions.get(type);
    if (!definition) {
      throw new Error(`未找到投射物定義: ${type}`);
    }

    const direction = this.calculateDirection(startPosition, targetPosition);
    const velocity = this.calculateVelocity(direction, definition.baseSpeed);

    const projectile: ProjectileState = {
      id: this.generateProjectileId(),
      type,
      behavior: definition.behavior,

      position: { ...startPosition },
      velocity,
      direction,
      speed: definition.baseSpeed,

      trajectory: [{ ...startPosition }],
      gravity: definition.gravity,
      bounceCount: 0,
      maxBounces: definition.maxBounces,

      targetId,
      targetType: targetType || "MONSTER",
      homingStrength: definition.homingStrength || 0,

      damage,
      damageType: this.getDamageType(type),
      statusEffects: this.getStatusEffects(type),

      hitbox: this.calculateHitbox(startPosition, type),
      explosionRadius: definition.explosionRadius,
      pierceCount: 0,
      maxPierces: definition.maxPierces,
      hitTargets: new Set(),

      sourceId,
      sourceType,
      creationTime: new Date(),
      lifespan: definition.baseLifespan,
      isActive: true,

      visualInfo: {
        spriteId: definition.visualInfo.spriteId,
        scale: definition.visualInfo.scale,
        rotation: direction,
        trail: definition.visualInfo.hasTrail,
        glowEffect: definition.visualInfo.hasGlow,
        particleEffect: definition.visualInfo.particleEffect,
      },
    };

    this.projectiles.set(projectile.id, projectile);
    return projectile;
  }

  /**
   * 創建弓箭手投射物（包含射程驗證）
   */
  createArcherProjectile(
    archerParams: ArcherAttackParams,
    damage: number,
    targetId?: string,
    targetType?: "PLAYER" | "MONSTER",
  ): {
    projectile?: ProjectileState;
    rangeResult: RangeCalculationResult;
    error?: string;
  } {
    // 計算射程
    const rangeResult = this.calculateArcherRange(archerParams);

    // 檢查是否在射程內
    if (!rangeResult.isInRange) {
      return {
        rangeResult,
        error: `目標超出射程範圍 (距離: ${Math.round(rangeResult.distance)}，最大射程: ${Math.round(rangeResult.maxRange)})`,
      };
    }

    // 根據距離調整傷害
    const adjustedDamage = Math.round(damage * rangeResult.damageModifier);

    // 決定箭矢類型（可根據武器和距離變化）
    const projectileType = this.determineArrowType(archerParams, rangeResult);

    // 創建投射物
    const projectile = this.createProjectile(
      projectileType,
      `archer_${archerParams.level}`, // sourceId placeholder
      "PLAYER",
      archerParams.attackerPosition,
      archerParams.targetPosition,
      adjustedDamage,
      targetId,
      targetType,
    );

    // 應用弓箭手特殊屬性
    this.applyArcherModifications(projectile, archerParams, rangeResult);

    return { projectile, rangeResult };
  }

  /**
   * 計算弓箭手射程
   */
  calculateArcherRange(params: ArcherAttackParams): RangeCalculationResult {
    const distance = this.getDistance(
      params.attackerPosition,
      params.targetPosition,
    );
    const weaponConfig = this.getWeaponRangeConfig(params.weaponType);
    const classData = getClassData(params.characterClass);

    // 計算最大射程
    let maxRange = weaponConfig.baseRange;

    // 敏捷加成
    maxRange += params.dexterity * weaponConfig.dexterityMultiplier;

    // 職業加成（弓箭手有額外加成）
    if (params.characterClass === CharacterClass.ARCHER) {
      maxRange *= 1 + weaponConfig.classBonus;
    }

    // 等級加成
    maxRange += params.level * 2;

    // 武器品質加成
    if (params.weaponQuality) {
      const qualityMultiplier = this.getQualityMultiplier(params.weaponQuality);
      maxRange *= qualityMultiplier;
    }

    // 計算有效射程（80%的最大射程）
    const effectiveRange = maxRange * 0.8;

    // 確定距離分類
    let rangeCategory: RangeCalculationResult["rangeCategory"];
    let accuracyModifier = 1.0;
    let damageModifier = 1.0;

    if (distance > maxRange) {
      rangeCategory = "OUT_OF_RANGE";
      accuracyModifier = 0;
      damageModifier = 0;
    } else if (distance <= effectiveRange * 0.3) {
      rangeCategory = "CLOSE";
      accuracyModifier = 1.1; // 近距離精準度加成
      damageModifier = 1.0;
    } else if (distance <= effectiveRange) {
      rangeCategory = "EFFECTIVE";
      accuracyModifier = 1.0;
      damageModifier = 1.0;
    } else if (distance <= maxRange * 0.9) {
      rangeCategory = "LONG";
      const falloffRatio =
        (distance - effectiveRange) / (maxRange * 0.9 - effectiveRange);
      accuracyModifier = 1.0 - falloffRatio * weaponConfig.accuracyFalloff;
      damageModifier = 1.0 - falloffRatio * weaponConfig.damageFalloff;
    } else {
      rangeCategory = "EXTREME";
      const falloffRatio = (distance - maxRange * 0.9) / (maxRange * 0.1);
      accuracyModifier =
        (1.0 - weaponConfig.accuracyFalloff) * (1.0 - falloffRatio * 0.5);
      damageModifier =
        (1.0 - weaponConfig.damageFalloff) * (1.0 - falloffRatio * 0.3);
    }

    return {
      maxRange,
      effectiveRange,
      distance,
      isInRange: distance <= maxRange,
      accuracyModifier: Math.max(0, accuracyModifier),
      damageModifier: Math.max(0, damageModifier),
      rangeCategory,
    };
  }

  /**
   * 獲取武器射程配置
   */
  private getWeaponRangeConfig(weaponType: string): WeaponRangeConfig {
    return (
      this.weaponRangeConfigs.get(weaponType) || {
        baseRange: 200,
        dexterityMultiplier: 3.0,
        classBonus: 0.3,
        qualityBonus: 0.2,
        accuracyFalloff: 0.4,
        damageFalloff: 0.3,
      }
    );
  }

  /**
   * 確定箭矢類型
   */
  private determineArrowType(
    params: ArcherAttackParams,
    rangeResult: RangeCalculationResult,
  ): ProjectileType {
    // 根據距離和武器類型決定箭矢類型
    if (
      rangeResult.rangeCategory === "EXTREME" ||
      rangeResult.rangeCategory === "LONG"
    ) {
      return ProjectileType.ARROW; // 長距離使用普通箭
    }

    // 可以根據武器類型添加更多箭矢類型
    switch (params.weaponType) {
      case "weapon-short-bow":
      case "weapon-hunting-bow":
        return ProjectileType.ARROW;
      case "weapon-crossbow":
        return ProjectileType.SPEAR; // 弩箭可以用長矛類型表示
      default:
        return ProjectileType.ARROW;
    }
  }

  /**
   * 應用弓箭手修正
   */
  private applyArcherModifications(
    projectile: ProjectileState,
    params: ArcherAttackParams,
    rangeResult: RangeCalculationResult,
  ): void {
    // 根據射程調整飛行速度
    if (
      rangeResult.rangeCategory === "LONG" ||
      rangeResult.rangeCategory === "EXTREME"
    ) {
      projectile.speed *= 1.2; // 長距離攻擊提高飛行速度
      projectile.velocity.x *= 1.2;
      projectile.velocity.y *= 1.2;
    }

    // 弓箭手特殊能力加成
    const classData = getClassData(params.characterClass);
    if (classData.specialAbilities.hasRangedCombatBonus) {
      projectile.damage *= 1.15; // 15% 遠程攻擊加成
    }

    if (classData.specialAbilities.hasEnhancedCritical) {
      // 增加爆擊相關的狀態效果（如果需要的話）
      // 這裡可以添加爆擊率提升的邏輯
    }

    // 根據敏捷調整精準度（通過減小碰撞框表示）
    const dexterityBonus = Math.max(0, (params.dexterity - 10) * 0.1);
    const sizeReduction = Math.min(0.3, dexterityBonus * 0.05);
    projectile.hitbox.width *= 1 - sizeReduction;
    projectile.hitbox.height *= 1 - sizeReduction;
  }

  /**
   * 獲取品質倍數
   */
  private getQualityMultiplier(quality: string): number {
    const qualityMultipliers = {
      POOR: 0.8,
      COMMON: 1.0,
      UNCOMMON: 1.1,
      RARE: 1.25,
      EPIC: 1.4,
      LEGENDARY: 1.6,
      ARTIFACT: 2.0,
    };
    return qualityMultipliers[quality] || 1.0;
  }

  /**
   * 更新所有投射物
   */
  updateProjectiles(
    deltaTime: number,
    mapBounds: BoundingBox,
    players: Map<string, any>,
    monsters: Map<string, any>,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];
    const currentTime = new Date();

    for (const [projectileId, projectile] of this.projectiles) {
      if (!projectile.isActive) continue;

      // 檢查生存時間
      if (
        currentTime.getTime() - projectile.creationTime.getTime() >
        projectile.lifespan
      ) {
        projectile.isActive = false;
        continue;
      }

      // 更新投射物行為
      const behaviorEvents = this.updateProjectileBehavior(
        projectile,
        deltaTime,
        players,
        monsters,
      );
      events.push(...behaviorEvents);

      // 更新位置
      this.updateProjectilePosition(projectile, deltaTime, mapBounds);

      // 碰撞檢測
      const collisionEvents = this.checkProjectileCollisions(
        projectile,
        players,
        monsters,
        currentTime,
      );
      events.push(...collisionEvents);

      // 如果投射物不活躍，標記為移除
      if (!projectile.isActive) {
        this.projectiles.delete(projectileId);
      }
    }

    return events;
  }

  /**
   * 更新投射物行為
   */
  private updateProjectileBehavior(
    projectile: ProjectileState,
    deltaTime: number,
    players: Map<string, any>,
    monsters: Map<string, any>,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    switch (projectile.behavior) {
      case ProjectileBehavior.LINEAR:
        // 直線飛行，無需特殊處理
        break;

      case ProjectileBehavior.HOMING:
        const homingEvents = this.updateHomingBehavior(
          projectile,
          players,
          monsters,
        );
        events.push(...homingEvents);
        break;

      case ProjectileBehavior.PARABOLIC:
        this.updateParabolicBehavior(projectile, deltaTime);
        break;

      case ProjectileBehavior.BOUNCING:
        // 彈跳邏輯在碰撞檢測中處理
        break;

      case ProjectileBehavior.PIERCING:
        // 穿透邏輯在碰撞檢測中處理
        break;

      case ProjectileBehavior.EXPLOSIVE:
        // 爆炸邏輯在碰撞檢測中處理
        break;
    }

    return events;
  }

  /**
   * 更新追蹤行為
   */
  private updateHomingBehavior(
    projectile: ProjectileState,
    players: Map<string, any>,
    monsters: Map<string, any>,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    if (!projectile.targetId || projectile.homingStrength <= 0) {
      return events;
    }

    // 找到目標
    let target: any = null;
    if (projectile.targetType === "PLAYER") {
      target = players.get(projectile.targetId);
    } else {
      target = monsters.get(projectile.targetId);
    }

    if (!target) return events; // 目標不存在

    // 計算目標方向
    const targetPosition = target.movement?.position || target.position;
    const toTarget = {
      x: targetPosition.x - projectile.position.x,
      y: targetPosition.y - projectile.position.y,
    };

    const distance = Math.sqrt(
      toTarget.x * toTarget.x + toTarget.y * toTarget.y,
    );
    if (distance === 0) return events;

    // 正規化目標方向
    const targetDirection = {
      x: toTarget.x / distance,
      y: toTarget.y / distance,
    };

    // 應用追蹤力
    const homingStrength =
      projectile.homingStrength * (1 / (distance * 0.01 + 1)); // 距離越近追蹤越強
    projectile.velocity.x += targetDirection.x * homingStrength;
    projectile.velocity.y += targetDirection.y * homingStrength;

    // 限制速度
    const currentSpeed = Math.sqrt(
      projectile.velocity.x * projectile.velocity.x +
        projectile.velocity.y * projectile.velocity.y,
    );

    if (currentSpeed > projectile.speed) {
      projectile.velocity.x =
        (projectile.velocity.x / currentSpeed) * projectile.speed;
      projectile.velocity.y =
        (projectile.velocity.y / currentSpeed) * projectile.speed;
    }

    // 更新方向
    projectile.direction =
      Math.atan2(projectile.velocity.y, projectile.velocity.x) *
      (180 / Math.PI);
    projectile.visualInfo.rotation = projectile.direction;

    return events;
  }

  /**
   * 更新拋物線行為
   */
  private updateParabolicBehavior(
    projectile: ProjectileState,
    deltaTime: number,
  ): void {
    // 應用重力
    projectile.velocity.y += projectile.gravity * (deltaTime / 1000);

    // 更新方向
    projectile.direction =
      Math.atan2(projectile.velocity.y, projectile.velocity.x) *
      (180 / Math.PI);
    projectile.visualInfo.rotation = projectile.direction;
  }

  /**
   * 更新投射物位置
   */
  private updateProjectilePosition(
    projectile: ProjectileState,
    deltaTime: number,
    mapBounds: BoundingBox,
  ): void {
    // 更新位置
    projectile.position.x += projectile.velocity.x * (deltaTime / 1000);
    projectile.position.y += projectile.velocity.y * (deltaTime / 1000);

    // 記錄軌跡
    projectile.trajectory.push({ ...projectile.position });

    // 限制軌跡記錄數量
    if (projectile.trajectory.length > 100) {
      projectile.trajectory.shift();
    }

    // 更新碰撞框
    projectile.hitbox.x = projectile.position.x - projectile.hitbox.width / 2;
    projectile.hitbox.y = projectile.position.y - projectile.hitbox.height / 2;

    // 邊界檢查
    if (!this.isPositionInBounds(projectile.position, mapBounds)) {
      if (
        projectile.behavior === ProjectileBehavior.BOUNCING &&
        projectile.bounceCount < projectile.maxBounces
      ) {
        this.handleBounce(projectile, mapBounds);
        projectile.bounceCount++;
      } else {
        projectile.isActive = false;
      }
    }
  }

  /**
   * 檢查投射物碰撞
   */
  private checkProjectileCollisions(
    projectile: ProjectileState,
    players: Map<string, any>,
    monsters: Map<string, any>,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    // 檢查與目標的碰撞
    const targets = projectile.sourceType === "PLAYER" ? monsters : players;

    for (const [targetId, target] of targets) {
      if (projectile.hitTargets.has(targetId)) continue; // 已命中過
      if (target.currentStats?.health <= 0) continue; // 目標已死亡

      const targetBoundingBox = this.getEntityBoundingBox(target);
      const collision = this.checkBoundingBoxCollision(
        projectile.hitbox,
        targetBoundingBox,
      );

      if (collision.hasCollision) {
        // 處理命中
        const hitEvents = this.handleProjectileHit(
          projectile,
          targetId,
          target,
          currentTime,
        );
        events.push(...hitEvents);

        // 標記已命中
        projectile.hitTargets.add(targetId);

        // 根據行為決定是否繼續飛行
        if (projectile.behavior === ProjectileBehavior.PIERCING) {
          projectile.pierceCount++;
          if (projectile.pierceCount >= projectile.maxPierces) {
            projectile.isActive = false;
          }
        } else if (projectile.behavior === ProjectileBehavior.EXPLOSIVE) {
          // 爆炸攻擊
          const explosionEvents = this.handleExplosion(
            projectile,
            players,
            monsters,
            currentTime,
          );
          events.push(...explosionEvents);
          projectile.isActive = false;
        } else {
          // 普通攻擊，命中後消失
          projectile.isActive = false;
        }

        break; // 一次只處理一個碰撞
      }
    }

    return events;
  }

  /**
   * 處理投射物命中
   */
  private handleProjectileHit(
    projectile: ProjectileState,
    targetId: string,
    target: any,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    // 計算最終傷害
    const finalDamage = this.calculateProjectileDamage(projectile, target);

    if (projectile.damageType === "HEAL") {
      // 治療效果
      target.currentStats.health = Math.min(
        target.currentStats.maxHealth,
        target.currentStats.health + finalDamage,
      );

      events.push({
        id: this.generateEventId(),
        type: RealtimeCombatEventType.HEALING_RECEIVED,
        timestamp: currentTime,
        mapId: "current-map", // TODO: 從房間獲取
        [projectile.sourceType === "PLAYER" ? "playerId" : "monsterInstanceId"]:
          projectile.sourceId,
        [projectile.targetType === "PLAYER" ? "playerId" : "monsterInstanceId"]:
          targetId,
        position: projectile.position,
        data: {
          healing: finalDamage,
          projectileType: projectile.type,
        },
      });
    } else {
      // 傷害效果
      target.currentStats.health = Math.max(
        0,
        target.currentStats.health - finalDamage,
      );

      events.push({
        id: this.generateEventId(),
        type: RealtimeCombatEventType.DAMAGE_DEALT,
        timestamp: currentTime,
        mapId: "current-map",
        [projectile.sourceType === "PLAYER" ? "playerId" : "monsterInstanceId"]:
          projectile.sourceId,
        [projectile.targetType === "PLAYER" ? "playerId" : "monsterInstanceId"]:
          targetId,
        position: projectile.position,
        data: {
          damage: finalDamage,
          damageType: projectile.damageType,
          projectileType: projectile.type,
          isCritical: false, // TODO: 實作爆擊計算
        },
      });

      // 檢查目標是否死亡
      if (target.currentStats.health <= 0) {
        const deathEventType =
          projectile.targetType === "PLAYER"
            ? RealtimeCombatEventType.PLAYER_DEATH
            : RealtimeCombatEventType.MONSTER_DEATH;

        events.push({
          id: this.generateEventId(),
          type: deathEventType,
          timestamp: currentTime,
          mapId: "current-map",
          [projectile.sourceType === "PLAYER"
            ? "playerId"
            : "monsterInstanceId"]: projectile.sourceId,
          [projectile.targetType === "PLAYER"
            ? "playerId"
            : "monsterInstanceId"]: targetId,
          position: target.movement?.position || target.position,
          data: { killedBy: projectile.type },
        });
      }
    }

    // 應用狀態效果
    if (projectile.statusEffects.length > 0) {
      // TODO: 實作狀態效果應用
      for (const effect of projectile.statusEffects) {
        // 創建完整的 StatusEffect 對象
        const fullStatusEffect = {
          id: this.generateEventId(),
          type: effect.type.includes("HEAL")
            ? "HOT"
            : ("DEBUFF" as "BUFF" | "DEBUFF" | "DOT" | "HOT"),
          name: effect.type,
          description: `由 ${projectile.type} 造成的 ${effect.type} 效果`,
          duration: effect.duration,
          strength: effect.strength,
          tickInterval: 1000, // 1秒間隔
          lastTickTime: new Date(),
          sourceId: projectile.sourceId,
          stackCount: 1,
          maxStacks: 5, // 默認最大疊加層數
        };

        events.push({
          id: this.generateEventId(),
          type: RealtimeCombatEventType.STATUS_EFFECT_APPLIED,
          timestamp: currentTime,
          mapId: "current-map",
          [projectile.targetType === "PLAYER"
            ? "playerId"
            : "monsterInstanceId"]: targetId,
          position: projectile.position,
          data: { statusEffect: fullStatusEffect },
        });
      }
    }

    return events;
  }

  /**
   * 處理爆炸效果
   */
  private handleExplosion(
    projectile: ProjectileState,
    players: Map<string, any>,
    monsters: Map<string, any>,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    if (!projectile.explosionRadius) return events;

    // 爆炸範圍內的所有目標
    const allTargets = new Map([...players, ...monsters]);

    for (const [targetId, target] of allTargets) {
      if (targetId === projectile.sourceId) continue; // 不傷害自己
      if (target.currentStats?.health <= 0) continue; // 跳過死亡目標

      const targetPos = target.movement?.position || target.position;
      const distance = this.getDistance(projectile.position, targetPos);

      if (distance <= projectile.explosionRadius) {
        // 計算距離衰減傷害
        const damageMultiplier = Math.max(
          0.3,
          1 - distance / projectile.explosionRadius,
        );
        const explosionDamage = Math.round(
          projectile.damage * damageMultiplier,
        );

        // 造成傷害
        target.currentStats.health = Math.max(
          0,
          target.currentStats.health - explosionDamage,
        );

        events.push({
          id: this.generateEventId(),
          type: RealtimeCombatEventType.DAMAGE_DEALT,
          timestamp: currentTime,
          mapId: "current-map",
          [projectile.sourceType === "PLAYER"
            ? "playerId"
            : "monsterInstanceId"]: projectile.sourceId,
          position: projectile.position,
          data: {
            damage: explosionDamage,
            damageType: projectile.damageType,
            explosionRadius: projectile.explosionRadius,
            distanceFromCenter: distance,
          },
        });
      }
    }

    return events;
  }

  // ===================
  // 輔助方法
  // ===================

  private initializeProjectileDefinitions(): void {
    // 物理投射物
    this.projectileDefinitions.set(ProjectileType.ARROW, {
      type: ProjectileType.ARROW,
      behavior: ProjectileBehavior.LINEAR,
      baseSpeed: 400,
      baseLifespan: 3000,
      baseDamage: 25,
      gravity: 0,
      maxBounces: 0,
      maxPierces: 0,
      visualInfo: {
        spriteId: "arrow",
        scale: 1.0,
        hasTrail: true,
        hasGlow: false,
      },
      soundEffects: {
        launch: "arrow_shoot",
        hit: "arrow_hit",
      },
    });

    this.projectileDefinitions.set(ProjectileType.FIREBALL, {
      type: ProjectileType.FIREBALL,
      behavior: ProjectileBehavior.EXPLOSIVE,
      baseSpeed: 300,
      baseLifespan: 4000,
      baseDamage: 50,
      gravity: 0,
      maxBounces: 0,
      maxPierces: 0,
      explosionRadius: 80,
      visualInfo: {
        spriteId: "fireball",
        scale: 1.2,
        hasTrail: true,
        hasGlow: true,
        particleEffect: "fire_trail",
      },
      soundEffects: {
        launch: "fireball_cast",
        flight: "fire_whoosh",
        explosion: "fire_explosion",
      },
    });

    // TODO: 添加更多投射物定義
  }

  /**
   * 初始化武器射程配置
   */
  private initializeWeaponRangeConfigs(): void {
    // 短弓 - 基礎弓箭
    this.weaponRangeConfigs.set("weapon-short-bow", {
      baseRange: 180,
      dexterityMultiplier: 2.5,
      classBonus: 0.3, // 弓箭手30%加成
      qualityBonus: 0.15,
      accuracyFalloff: 0.35,
      damageFalloff: 0.25,
    });

    // 獵弓 - 中級弓箭
    this.weaponRangeConfigs.set("weapon-hunting-bow", {
      baseRange: 220,
      dexterityMultiplier: 3.0,
      classBonus: 0.35,
      qualityBonus: 0.2,
      accuracyFalloff: 0.3,
      damageFalloff: 0.2,
    });

    // 長弓 - 高級弓箭
    this.weaponRangeConfigs.set("weapon-long-bow", {
      baseRange: 280,
      dexterityMultiplier: 3.5,
      classBonus: 0.4,
      qualityBonus: 0.25,
      accuracyFalloff: 0.25,
      damageFalloff: 0.15,
    });

    // 弩弓 - 特殊遠程武器
    this.weaponRangeConfigs.set("weapon-crossbow", {
      baseRange: 200,
      dexterityMultiplier: 2.0, // 弩弓對敏捷依賴較低
      classBonus: 0.2,
      qualityBonus: 0.3,
      accuracyFalloff: 0.2, // 弩弓精準度較穩定
      damageFalloff: 0.1, // 弩箭穿透力較強
    });

    // 投擲武器
    this.weaponRangeConfigs.set("weapon-throwing-knife", {
      baseRange: 80,
      dexterityMultiplier: 1.5,
      classBonus: 0.25,
      qualityBonus: 0.1,
      accuracyFalloff: 0.5,
      damageFalloff: 0.4,
    });

    this.weaponRangeConfigs.set("weapon-javelin", {
      baseRange: 120,
      dexterityMultiplier: 2.0,
      classBonus: 0.3,
      qualityBonus: 0.15,
      accuracyFalloff: 0.4,
      damageFalloff: 0.3,
    });
  }

  private calculateDirection(from: Vector2D, to: Vector2D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  private calculateVelocity(direction: number, speed: number): Vector2D {
    const radians = direction * (Math.PI / 180);
    return {
      x: Math.cos(radians) * speed,
      y: Math.sin(radians) * speed,
    };
  }

  private calculateHitbox(
    position: Vector2D,
    type: ProjectileType,
  ): BoundingBox {
    let size = 8; // 默認大小

    switch (type) {
      case ProjectileType.ARROW:
        size = 4;
        break;
      case ProjectileType.FIREBALL:
        size = 12;
        break;
      case ProjectileType.EXPLOSIVE_BOMB:
        size = 16;
        break;
    }

    return {
      x: position.x - size / 2,
      y: position.y - size / 2,
      width: size,
      height: size,
    };
  }

  private getDamageType(type: ProjectileType): "PHYSICAL" | "MAGICAL" | "HEAL" {
    switch (type) {
      case ProjectileType.ARROW:
      case ProjectileType.THROWING_KNIFE:
      case ProjectileType.STONE:
      case ProjectileType.SPEAR:
        return "PHYSICAL";

      case ProjectileType.HEAL_ORB:
        return "HEAL";

      default:
        return "MAGICAL";
    }
  }

  private getStatusEffects(type: ProjectileType): any[] {
    switch (type) {
      case ProjectileType.POISON_DART:
        return [
          {
            type: "POISON",
            duration: 5000,
            strength: 5,
          },
        ];

      case ProjectileType.ICE_SHARD:
        return [
          {
            type: "SLOW",
            duration: 3000,
            strength: 0.5,
          },
        ];

      default:
        return [];
    }
  }

  private generateProjectileId(): string {
    return `projectile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private isPositionInBounds(position: Vector2D, bounds: BoundingBox): boolean {
    return (
      position.x >= bounds.x &&
      position.x <= bounds.x + bounds.width &&
      position.y >= bounds.y &&
      position.y <= bounds.y + bounds.height
    );
  }

  private getDistance(point1: Vector2D, point2: Vector2D): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private checkBoundingBoxCollision(
    box1: BoundingBox,
    box2: BoundingBox,
  ): { hasCollision: boolean } {
    return {
      hasCollision:
        box1.x < box2.x + box2.width &&
        box1.x + box1.width > box2.x &&
        box1.y < box2.y + box2.height &&
        box1.y + box1.height > box2.y,
    };
  }

  private getEntityBoundingBox(entity: any): BoundingBox {
    const pos = entity.movement?.position || entity.position;
    const size = 32; // 假設實體大小
    return {
      x: pos.x - size / 2,
      y: pos.y - size / 2,
      width: size,
      height: size,
    };
  }

  private handleBounce(
    projectile: ProjectileState,
    mapBounds: BoundingBox,
  ): void {
    // 牆壁彈跳邏輯
    if (
      projectile.position.x <= mapBounds.x ||
      projectile.position.x >= mapBounds.x + mapBounds.width
    ) {
      projectile.velocity.x = -projectile.velocity.x;
    }

    if (
      projectile.position.y <= mapBounds.y ||
      projectile.position.y >= mapBounds.y + mapBounds.height
    ) {
      projectile.velocity.y = -projectile.velocity.y;
    }

    // 更新方向
    projectile.direction =
      Math.atan2(projectile.velocity.y, projectile.velocity.x) *
      (180 / Math.PI);
    projectile.visualInfo.rotation = projectile.direction;
  }

  private calculateProjectileDamage(
    projectile: ProjectileState,
    target: any,
  ): number {
    // TODO: 實作複雜的傷害計算，考慮目標防禦等
    return projectile.damage;
  }

  /**
   * 獲取所有活躍投射物 (用於客戶端同步)
   */
  getActiveProjectiles(): ProjectileState[] {
    return Array.from(this.projectiles.values()).filter((p) => p.isActive);
  }

  /**
   * 清理非活躍投射物
   */
  cleanupInactiveProjectiles(): void {
    for (const [id, projectile] of this.projectiles) {
      if (!projectile.isActive) {
        this.projectiles.delete(id);
      }
    }
  }

  /**
   * 獲取弓箭手射程信息（用於UI顯示）
   */
  getArcherRangeInfo(
    characterClass: CharacterClass,
    dexterity: number,
    level: number,
    weaponType: string,
    weaponQuality?: string,
  ): { maxRange: number; effectiveRange: number; weaponName: string } {
    const dummyParams: ArcherAttackParams = {
      characterClass,
      dexterity,
      level,
      weaponType,
      weaponQuality,
      attackerPosition: { x: 0, y: 0 },
      targetPosition: { x: 0, y: 0 },
    };

    const weaponConfig = this.getWeaponRangeConfig(weaponType);

    // 計算最大射程
    let maxRange = weaponConfig.baseRange;
    maxRange += dexterity * weaponConfig.dexterityMultiplier;

    if (characterClass === CharacterClass.ARCHER) {
      maxRange *= 1 + weaponConfig.classBonus;
    }

    maxRange += level * 2;

    if (weaponQuality) {
      maxRange *= this.getQualityMultiplier(weaponQuality);
    }

    const effectiveRange = maxRange * 0.8;

    // 武器名稱映射
    const weaponNames = {
      "weapon-short-bow": "短弓",
      "weapon-hunting-bow": "獵弓",
      "weapon-long-bow": "長弓",
      "weapon-crossbow": "弩弓",
      "weapon-throwing-knife": "飛刀",
      "weapon-javelin": "標槍",
    };

    return {
      maxRange: Math.round(maxRange),
      effectiveRange: Math.round(effectiveRange),
      weaponName: weaponNames[weaponType] || "未知武器",
    };
  }

  /**
   * 檢查目標是否在射程內（用於戰鬥前驗證）
   */
  isTargetInRange(archerParams: ArcherAttackParams): {
    inRange: boolean;
    distance: number;
    maxRange: number;
    rangeCategory: string;
  } {
    const rangeResult = this.calculateArcherRange(archerParams);

    return {
      inRange: rangeResult.isInRange,
      distance: Math.round(rangeResult.distance),
      maxRange: Math.round(rangeResult.maxRange),
      rangeCategory: rangeResult.rangeCategory,
    };
  }
}
