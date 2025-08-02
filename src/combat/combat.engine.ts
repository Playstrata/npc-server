import { Injectable } from "@nestjs/common";
import {
  MonsterDefinition,
  MonsterInstance,
  CombatResult,
  CombatEvent,
  CombatEventType,
  MonsterStats,
  MonsterState,
} from "./monsters.types";
import {
  CharacterClass,
  getClassData,
} from "../characters/character-classes.types";

// 玩家戰鬥屬性接口
export interface PlayerCombatStats {
  characterId: string;
  level: number;
  characterClass: CharacterClass;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  // 基礎屬性
  strength: number;
  dexterity: number;
  intelligence: number;
  stamina: number;
  // 隱藏屬性
  luckPercentage: number;
  // 計算後的戰鬥屬性
  physicalAttack: number;
  magicalAttack: number;
  physicalDefense: number;
  magicalDefense: number;
  criticalRate: number;
  criticalDamage: number;
  accuracy: number;
  evasion: number;
  // 裝備加成
  weaponDamage?: number;
  armorDefense?: number;
  equipmentBonuses?: Record<string, number>;
}

// 傷害計算結果
export interface DamageCalculation {
  baseDamage: number;
  finalDamage: number;
  isCritical: boolean;
  damageType: "PHYSICAL" | "MAGICAL";
  resistanceReduction: number;
  luckModifier: number;
  additionalEffects?: string[];
}

// 命中檢查結果
export interface HitCheckResult {
  isHit: boolean;
  isDodged: boolean;
  hitChance: number;
  dodgeChance: number;
  luckInfluence: number;
}

@Injectable()
export class CombatEngine {
  /**
   * 計算玩家的戰鬥屬性
   */
  calculatePlayerCombatStats(character: any): PlayerCombatStats {
    const classData = getClassData(character.characterClass);

    // 基礎戰鬥屬性計算
    const physicalAttack = this.calculatePhysicalAttack(
      character.strength,
      character.level,
      classData.growthRates.physicalAttackPerLevel,
      character.equippedWeapon,
    );

    const magicalAttack = this.calculateMagicalAttack(
      character.intelligence,
      character.level,
      classData.growthRates.magicalAttackPerLevel,
      character.equippedWeapon,
    );

    const physicalDefense = this.calculatePhysicalDefense(
      character.stamina,
      character.level,
      classData.growthRates.physicalDefensePerLevel,
      character, // 整個角色資料，包含裝備
    );

    const magicalDefense = this.calculateMagicalDefense(
      character.intelligence,
      character.level,
      classData.growthRates.magicalDefensePerLevel,
      character, // 整個角色資料，包含裝備
    );

    // 命中與閃避
    const accuracy = this.calculateAccuracy(
      character.dexterity,
      character.level,
    );
    const evasion = this.calculateEvasion(
      character.dexterity,
      character.luckPercentage,
    );

    // 爆擊率與爆擊傷害
    const criticalRate = this.calculateCriticalRate(
      character.dexterity,
      character.luckPercentage,
      classData.specialAbilities.hasEnhancedCritical,
    );

    const criticalDamage = this.calculateCriticalDamage(
      character.characterClass,
      character.luckPercentage,
    );

    return {
      characterId: character.id,
      level: character.level,
      characterClass: character.characterClass,
      health: character.health,
      maxHealth: character.maxHealth,
      mana: character.mana,
      maxMana: character.maxMana,
      strength: character.strength,
      dexterity: character.dexterity,
      intelligence: character.intelligence,
      stamina: character.stamina,
      luckPercentage: character.luckPercentage,
      physicalAttack,
      magicalAttack,
      physicalDefense,
      magicalDefense,
      criticalRate,
      criticalDamage,
      accuracy,
      evasion,
    };
  }

  /**
   * 執行戰鬥回合
   */
  async executeCombatRound(
    player: PlayerCombatStats,
    monster: MonsterInstance,
    monsterDef: MonsterDefinition,
    playerAction: "ATTACK" | "MAGIC" | "DEFEND" | "FLEE",
  ): Promise<{ events: CombatEvent[]; combatContinues: boolean }> {
    const events: CombatEvent[] = [];
    let combatContinues = true;

    // 1. 玩家行動
    switch (playerAction) {
      case "ATTACK":
        const playerAttackEvents = await this.executePlayerAttack(
          player,
          monster,
          monsterDef,
        );
        events.push(...playerAttackEvents);
        break;
      case "MAGIC":
        const playerMagicEvents = await this.executePlayerMagic(
          player,
          monster,
          monsterDef,
        );
        events.push(...playerMagicEvents);
        break;
      case "DEFEND":
        // 防禦回合，提升防禦力但不攻擊
        break;
      case "FLEE":
        const fleeSuccess = this.calculateFleeChance(player, monster);
        if (fleeSuccess) {
          combatContinues = false;
          events.push({
            id: this.generateEventId(),
            type: CombatEventType.PLAYER_DEATH, // 重用事件類型表示戰鬥結束
            timestamp: new Date(),
            playerId: player.characterId,
            monsterInstanceId: monster.instanceId,
            additionalData: { reason: "FLED" },
          });
        }
        break;
    }

    // 2. 檢查怪物是否死亡
    if (monster.currentStats.health <= 0) {
      monster.state = MonsterState.DEAD;
      combatContinues = false;
      events.push({
        id: this.generateEventId(),
        type: CombatEventType.MONSTER_DEATH,
        timestamp: new Date(),
        playerId: player.characterId,
        monsterInstanceId: monster.instanceId,
      });
      return { events, combatContinues };
    }

    // 3. 怪物反擊 (如果戰鬥仍在進行)
    if (combatContinues && monster.state !== MonsterState.DEAD) {
      const monsterAttackEvents = await this.executeMonsterAttack(
        monster,
        monsterDef,
        player,
      );
      events.push(...monsterAttackEvents);

      // 檢查玩家是否死亡
      if (player.health <= 0) {
        combatContinues = false;
        events.push({
          id: this.generateEventId(),
          type: CombatEventType.PLAYER_DEATH,
          timestamp: new Date(),
          playerId: player.characterId,
          monsterInstanceId: monster.instanceId,
        });
      }
    }

    return { events, combatContinues };
  }

  /**
   * 執行玩家物理攻擊
   */
  private async executePlayerAttack(
    player: PlayerCombatStats,
    monster: MonsterInstance,
    monsterDef: MonsterDefinition,
  ): Promise<CombatEvent[]> {
    const events: CombatEvent[] = [];

    // 命中檢查
    const hitCheck = this.checkHit(
      player.accuracy,
      monster.currentStats.evasion,
      player.luckPercentage,
    );

    if (!hitCheck.isHit) {
      // 攻擊失誤
      events.push({
        id: this.generateEventId(),
        type: hitCheck.isDodged ? CombatEventType.DODGE : CombatEventType.MISS,
        timestamp: new Date(),
        playerId: player.characterId,
        monsterInstanceId: monster.instanceId,
      });
      return events;
    }

    // 傷害計算
    const damageCalc = this.calculateDamage(
      player.physicalAttack,
      monster.currentStats.physicalDefense,
      "PHYSICAL",
      player.criticalRate,
      player.criticalDamage,
      player.luckPercentage,
      monsterDef.resistances.physicalResistance,
    );

    // 應用傷害
    monster.currentStats.health = Math.max(
      0,
      monster.currentStats.health - damageCalc.finalDamage,
    );

    // 創建傷害事件
    events.push({
      id: this.generateEventId(),
      type: CombatEventType.PLAYER_ATTACK,
      timestamp: new Date(),
      playerId: player.characterId,
      monsterInstanceId: monster.instanceId,
      damage: damageCalc.finalDamage,
      isCritical: damageCalc.isCritical,
    });

    events.push({
      id: this.generateEventId(),
      type: CombatEventType.MONSTER_DAMAGE,
      timestamp: new Date(),
      playerId: player.characterId,
      monsterInstanceId: monster.instanceId,
      damage: damageCalc.finalDamage,
      additionalData: {
        damageType: damageCalc.damageType,
        resistanceReduction: damageCalc.resistanceReduction,
      },
    });

    return events;
  }

  /**
   * 執行玩家魔法攻擊
   */
  private async executePlayerMagic(
    player: PlayerCombatStats,
    monster: MonsterInstance,
    monsterDef: MonsterDefinition,
  ): Promise<CombatEvent[]> {
    const events: CombatEvent[] = [];

    // 檢查魔力是否足夠
    const manaCost = this.calculateMagicManaCost(
      player.level,
      player.characterClass,
    );
    if (player.mana < manaCost) {
      // 魔力不足，視為失誤
      events.push({
        id: this.generateEventId(),
        type: CombatEventType.MISS,
        timestamp: new Date(),
        playerId: player.characterId,
        monsterInstanceId: monster.instanceId,
        additionalData: { reason: "INSUFFICIENT_MANA" },
      });
      return events;
    }

    // 消耗魔力
    player.mana -= manaCost;

    // 魔法命中率通常較高
    const magicAccuracy = player.accuracy * 1.1; // 魔法有命中加成
    const hitCheck = this.checkHit(
      magicAccuracy,
      monster.currentStats.evasion * 0.8, // 魔法較難閃避
      player.luckPercentage,
    );

    if (!hitCheck.isHit) {
      events.push({
        id: this.generateEventId(),
        type: hitCheck.isDodged ? CombatEventType.DODGE : CombatEventType.MISS,
        timestamp: new Date(),
        playerId: player.characterId,
        monsterInstanceId: monster.instanceId,
      });
      return events;
    }

    // 魔法傷害計算
    const damageCalc = this.calculateDamage(
      player.magicalAttack,
      monster.currentStats.magicalDefense,
      "MAGICAL",
      player.criticalRate * 0.8, // 魔法爆擊率稍低
      player.criticalDamage,
      player.luckPercentage,
      monsterDef.resistances.magicalResistance,
    );

    // 應用傷害
    monster.currentStats.health = Math.max(
      0,
      monster.currentStats.health - damageCalc.finalDamage,
    );

    events.push({
      id: this.generateEventId(),
      type: CombatEventType.PLAYER_ATTACK,
      timestamp: new Date(),
      playerId: player.characterId,
      monsterInstanceId: monster.instanceId,
      damage: damageCalc.finalDamage,
      isCritical: damageCalc.isCritical,
      additionalData: { attackType: "MAGIC", manaCost },
    });

    events.push({
      id: this.generateEventId(),
      type: CombatEventType.MONSTER_DAMAGE,
      timestamp: new Date(),
      playerId: player.characterId,
      monsterInstanceId: monster.instanceId,
      damage: damageCalc.finalDamage,
      additionalData: { damageType: "MAGICAL" },
    });

    return events;
  }

  /**
   * 執行怪物攻擊
   */
  private async executeMonsterAttack(
    monster: MonsterInstance,
    monsterDef: MonsterDefinition,
    player: PlayerCombatStats,
  ): Promise<CombatEvent[]> {
    const events: CombatEvent[] = [];

    // 檢查攻擊冷卻
    const now = new Date();
    const timeSinceLastAttack =
      now.getTime() - monster.lastAttackTime.getTime();
    if (timeSinceLastAttack < monsterDef.behavior.attackCooldown * 1000) {
      return events; // 還在冷卻中
    }

    // 更新最後攻擊時間
    monster.lastAttackTime = now;

    // 怪物命中檢查
    const hitCheck = this.checkHit(
      monster.currentStats.accuracy,
      player.evasion,
      0, // 怪物沒有幸運值影響
    );

    if (!hitCheck.isHit) {
      events.push({
        id: this.generateEventId(),
        type: hitCheck.isDodged ? CombatEventType.DODGE : CombatEventType.MISS,
        timestamp: new Date(),
        playerId: player.characterId,
        monsterInstanceId: monster.instanceId,
        additionalData: { attacker: "MONSTER" },
      });
      return events;
    }

    // 決定攻擊類型 (物理或魔法)
    const usesMagic =
      monsterDef.behavior.canUseMagic &&
      monster.currentStats.mana > 0 &&
      Math.random() < 0.3; // 30% 機率使用魔法

    const attackPower = usesMagic
      ? monster.currentStats.magicalAttack
      : monster.currentStats.physicalAttack;

    const playerDefense = usesMagic
      ? player.magicalDefense
      : player.physicalDefense;

    const resistance = usesMagic
      ? 0 // 玩家沒有內建抗性系統，簡化處理
      : 0;

    // 傷害計算
    const damageCalc = this.calculateDamage(
      attackPower,
      playerDefense,
      usesMagic ? "MAGICAL" : "PHYSICAL",
      monster.currentStats.criticalRate,
      monster.currentStats.criticalDamage,
      0, // 怪物沒有幸運值
      resistance,
    );

    // 應用傷害到玩家
    player.health = Math.max(0, player.health - damageCalc.finalDamage);

    events.push({
      id: this.generateEventId(),
      type: CombatEventType.MONSTER_ATTACK,
      timestamp: new Date(),
      playerId: player.characterId,
      monsterInstanceId: monster.instanceId,
      damage: damageCalc.finalDamage,
      isCritical: damageCalc.isCritical,
      additionalData: {
        attackType: usesMagic ? "MAGICAL" : "PHYSICAL",
        monsterName: monsterDef.name,
      },
    });

    events.push({
      id: this.generateEventId(),
      type: CombatEventType.PLAYER_DAMAGE,
      timestamp: new Date(),
      playerId: player.characterId,
      monsterInstanceId: monster.instanceId,
      damage: damageCalc.finalDamage,
    });

    return events;
  }

  /**
   * 計算物理攻擊力
   */
  private calculatePhysicalAttack(
    strength: number,
    level: number,
    growthRate: number,
    equippedWeapon?: string,
  ): number {
    const baseAttack = strength * 1.5 + level * growthRate;
    const weaponDamage = this.getWeaponDamage(equippedWeapon);
    return Math.round(baseAttack + weaponDamage);
  }

  /**
   * 計算魔法攻擊力
   */
  private calculateMagicalAttack(
    intelligence: number,
    level: number,
    growthRate: number,
    equippedWeapon?: string,
  ): number {
    const baseAttack = intelligence * 1.5 + level * growthRate;
    const weaponMagicDamage = this.getWeaponMagicDamage(equippedWeapon);
    return Math.round(baseAttack + weaponMagicDamage);
  }

  /**
   * 計算物理防禦力
   */
  private calculatePhysicalDefense(
    stamina: number,
    level: number,
    growthRate: number,
    character: any,
  ): number {
    const baseDefense = stamina * 1.2 + level * growthRate;
    const armorDefense = this.getArmorDefense(character);
    return Math.round(baseDefense + armorDefense);
  }

  /**
   * 計算魔法防禦力
   */
  private calculateMagicalDefense(
    intelligence: number,
    level: number,
    growthRate: number,
    character: any,
  ): number {
    const baseDefense = intelligence * 0.8 + level * growthRate;
    const armorMagicDefense = this.getArmorMagicDefense(character);
    return Math.round(baseDefense + armorMagicDefense);
  }

  /**
   * 計算命中率
   */
  private calculateAccuracy(dexterity: number, level: number): number {
    const baseAccuracy = 0.75 + dexterity * 0.008 + level * 0.001;
    return Math.min(0.95, Math.max(0.5, baseAccuracy)); // 限制在 50%-95% 之間
  }

  /**
   * 計算閃避率
   */
  private calculateEvasion(dexterity: number, luckPercentage: number): number {
    const baseEvasion = dexterity * 0.006 + (luckPercentage - 50) * 0.004;
    return Math.min(0.4, Math.max(0.0, baseEvasion)); // 限制在 0%-40% 之間
  }

  /**
   * 計算爆擊率
   */
  private calculateCriticalRate(
    dexterity: number,
    luckPercentage: number,
    hasEnhancedCritical: boolean,
  ): number {
    let baseCritical = dexterity * 0.001 + (luckPercentage - 50) * 0.001;

    if (hasEnhancedCritical) {
      baseCritical *= 1.5; // 50% 爆擊率加成
    }

    return Math.min(0.5, Math.max(0.01, baseCritical)); // 限制在 1%-50% 之間
  }

  /**
   * 計算爆擊傷害
   */
  private calculateCriticalDamage(
    characterClass: CharacterClass,
    luckPercentage: number,
  ): number {
    let baseCriticalDamage = 2.0; // 基礎爆擊傷害 200%

    // 職業修正
    switch (characterClass) {
      case CharacterClass.ROGUE:
        baseCriticalDamage = 2.5; // 盜賊有更高爆擊傷害
        break;
      case CharacterClass.ARCHER:
        baseCriticalDamage = 2.2; // 弓箭手有較高爆擊傷害
        break;
    }

    // 幸運值影響
    const luckBonus = (luckPercentage - 50) * 0.01; // 每1%幸運值增加1%爆擊傷害

    return baseCriticalDamage + luckBonus;
  }

  /**
   * 檢查攻擊是否命中
   */
  private checkHit(
    attackerAccuracy: number,
    targetEvasion: number,
    attackerLuck: number,
  ): HitCheckResult {
    const luckInfluence = (attackerLuck - 50) * 0.002; // 幸運值影響
    const hitChance = Math.min(
      0.95,
      attackerAccuracy - targetEvasion + luckInfluence,
    );
    const dodgeChance = targetEvasion;

    const roll = Math.random();
    const isHit = roll < hitChance;
    const isDodged = !isHit && roll < hitChance + dodgeChance;

    return {
      isHit,
      isDodged,
      hitChance,
      dodgeChance,
      luckInfluence,
    };
  }

  /**
   * 計算傷害
   */
  private calculateDamage(
    attackPower: number,
    defense: number,
    damageType: "PHYSICAL" | "MAGICAL",
    criticalRate: number,
    criticalDamage: number,
    attackerLuck: number,
    resistance: number,
  ): DamageCalculation {
    // 基礎傷害計算
    const baseDamage = Math.max(1, attackPower - defense);

    // 爆擊檢查
    const luckCriticalBonus = (attackerLuck - 50) * 0.001;
    const finalCriticalRate = Math.min(0.5, criticalRate + luckCriticalBonus);
    const isCritical = Math.random() < finalCriticalRate;

    // 傷害計算
    let finalDamage = baseDamage;

    // 爆擊加成
    if (isCritical) {
      finalDamage *= criticalDamage;
    }

    // 抗性減免
    const resistanceReduction = finalDamage * Math.abs(resistance);
    if (resistance > 0) {
      finalDamage -= resistanceReduction; // 正抗性減少傷害
    } else {
      finalDamage += resistanceReduction; // 負抗性(弱點)增加傷害
    }

    // 幸運值影響 (小幅度浮動)
    const luckModifier = 1 + (attackerLuck - 50) * 0.002;
    finalDamage *= luckModifier;

    // 傷害隨機浮動 (±10%)
    const randomFactor = 0.9 + Math.random() * 0.2;
    finalDamage *= randomFactor;

    finalDamage = Math.max(1, Math.round(finalDamage));

    return {
      baseDamage,
      finalDamage,
      isCritical,
      damageType,
      resistanceReduction,
      luckModifier,
    };
  }

  /**
   * 計算逃跑成功率
   */
  private calculateFleeChance(
    player: PlayerCombatStats,
    monster: MonsterInstance,
  ): boolean {
    const playerSpeed = player.dexterity + (player.luckPercentage - 50) * 0.1;
    const monsterSpeed = monster.currentStats.speed * 10; // 調整到類似範圍

    const fleeChance = Math.min(
      0.9,
      Math.max(0.1, 0.5 + (playerSpeed - monsterSpeed) * 0.02),
    );

    return Math.random() < fleeChance;
  }

  /**
   * 計算魔法攻擊魔力消耗
   */
  private calculateMagicManaCost(
    level: number,
    characterClass: CharacterClass,
  ): number {
    let baseCost = 10 + Math.floor(level / 3);

    // 法師魔力消耗減少
    if (characterClass === CharacterClass.MAGE) {
      baseCost = Math.floor(baseCost * 0.8);
    }

    return baseCost;
  }

  // 裝備相關的輔助函數 (簡化實現)
  private getWeaponDamage(weaponId?: string): number {
    if (!weaponId) return 0;
    // 簡化的武器傷害表，實際應該從 items 系統獲取
    const weaponDamages = {
      "weapon-copper-sword": 15,
      "weapon-bronze-sword": 25,
      "weapon-steel-dagger": 20,
      "weapon-basic-wand": 12,
      "weapon-short-bow": 18,
    };
    return weaponDamages[weaponId] || 0;
  }

  private getWeaponMagicDamage(weaponId?: string): number {
    if (!weaponId) return 0;
    const weaponMagicDamages = {
      "weapon-basic-wand": 20,
      "weapon-magic-staff": 35,
    };
    return weaponMagicDamages[weaponId] || 0;
  }

  private getArmorDefense(character: any): number {
    // 簡化實現，計算所有裝備的防禦力總和
    let totalDefense = 0;
    // 這裡應該遍歷角色的所有裝備並累加防禦力
    // 暫時返回基礎值
    return totalDefense;
  }

  private getArmorMagicDefense(character: any): number {
    // 簡化實現，計算所有裝備的魔法防禦總和
    let totalMagicDefense = 0;
    // 這裡應該遍歷角色的所有裝備並累加魔法防禦
    return totalMagicDefense;
  }

  /**
   * 生成唯一事件ID
   */
  private generateEventId(): string {
    return `combat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
