import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CombatEngine, PlayerCombatStats } from "./combat.engine";
import {
  MonsterDefinition,
  MonsterInstance,
  MonsterState,
  CombatResult,
  CombatEvent,
  CombatEventType,
} from "./monsters.types";
import {
  MONSTERS_DATABASE,
  getMonstersForLevel,
  getMonstersForLocation,
} from "./monsters.database";
import { SkillsService, SkillType } from "../skills/skills.service";
import { LuckService, LuckEvent } from "../characters/luck.service";
import {
  CharacterClass,
  getClassData,
} from "../characters/character-classes.types";
import { v4 as uuidv4 } from "uuid";

// 戰鬥請求 DTO
export interface StartCombatDto {
  monsterId: string;
  playerLocation?: string;
}

export interface CombatActionDto {
  combatInstanceId: string;
  action: "ATTACK" | "MAGIC" | "DEFEND" | "FLEE";
}

// 戰鬥實例
export interface CombatInstance {
  id: string;
  playerId: string;
  monsterInstance: MonsterInstance;
  monsterDefinition: MonsterDefinition;
  playerCombatStats: PlayerCombatStats;
  events: CombatEvent[];
  startTime: Date;
  endTime?: Date;
  isActive: boolean;
  turnCount: number;
}

@Injectable()
export class CombatService {
  private activeCombats: Map<string, CombatInstance> = new Map();

  constructor(
    private prisma: PrismaService,
    private combatEngine: CombatEngine,
    private skillsService: SkillsService,
    private luckService: LuckService,
  ) {}

  /**
   * 開始戰鬥
   */
  async startCombat(
    playerId: string,
    startCombatDto: StartCombatDto,
  ): Promise<CombatInstance> {
    // 檢查玩家是否已在戰鬥中
    const existingCombat = this.getPlayerActiveCombat(playerId);
    if (existingCombat) {
      throw new BadRequestException("玩家已經在戰鬥中");
    }

    // 獲取玩家角色資料
    const character = await this.prisma.gameCharacter.findUnique({
      where: { userId: playerId },
      include: {
        skills: true,
      },
    });

    if (!character) {
      throw new NotFoundException("找不到角色資料");
    }

    // 檢查角色生命值
    if (character.health <= 0) {
      throw new BadRequestException("角色生命值不足，無法開始戰鬥");
    }

    // 獲取怪物定義
    const monsterDef = MONSTERS_DATABASE[startCombatDto.monsterId];
    if (!monsterDef) {
      throw new NotFoundException("找不到指定的怪物");
    }

    // 檢查怪物是否適合玩家等級
    const levelDiff = Math.abs(character.level - monsterDef.stats.level);
    if (levelDiff > 10) {
      throw new BadRequestException("怪物等級與玩家等級差距過大");
    }

    // 檢查位置限制
    if (
      startCombatDto.playerLocation &&
      !monsterDef.spawnLocations.includes(startCombatDto.playerLocation)
    ) {
      throw new BadRequestException("該怪物不會在此位置出現");
    }

    // 創建怪物實例
    const monsterInstance = this.createMonsterInstance(
      monsterDef,
      startCombatDto.playerLocation,
    );

    // 計算玩家戰鬥屬性
    const playerCombatStats =
      this.combatEngine.calculatePlayerCombatStats(character);

    // 創建戰鬥實例
    const combatInstance: CombatInstance = {
      id: uuidv4(),
      playerId,
      monsterInstance,
      monsterDefinition: monsterDef,
      playerCombatStats,
      events: [],
      startTime: new Date(),
      isActive: true,
      turnCount: 0,
    };

    // 添加戰鬥開始事件
    combatInstance.events.push({
      id: uuidv4(),
      type: CombatEventType.PLAYER_ATTACK, // 重用事件類型
      timestamp: new Date(),
      playerId,
      monsterInstanceId: monsterInstance.instanceId,
      additionalData: {
        eventType: "COMBAT_START",
        monsterName: monsterDef.name,
        monsterLevel: monsterDef.stats.level,
      },
    });

    // 存儲戰鬥實例
    this.activeCombats.set(combatInstance.id, combatInstance);

    return combatInstance;
  }

  /**
   * 執行戰鬥動作
   */
  async executeCombatAction(
    playerId: string,
    combatActionDto: CombatActionDto,
  ): Promise<{ combat: CombatInstance; result?: CombatResult }> {
    const combat = this.activeCombats.get(combatActionDto.combatInstanceId);

    if (!combat) {
      throw new NotFoundException("找不到戰鬥實例");
    }

    if (combat.playerId !== playerId) {
      throw new BadRequestException("無權限操作此戰鬥");
    }

    if (!combat.isActive) {
      throw new BadRequestException("戰鬥已結束");
    }

    // 執行戰鬥回合
    const { events, combatContinues } =
      await this.combatEngine.executeCombatRound(
        combat.playerCombatStats,
        combat.monsterInstance,
        combat.monsterDefinition,
        combatActionDto.action,
      );

    // 更新戰鬥資料
    combat.events.push(...events);
    combat.turnCount++;

    let result: CombatResult | undefined;

    // 檢查戰鬥是否結束
    if (!combatContinues) {
      combat.isActive = false;
      combat.endTime = new Date();

      // 生成戰鬥結果
      result = await this.generateCombatResult(combat);

      // 應用戰鬥結果到玩家
      await this.applyCombatResult(playerId, result);

      // 移除戰鬥實例
      this.activeCombats.delete(combat.id);
    }

    return { combat, result };
  }

  /**
   * 獲取玩家當前戰鬥
   */
  getPlayerActiveCombat(playerId: string): CombatInstance | undefined {
    for (const combat of this.activeCombats.values()) {
      if (combat.playerId === playerId && combat.isActive) {
        return combat;
      }
    }
    return undefined;
  }

  /**
   * 強制結束戰鬥 (用於玩家離線等情況)
   */
  async forfeitCombat(playerId: string): Promise<void> {
    const combat = this.getPlayerActiveCombat(playerId);
    if (combat) {
      combat.isActive = false;
      combat.endTime = new Date();

      // 添加放棄事件
      combat.events.push({
        id: uuidv4(),
        type: CombatEventType.PLAYER_DEATH,
        timestamp: new Date(),
        playerId,
        monsterInstanceId: combat.monsterInstance.instanceId,
        additionalData: { reason: "FORFEIT" },
      });

      // 應用懲罰 (減少幸運值)
      await this.luckService.updateLuck(playerId, LuckEvent.COMBAT_DEFEAT, {
        penalty: -2.0,
      });

      this.activeCombats.delete(combat.id);
    }
  }

  /**
   * 獲取適合玩家等級的怪物列表
   */
  async getAvailableMonsters(
    playerId: string,
    location?: string,
  ): Promise<MonsterDefinition[]> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { userId: playerId },
    });

    if (!character) {
      throw new NotFoundException("找不到角色資料");
    }

    let monsters = getMonstersForLevel(character.level);

    if (location) {
      monsters = monsters.filter((monster) =>
        monster.spawnLocations.includes(location),
      );
    }

    return monsters;
  }

  /**
   * 創建怪物實例
   */
  private createMonsterInstance(
    monsterDef: MonsterDefinition,
    location?: string,
  ): MonsterInstance {
    return {
      instanceId: uuidv4(),
      monsterId: monsterDef.id,
      currentStats: { ...monsterDef.stats }, // 深拷貝屬性
      position: {
        x: 0,
        y: 0,
        mapId: location || "unknown",
      },
      state: MonsterState.IDLE,
      lastAttackTime: new Date(0), // 初始化為很久以前
      spawnTime: new Date(),
      statusEffects: [],
    };
  }

  /**
   * 生成戰鬥結果
   */
  private async generateCombatResult(
    combat: CombatInstance,
  ): Promise<CombatResult> {
    const playerVictory = combat.monsterInstance.state === MonsterState.DEAD;
    const combatDuration =
      (combat.endTime!.getTime() - combat.startTime.getTime()) / 1000;

    let rewards: CombatResult["rewards"] | undefined;
    let playerDamage: CombatResult["playerDamage"] | undefined;

    if (playerVictory) {
      // 計算經驗值獎勵 (基於怪物等級和玩家等級差異)
      const levelDiff =
        combat.monsterDefinition.stats.level - combat.playerCombatStats.level;
      const experienceMultiplier = Math.max(
        0.5,
        Math.min(1.5, 1 + levelDiff * 0.1),
      );

      const baseExp = combat.monsterDefinition.rewards.baseExperience;
      const finalExp = Math.round(baseExp * experienceMultiplier);

      // 計算掉落物品
      const droppedItems = this.calculateDrops(
        combat.monsterDefinition.rewards.drops,
      );

      // 計算金幣獎勵
      const goldMin = combat.monsterDefinition.rewards.goldReward.min;
      const goldMax = combat.monsterDefinition.rewards.goldReward.max;
      const goldReward =
        Math.floor(Math.random() * (goldMax - goldMin + 1)) + goldMin;

      rewards = {
        experience: finalExp,
        combatSkillExperience:
          combat.monsterDefinition.rewards.combatSkillExperience,
        gold: goldReward,
        items: droppedItems,
        specialRewards: combat.monsterDefinition.rewards.specialRewards,
      };
    } else {
      // 玩家失敗，記錄受到的傷害
      const maxHealth = combat.playerCombatStats.maxHealth;
      const currentHealth = combat.playerCombatStats.health;

      playerDamage = {
        healthLost: maxHealth - currentHealth,
        manaLost: 0,
        statusEffects: [],
      };
    }

    return {
      success: true,
      playerVictory,
      events: combat.events,
      rewards,
      playerDamage,
      combatDuration,
    };
  }

  /**
   * 計算怪物掉落物品
   */
  private calculateDrops(drops: MonsterDefinition["rewards"]["drops"]): any[] {
    const droppedItems: any[] = [];

    for (const drop of drops) {
      if (drop.isGuaranteed || Math.random() < drop.dropRate) {
        const quantity =
          Math.floor(
            Math.random() * (drop.maxQuantity - drop.minQuantity + 1),
          ) + drop.minQuantity;

        droppedItems.push({
          itemId: drop.itemId,
          quantity,
          quality: drop.quality,
        });
      }
    }

    return droppedItems;
  }

  /**
   * 應用戰鬥結果到玩家
   */
  private async applyCombatResult(
    playerId: string,
    result: CombatResult,
  ): Promise<void> {
    if (result.playerVictory && result.rewards) {
      // 獲得經驗值 (只有戰鬥技能提供角色經驗)
      if (result.rewards.experience > 0) {
        await this.addCharacterExperience(playerId, result.rewards.experience);
      }

      // 獲得戰鬥技能經驗
      if (result.rewards.combatSkillExperience > 0) {
        await this.skillsService.gainExperience(
          playerId,
          SkillType.COMBAT,
          result.rewards.combatSkillExperience,
        );
      }

      // 獲得金幣
      if (result.rewards.gold > 0) {
        await this.addCharacterGold(playerId, result.rewards.gold);
      }

      // TODO: 處理掉落物品 (需要整合 inventory 系統)

      // 增加幸運值 (戰鬥勝利)
      await this.luckService.updateLuck(playerId, LuckEvent.COMBAT_VICTORY, {
        bonus: 0.5,
      });

      // 特殊獎勵
      if (result.rewards.specialRewards) {
        if (result.rewards.specialRewards.luckBonus) {
          await this.luckService.updateLuck(
            playerId,
            LuckEvent.RARE_DISCOVERY,
            {
              bonus: result.rewards.specialRewards.luckBonus,
            },
          );
        }
      }
    } else {
      // 戰鬥失敗，減少幸運值
      await this.luckService.updateLuck(playerId, LuckEvent.COMBAT_DEFEAT, {
        penalty: -1.0,
      });
    }
  }

  /**
   * 增加角色經驗值和處理升級
   */
  private async addCharacterExperience(
    playerId: string,
    experience: number,
  ): Promise<void> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { userId: playerId },
    });

    if (!character) return;

    const newExperience = character.experience + experience;
    let newLevel = character.level;
    let newAvailableStatPoints = character.availableStatPoints;

    // 計算新等級 (簡化的升級公式)
    const requiredExp = this.calculateRequiredExperience(character.level + 1);
    if (newExperience >= requiredExp) {
      newLevel++;
      newAvailableStatPoints += 5; // 每級獲得5點自由分配點數

      // 升級時回復生命值和魔力
      const characterClassData = getClassData(
        character.characterClass as CharacterClass,
      );

      const newMaxHealth =
        character.maxHealth + characterClassData.growthRates.healthPerLevel;
      const newMaxMana =
        character.maxMana + characterClassData.growthRates.manaPerLevel;

      // 更新角色資料
      await this.prisma.gameCharacter.update({
        where: { userId: playerId },
        data: {
          experience: newExperience,
          level: newLevel,
          availableStatPoints: newAvailableStatPoints,
          maxHealth: newMaxHealth,
          health: newMaxHealth, // 升級時完全回復
          maxMana: newMaxMana,
          mana: newMaxMana,
        },
      });

      // 升級時增加幸運值
      await this.luckService.updateLuck(playerId, LuckEvent.LEVEL_UP, {
        bonus: 0.3,
      });
    } else {
      // 只更新經驗值
      await this.prisma.gameCharacter.update({
        where: { userId: playerId },
        data: {
          experience: newExperience,
        },
      });
    }
  }

  /**
   * 增加角色金幣
   */
  private async addCharacterGold(
    playerId: string,
    gold: number,
  ): Promise<void> {
    await this.prisma.gameCharacter.update({
      where: { userId: playerId },
      data: {
        goldAmount: {
          increment: gold,
        },
      },
    });
  }

  /**
   * 計算升級所需經驗值
   */
  private calculateRequiredExperience(level: number): number {
    // 簡化的經驗值公式：level * 100 + level^2 * 10
    return level * 100 + Math.pow(level, 2) * 10;
  }
}
