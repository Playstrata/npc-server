import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  UseGuards,
  Request,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import {
  ProjectileSystem,
  ArcherAttackParams,
  RangeCalculationResult,
} from "./projectile.system";
import { RealtimeCombatEngine } from "./realtime-combat.engine";
import { CharacterClass } from "../characters/character-classes.types";
import { PrismaService } from "../prisma/prisma.service";

// DTOs for API requests
export class ArcherAttackDto {
  targetPosition: { x: number; y: number };
  weaponType: string;
  weaponQuality?: string;
  targetId?: string;
  targetType?: "PLAYER" | "MONSTER";
}

export class RangeCheckDto {
  targetPosition: { x: number; y: number };
  weaponType: string;
  weaponQuality?: string;
}

export class GetRangeInfoDto {
  weaponType: string;
  weaponQuality?: string;
}

@ApiTags("Real-time Combat")
@Controller("combat/realtime")
@UseGuards(AuthGuard)
@ApiBearerAuth()
export class RealtimeCombatController {
  constructor(
    private readonly projectileSystem: ProjectileSystem,
    private readonly combatEngine: RealtimeCombatEngine,
    private readonly prisma: PrismaService,
  ) {}

  @Post("archer/attack")
  @ApiOperation({ summary: "弓箭手攻擊（包含射程驗證）" })
  @ApiResponse({ status: 200, description: "攻擊執行成功" })
  @ApiResponse({ status: 400, description: "射程不足或參數錯誤" })
  async executeArcherAttack(
    @Session() session: any,
    @Body() attackDto: ArcherAttackDto,
  ) {
    const userId = session.user.id;

    // 獲取角色資料
    const character = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      select: {
        id: true,
        characterClass: true,
        dexterity: true,
        level: true,
        health: true,
        // 可以添加更多需要的欄位
      },
    });

    if (!character) {
      throw new NotFoundException("找不到角色資料");
    }

    // 檢查角色是否為弓箭手或具有遠程攻擊能力
    if (
      character.characterClass !== CharacterClass.ARCHER &&
      character.characterClass !== CharacterClass.ROGUE
    ) {
      throw new BadRequestException("此職業無法使用弓箭攻擊");
    }

    // 假設玩家當前位置（實際應該從遊戲狀態獲取）
    const playerPosition = { x: 100, y: 100 }; // TODO: 從實際遊戲狀態獲取

    // 構建弓箭手攻擊參數
    const archerParams: ArcherAttackParams = {
      characterClass: character.characterClass as CharacterClass,
      dexterity: character.dexterity,
      level: character.level,
      weaponType: attackDto.weaponType,
      weaponQuality: attackDto.weaponQuality,
      attackerPosition: playerPosition,
      targetPosition: attackDto.targetPosition,
    };

    // 計算基礎傷害（簡化計算）
    const baseDamage = this.calculateBaseDamage(character);

    // 創建弓箭手投射物
    const result = this.projectileSystem.createArcherProjectile(
      archerParams,
      baseDamage,
      attackDto.targetId,
      attackDto.targetType,
    );

    if (result.error) {
      throw new BadRequestException(result.error);
    }

    return {
      success: true,
      projectileId: result.projectile?.id,
      rangeInfo: {
        distance: Math.round(result.rangeResult.distance),
        maxRange: Math.round(result.rangeResult.maxRange),
        effectiveRange: Math.round(result.rangeResult.effectiveRange),
        rangeCategory: result.rangeResult.rangeCategory,
        accuracyModifier: result.rangeResult.accuracyModifier,
        damageModifier: result.rangeResult.damageModifier,
      },
      damage: result.projectile?.damage,
      message: "箭矢發射成功",
    };
  }

  @Post("archer/range-check")
  @ApiOperation({ summary: "檢查弓箭手射程" })
  @ApiResponse({ status: 200, description: "射程檢查結果" })
  async checkArcherRange(
    @Session() session: any,
    @Body() rangeDto: RangeCheckDto,
  ) {
    const userId = session.user.id;

    const character = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      select: {
        characterClass: true,
        dexterity: true,
        level: true,
      },
    });

    if (!character) {
      throw new NotFoundException("找不到角色資料");
    }

    const playerPosition = { x: 100, y: 100 }; // TODO: 從實際遊戲狀態獲取

    const archerParams: ArcherAttackParams = {
      characterClass: character.characterClass as CharacterClass,
      dexterity: character.dexterity,
      level: character.level,
      weaponType: rangeDto.weaponType,
      weaponQuality: rangeDto.weaponQuality,
      attackerPosition: playerPosition,
      targetPosition: rangeDto.targetPosition,
    };

    const rangeCheck = this.projectileSystem.isTargetInRange(archerParams);

    return {
      inRange: rangeCheck.inRange,
      distance: rangeCheck.distance,
      maxRange: rangeCheck.maxRange,
      rangeCategory: rangeCheck.rangeCategory,
      message: rangeCheck.inRange ? "目標在射程內" : "目標超出射程",
    };
  }

  @Get("archer/range-info/:weaponType")
  @ApiOperation({ summary: "獲取弓箭手武器射程信息" })
  @ApiResponse({ status: 200, description: "武器射程信息" })
  async getArcherRangeInfo(
    @Session() session: any,
    @Param("weaponType") weaponType: string,
    @Body() dto?: GetRangeInfoDto,
  ) {
    const userId = session.user.id;

    const character = await this.prisma.gameCharacter.findUnique({
      where: { userId },
      select: {
        characterClass: true,
        dexterity: true,
        level: true,
      },
    });

    if (!character) {
      throw new NotFoundException("找不到角色資料");
    }

    const rangeInfo = this.projectileSystem.getArcherRangeInfo(
      character.characterClass as CharacterClass,
      character.dexterity,
      character.level,
      weaponType,
      dto?.weaponQuality,
    );

    return {
      weaponName: rangeInfo.weaponName,
      maxRange: rangeInfo.maxRange,
      effectiveRange: rangeInfo.effectiveRange,
      characterLevel: character.level,
      characterDexterity: character.dexterity,
      characterClass: character.characterClass,
      bonuses: {
        dexterityBonus: Math.round(character.dexterity * 2.5), // 簡化計算
        levelBonus: character.level * 2,
        classBonus:
          character.characterClass === CharacterClass.ARCHER ? "30%" : "0%",
      },
    };
  }

  @Get("projectiles/active")
  @ApiOperation({ summary: "獲取當前活躍的投射物" })
  @ApiResponse({ status: 200, description: "活躍投射物列表" })
  async getActiveProjectiles() {
    const projectiles = this.projectileSystem.getActiveProjectiles();

    return {
      count: projectiles.length,
      projectiles: projectiles.map((p) => ({
        id: p.id,
        type: p.type,
        position: p.position,
        velocity: p.velocity,
        damage: p.damage,
        sourceType: p.sourceType,
        targetType: p.targetType,
        isActive: p.isActive,
        lifespan: p.lifespan,
        creationTime: p.creationTime,
      })),
    };
  }

  @Post("test/archer-range")
  @ApiOperation({ summary: "測試弓箭手射程計算（開發用）" })
  @ApiResponse({ status: 200, description: "射程測試結果" })
  async testArcherRange(
    @Body()
    testData: {
      characterClass: CharacterClass;
      dexterity: number;
      level: number;
      weaponType: string;
      distance: number;
    },
  ) {
    const archerParams: ArcherAttackParams = {
      characterClass: testData.characterClass,
      dexterity: testData.dexterity,
      level: testData.level,
      weaponType: testData.weaponType,
      attackerPosition: { x: 0, y: 0 },
      targetPosition: { x: testData.distance, y: 0 },
    };

    const rangeResult =
      this.projectileSystem.calculateArcherRange(archerParams);

    return {
      input: testData,
      result: {
        maxRange: Math.round(rangeResult.maxRange),
        effectiveRange: Math.round(rangeResult.effectiveRange),
        actualDistance: Math.round(rangeResult.distance),
        isInRange: rangeResult.isInRange,
        rangeCategory: rangeResult.rangeCategory,
        accuracyModifier: rangeResult.accuracyModifier,
        damageModifier: rangeResult.damageModifier,
      },
    };
  }

  /**
   * 計算基礎傷害（簡化版本）
   */
  private calculateBaseDamage(character: any): number {
    // 基礎計算：力量 + 敏捷 + 等級加成
    const baseDamage = character.dexterity * 1.5 + character.level * 2;

    // 職業加成
    if (character.characterClass === CharacterClass.ARCHER) {
      return Math.round(baseDamage * 1.2); // 弓箭手20%傷害加成
    }

    return Math.round(baseDamage);
  }
}
