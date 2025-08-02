import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { PrismaService } from "../prisma/prisma.service";

// 耐力狀態枚舉
export enum StaminaStatus {
  FULL = "FULL", // 滿耐力 (90-100%)
  GOOD = "GOOD", // 良好 (70-89%)
  TIRED = "TIRED", // 疲憊 (40-69%)
  EXHAUSTED = "EXHAUSTED", // 精疲力盡 (10-39%)
  COLLAPSED = "COLLAPSED", // 虛脫 (0-9%)
}

// 移動類型
export enum MovementType {
  WALKING = "WALKING", // 步行
  RUNNING = "RUNNING", // 跑步
  CARRYING = "CARRYING", // 搬運重物
  RESTING = "RESTING", // 休息
}

// 耐力資訊接口
export interface StaminaInfo {
  current: number;
  max: number;
  percentage: number;
  status: StaminaStatus;
  regenRate: number;
  isResting: boolean;
  restingFor?: number; // 休息了多少秒
  movementPenalty: number; // 移動速度懲罰 (0-1)
  canRun: boolean;
  timeUntilFull?: number; // 到完全恢復的時間(秒)
}

// 耐力消耗配置
export interface StaminaDrainConfig {
  movementType: MovementType;
  drainRate: number; // 每秒消耗
  weightMultiplier: number; // 重量倍數
  speedPenalty: number; // 速度懲罰
}

@Injectable()
export class StaminaService {
  private readonly logger = new Logger(StaminaService.name);

  // 耐力消耗配置
  private readonly staminaDrainConfigs: Record<
    MovementType,
    StaminaDrainConfig
  > = {
    [MovementType.WALKING]: {
      movementType: MovementType.WALKING,
      drainRate: 0.5, // 每秒消耗0.5耐力
      weightMultiplier: 1.0, // 重量完全影響
      speedPenalty: 0.0, // 無速度懲罰
    },
    [MovementType.RUNNING]: {
      movementType: MovementType.RUNNING,
      drainRate: 2.0, // 每秒消耗2.0耐力
      weightMultiplier: 2.0, // 重量雙倍影響
      speedPenalty: 0.0, // 無額外懲罰
    },
    [MovementType.CARRYING]: {
      movementType: MovementType.CARRYING,
      drainRate: 1.5, // 每秒消耗1.5耐力
      weightMultiplier: 3.0, // 重量三倍影響
      speedPenalty: 0.3, // 30%速度懲罰
    },
    [MovementType.RESTING]: {
      movementType: MovementType.RESTING,
      drainRate: -2.0, // 每秒恢復2.0耐力
      weightMultiplier: 0.0, // 重量不影響恢復
      speedPenalty: 0.0, // 無移動
    },
  };

  constructor(private prisma: PrismaService) {}

  /**
   * 每5秒更新所有玩家的耐力
   */
  @Cron("*/5 * * * * *") // 每5秒執行
  async updateAllPlayersStamina(): Promise<void> {
    try {
      const characters = await this.prisma.gameCharacter.findMany({
        select: {
          id: true,
          stamina: true,
          maxStamina: true,
          staminaRegenRate: true,
          lastStaminaUpdate: true,
          isResting: true,
          currentWeight: true,
          carryingCapacity: true,
        },
      });

      const updatePromises = characters.map((character) =>
        this.updateCharacterStamina(character.id),
      );

      await Promise.all(updatePromises);

      if (characters.length > 0) {
        this.logger.debug(`更新了 ${characters.length} 個角色的耐力狀態`);
      }
    } catch (error) {
      this.logger.error("批量更新耐力失敗:", error);
    }
  }

  /**
   * 獲取角色耐力資訊
   */
  async getStaminaInfo(characterId: string): Promise<StaminaInfo> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: {
        stamina: true,
        maxStamina: true,
        staminaRegenRate: true,
        lastStaminaUpdate: true,
        isResting: true,
        restStartTime: true,
        movementPenalty: true,
        currentWeight: true,
        carryingCapacity: true,
      },
    });

    if (!character) {
      throw new Error("角色不存在");
    }

    // 先更新耐力到最新狀態
    await this.updateCharacterStamina(characterId);

    // 重新獲取更新後的數據
    const updatedCharacter = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: {
        stamina: true,
        maxStamina: true,
        staminaRegenRate: true,
        isResting: true,
        restStartTime: true,
        movementPenalty: true,
      },
    });

    const current = updatedCharacter!.stamina;
    const max = updatedCharacter!.maxStamina;
    const percentage = (current / max) * 100;
    const status = this.calculateStaminaStatus(percentage);

    let restingFor: number | undefined;
    if (updatedCharacter!.isResting && updatedCharacter!.restStartTime) {
      restingFor = Math.floor(
        (Date.now() - updatedCharacter!.restStartTime.getTime()) / 1000,
      );
    }

    const timeUntilFull =
      current < max
        ? Math.ceil((max - current) / updatedCharacter!.staminaRegenRate)
        : undefined;

    return {
      current: Math.round(current * 10) / 10,
      max,
      percentage: Math.round(percentage * 10) / 10,
      status,
      regenRate: updatedCharacter!.staminaRegenRate,
      isResting: updatedCharacter!.isResting,
      restingFor,
      movementPenalty: updatedCharacter!.movementPenalty,
      canRun: current > 20, // 需要至少20耐力才能跑步
      timeUntilFull,
    };
  }

  /**
   * 消耗耐力
   */
  async drainStamina(
    characterId: string,
    movementType: MovementType,
    duration: number, // 秒
  ): Promise<{
    success: boolean;
    newStamina: number;
    staminaInfo: StaminaInfo;
    message?: string;
  }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: {
        stamina: true,
        maxStamina: true,
        currentWeight: true,
        carryingCapacity: true,
        isResting: true,
      },
    });

    if (!character) {
      throw new Error("角色不存在");
    }

    const config = this.staminaDrainConfigs[movementType];
    const weightRatio = character.currentWeight / character.carryingCapacity;
    const weightPenalty = Math.max(0, weightRatio - 0.5); // 超過50%負重開始懲罰
    const adjustedDrainRate =
      config.drainRate +
      config.drainRate * config.weightMultiplier * weightPenalty;
    const totalDrain = adjustedDrainRate * duration;

    // 檢查是否有足夠耐力
    if (movementType === MovementType.RUNNING && character.stamina < 20) {
      return {
        success: false,
        newStamina: character.stamina,
        staminaInfo: await this.getStaminaInfo(characterId),
        message: "耐力不足，無法跑步",
      };
    }

    // 計算新耐力值
    const newStamina = Math.max(
      0,
      Math.min(character.maxStamina, character.stamina - totalDrain),
    );

    // 計算移動速度懲罰
    const staminaPenalty = this.calculateStaminaMovementPenalty(
      newStamina,
      character.maxStamina,
    );
    const weightMovementPenalty = Math.min(0.5, weightPenalty); // 最多50%速度懲罰
    const totalMovementPenalty = Math.min(
      0.8,
      staminaPenalty + weightMovementPenalty + config.speedPenalty,
    );

    // 更新角色狀態
    await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        stamina: newStamina,
        movementPenalty: totalMovementPenalty,
        lastStaminaUpdate: new Date(),
        isResting: false, // 移動時取消休息狀態
        restStartTime: null,
      },
    });

    const staminaInfo = await this.getStaminaInfo(characterId);

    this.logger.log(
      `角色 ${characterId} ${movementType} ${duration}秒，消耗 ${totalDrain.toFixed(1)} 耐力，剩餘 ${newStamina.toFixed(1)}/${character.maxStamina}`,
    );

    return {
      success: true,
      newStamina,
      staminaInfo,
    };
  }

  /**
   * 開始休息
   */
  async startResting(characterId: string): Promise<{
    success: boolean;
    message: string;
    staminaInfo: StaminaInfo;
  }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { isResting: true, stamina: true, maxStamina: true },
    });

    if (!character) {
      throw new Error("角色不存在");
    }

    if (character.isResting) {
      return {
        success: false,
        message: "已經在休息中",
        staminaInfo: await this.getStaminaInfo(characterId),
      };
    }

    if (character.stamina >= character.maxStamina) {
      return {
        success: false,
        message: "耐力已滿，無需休息",
        staminaInfo: await this.getStaminaInfo(characterId),
      };
    }

    await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        isResting: true,
        restStartTime: new Date(),
        movementPenalty: 0.0, // 休息時無移動懲罰
        lastStaminaUpdate: new Date(),
      },
    });

    this.logger.log(`角色 ${characterId} 開始休息`);

    return {
      success: true,
      message: "開始休息，耐力恢復中...",
      staminaInfo: await this.getStaminaInfo(characterId),
    };
  }

  /**
   * 停止休息
   */
  async stopResting(characterId: string): Promise<{
    success: boolean;
    message: string;
    staminaInfo: StaminaInfo;
    restDuration?: number;
  }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { isResting: true, restStartTime: true },
    });

    if (!character) {
      throw new Error("角色不存在");
    }

    if (!character.isResting) {
      return {
        success: false,
        message: "沒有在休息中",
        staminaInfo: await this.getStaminaInfo(characterId),
      };
    }

    let restDuration = 0;
    if (character.restStartTime) {
      restDuration = Math.floor(
        (Date.now() - character.restStartTime.getTime()) / 1000,
      );
    }

    await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        isResting: false,
        restStartTime: null,
        lastStaminaUpdate: new Date(),
      },
    });

    this.logger.log(`角色 ${characterId} 停止休息，休息了 ${restDuration} 秒`);

    return {
      success: true,
      message: `休息結束，共休息了 ${restDuration} 秒`,
      staminaInfo: await this.getStaminaInfo(characterId),
      restDuration,
    };
  }

  /**
   * 修改耐力上限（升級時使用）
   */
  async increaseMaxStamina(
    characterId: string,
    amount: number,
  ): Promise<{
    success: boolean;
    newMaxStamina: number;
  }> {
    const updatedCharacter = await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        maxStamina: {
          increment: amount,
        },
        stamina: {
          increment: amount, // 同時增加當前耐力
        },
      },
    });

    this.logger.log(
      `角色 ${characterId} 耐力上限增加 ${amount}，新上限: ${updatedCharacter.maxStamina}`,
    );

    return {
      success: true,
      newMaxStamina: updatedCharacter.maxStamina,
    };
  }

  // === 私有輔助方法 ===

  /**
   * 更新單個角色的耐力
   */
  private async updateCharacterStamina(characterId: string): Promise<void> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: {
        stamina: true,
        maxStamina: true,
        staminaRegenRate: true,
        lastStaminaUpdate: true,
        isResting: true,
        currentWeight: true,
        carryingCapacity: true,
      },
    });

    if (!character) return;

    const now = new Date();
    const lastUpdate = character.lastStaminaUpdate;
    const timeDifference = (now.getTime() - lastUpdate.getTime()) / 1000; // 秒

    if (timeDifference < 1) return; // 少於1秒不更新

    let staminaChange = 0;

    if (character.isResting) {
      // 休息時快速恢復
      const restRegenRate = character.staminaRegenRate * 2; // 休息時恢復速度雙倍
      staminaChange = restRegenRate * timeDifference;
    } else {
      // 正常恢復（較慢）
      const weightRatio = character.currentWeight / character.carryingCapacity;
      const weightPenalty = Math.max(0, weightRatio - 0.7); // 超過70%負重影響恢復
      const adjustedRegenRate =
        character.staminaRegenRate * (1 - weightPenalty * 0.5);
      staminaChange = adjustedRegenRate * timeDifference;
    }

    const newStamina = Math.max(
      0,
      Math.min(character.maxStamina, character.stamina + staminaChange),
    );

    // 如果耐力已滿且在休息，自動停止休息
    const shouldStopResting =
      character.isResting && newStamina >= character.maxStamina;

    await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        stamina: newStamina,
        lastStaminaUpdate: now,
        ...(shouldStopResting && {
          isResting: false,
          restStartTime: null,
        }),
      },
    });
  }

  /**
   * 計算耐力狀態
   */
  private calculateStaminaStatus(percentage: number): StaminaStatus {
    if (percentage >= 90) return StaminaStatus.FULL;
    if (percentage >= 70) return StaminaStatus.GOOD;
    if (percentage >= 40) return StaminaStatus.TIRED;
    if (percentage >= 10) return StaminaStatus.EXHAUSTED;
    return StaminaStatus.COLLAPSED;
  }

  /**
   * 計算耐力導致的移動速度懲罰
   */
  private calculateStaminaMovementPenalty(
    currentStamina: number,
    maxStamina: number,
  ): number {
    const percentage = (currentStamina / maxStamina) * 100;

    if (percentage >= 50) return 0.0; // 50%以上無懲罰
    if (percentage >= 25) return 0.1; // 25-50% 輕微懲罰
    if (percentage >= 10) return 0.3; // 10-25% 中等懲罰
    return 0.5; // 10%以下嚴重懲罰
  }
}
