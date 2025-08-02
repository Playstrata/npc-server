import { Injectable } from "@nestjs/common";
import {
  Vector2D,
  BoundingBox,
  RealtimePlayerState,
  RealtimeMonsterState,
  MovementState,
  AttackState,
  RealtimeCombatRoom,
  PlayerInputAction,
  RealtimeCombatEvent,
  RealtimeCombatEventType,
  CollisionResult,
  AttackHitResult,
  StatusEffect,
  MonsterAIState,
} from "./realtime-combat.types";
import { MonsterDefinition } from "./monsters.types";
import { MONSTERS_DATABASE } from "./monsters.database";

@Injectable()
export class RealtimeCombatEngine {
  private readonly TICK_RATE = 60; // 60 FPS 更新頻率
  private readonly ATTACK_COOLDOWNS = {
    MELEE: 1000, // 近戰攻擊冷卻 1秒
    RANGED: 1500, // 遠程攻擊冷卻 1.5秒
    MAGIC: 2000, // 魔法攻擊冷卻 2秒
  };

  /**
   * 更新戰鬥房間狀態 (主要更新循環)
   */
  updateCombatRoom(
    room: RealtimeCombatRoom,
    deltaTime: number,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];
    const currentTime = new Date();

    // 更新所有玩家狀態
    for (const [playerId, player] of room.players) {
      const playerEvents = this.updatePlayerState(
        player,
        room,
        deltaTime,
        currentTime,
      );
      events.push(...playerEvents);
    }

    // 更新所有怪物狀態
    for (const [monsterId, monster] of room.monsters) {
      const monsterEvents = this.updateMonsterState(
        monster,
        room,
        deltaTime,
        currentTime,
      );
      events.push(...monsterEvents);
    }

    // 處理狀態效果
    const statusEvents = this.updateStatusEffects(room, deltaTime, currentTime);
    events.push(...statusEvents);

    // 清理死亡的實體
    const cleanupEvents = this.cleanupDeadEntities(room, currentTime);
    events.push(...cleanupEvents);

    room.lastUpdateTime = currentTime;
    room.events.push(...events);

    return events;
  }

  /**
   * 處理玩家輸入動作
   */
  processPlayerAction(
    playerId: string,
    action: PlayerInputAction,
    room: RealtimeCombatRoom,
  ): RealtimeCombatEvent[] {
    const player = room.players.get(playerId);
    if (!player) return [];

    const events: RealtimeCombatEvent[] = [];
    const currentTime = new Date();

    switch (action.type) {
      case "MOVE":
        const moveEvents = this.handlePlayerMovement(
          player,
          action,
          room,
          currentTime,
        );
        events.push(...moveEvents);
        break;

      case "ATTACK":
        const attackEvents = this.handlePlayerAttack(
          player,
          action,
          room,
          currentTime,
        );
        events.push(...attackEvents);
        break;

      case "CAST_SKILL":
        const skillEvents = this.handlePlayerSkill(
          player,
          action,
          room,
          currentTime,
        );
        events.push(...skillEvents);
        break;

      case "STOP":
        const stopEvents = this.handlePlayerStop(player, room, currentTime);
        events.push(...stopEvents);
        break;
    }

    player.lastActionTime = currentTime;
    return events;
  }

  /**
   * 處理玩家移動
   */
  private handlePlayerMovement(
    player: RealtimePlayerState,
    action: PlayerInputAction,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    if (player.attack.isAttacking) {
      return events; // 攻擊中無法移動
    }

    if (action.data.targetPosition) {
      // 計算移動方向和速度
      const direction = this.calculateDirection(
        player.movement.position,
        action.data.targetPosition,
      );

      // 檢查目標位置是否在地圖範圍內
      if (!this.isPositionInBounds(action.data.targetPosition, room.bounds)) {
        return events;
      }

      // 更新玩家移動狀態
      player.movement.direction = direction;
      player.movement.isMoving = true;
      player.movement.velocity = this.calculateVelocity(
        direction,
        player.combatStats.moveSpeed,
      );
      player.movement.lastUpdateTime = currentTime;

      // 創建移動事件
      events.push({
        id: this.generateEventId(),
        type: RealtimeCombatEventType.PLAYER_MOVE,
        timestamp: currentTime,
        mapId: room.mapId,
        playerId: player.playerId,
        position: player.movement.position,
        data: {
          newPosition: action.data.targetPosition,
          direction,
          speed: player.combatStats.moveSpeed,
        },
      });
    }

    return events;
  }

  /**
   * 處理玩家攻擊
   */
  private handlePlayerAttack(
    player: RealtimePlayerState,
    action: PlayerInputAction,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    // 檢查是否在攻擊冷卻中
    if (
      player.attack.cooldownEndTime &&
      currentTime < player.attack.cooldownEndTime
    ) {
      return events;
    }

    // 檢查耐力是否足夠
    const staminaCost = this.calculateStaminaCost(
      action.data.attackType || "MELEE",
    );
    if (player.currentStats.stamina < staminaCost) {
      return events; // 耐力不足
    }

    // 消耗耐力
    player.currentStats.stamina -= staminaCost;

    // 設置攻擊狀態
    const attackDuration = this.getAttackDuration(
      action.data.attackType || "MELEE",
    );
    player.attack.isAttacking = true;
    player.attack.attackType = action.data.attackType || "MELEE";
    player.attack.attackStartTime = currentTime;
    player.attack.attackDuration = attackDuration;
    player.attack.targetPosition = action.data.targetPosition;
    player.attack.cooldownEndTime = new Date(
      currentTime.getTime() + this.ATTACK_COOLDOWNS[player.attack.attackType],
    );

    // 計算攻擊判定框
    player.attack.hitbox = this.calculateAttackHitbox(
      player.movement.position,
      player.movement.direction,
      player.combatStats.attackRange,
      player.attack.attackType,
    );

    // 停止移動
    player.movement.isMoving = false;
    player.movement.velocity = { x: 0, y: 0 };

    // 創建攻擊開始事件
    events.push({
      id: this.generateEventId(),
      type: RealtimeCombatEventType.PLAYER_ATTACK_START,
      timestamp: currentTime,
      mapId: room.mapId,
      playerId: player.playerId,
      position: player.movement.position,
      data: {
        attackType: player.attack.attackType,
        hitPosition: action.data.targetPosition,
      },
    });

    return events;
  }

  /**
   * 更新玩家狀態
   */
  private updatePlayerState(
    player: RealtimePlayerState,
    room: RealtimeCombatRoom,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    // 更新移動
    if (player.movement.isMoving) {
      const moveEvents = this.updatePlayerMovement(
        player,
        room,
        deltaTime,
        currentTime,
      );
      events.push(...moveEvents);
    }

    // 更新攻擊
    if (player.attack.isAttacking) {
      const attackEvents = this.updatePlayerAttack(
        player,
        room,
        deltaTime,
        currentTime,
      );
      events.push(...attackEvents);
    }

    // 恢復耐力
    const staminaRegenEvents = this.updatePlayerStamina(
      player,
      deltaTime,
      currentTime,
    );
    events.push(...staminaRegenEvents);

    return events;
  }

  /**
   * 更新玩家移動
   */
  private updatePlayerMovement(
    player: RealtimePlayerState,
    room: RealtimeCombatRoom,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    // 計算新位置
    const newPosition = {
      x:
        player.movement.position.x +
        (player.movement.velocity.x * deltaTime) / 1000,
      y:
        player.movement.position.y +
        (player.movement.velocity.y * deltaTime) / 1000,
    };

    // 邊界檢查
    if (!this.isPositionInBounds(newPosition, room.bounds)) {
      player.movement.isMoving = false;
      player.movement.velocity = { x: 0, y: 0 };
      return events;
    }

    // 碰撞檢查 (與其他實體)
    const collision = this.checkCollisionWithEntities(
      newPosition,
      player,
      room,
    );
    if (collision.hasCollision) {
      player.movement.isMoving = false;
      player.movement.velocity = { x: 0, y: 0 };
      return events;
    }

    // 更新位置
    player.movement.position = newPosition;
    player.movement.lastUpdateTime = currentTime;

    return events;
  }

  /**
   * 更新玩家攻擊
   */
  private updatePlayerAttack(
    player: RealtimePlayerState,
    room: RealtimeCombatRoom,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    // 檢查攻擊動作是否完成
    if (
      player.attack.attackStartTime &&
      currentTime.getTime() - player.attack.attackStartTime.getTime() >=
        player.attack.attackDuration
    ) {
      // 執行攻擊判定
      const hitEvents = this.executeAttackHitCheck(player, room, currentTime);
      events.push(...hitEvents);

      // 重置攻擊狀態
      player.attack.isAttacking = false;
      player.attack.attackStartTime = undefined;
      player.attack.hitbox = undefined;
    }

    return events;
  }

  /**
   * 執行攻擊命中檢查
   */
  private executeAttackHitCheck(
    player: RealtimePlayerState,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    if (!player.attack.hitbox) return events;

    // 檢查攻擊範圍內的所有怪物
    for (const [monsterId, monster] of room.monsters) {
      if (monster.currentStats.health <= 0) continue; // 跳過死亡怪物

      // 碰撞檢測
      const collision = this.checkBoundingBoxCollision(
        player.attack.hitbox,
        this.getMonsterBoundingBox(monster),
      );

      if (collision.hasCollision) {
        // 計算攻擊結果
        const hitResult = this.calculateAttackHit(player, monster, currentTime);

        if (hitResult.isHit) {
          // 造成傷害
          monster.currentStats.health = Math.max(
            0,
            monster.currentStats.health - hitResult.damage,
          );

          // 應用狀態效果
          monster.statusEffects.push(...hitResult.statusEffectsApplied);

          // 增加怪物仇恨值
          this.addMonsterAggro(monster, player.playerId, hitResult.damage);

          // 創建命中事件
          events.push({
            id: this.generateEventId(),
            type: RealtimeCombatEventType.PLAYER_ATTACK_HIT,
            timestamp: currentTime,
            mapId: room.mapId,
            playerId: player.playerId,
            monsterInstanceId: monster.instanceId,
            position: hitResult.hitPosition,
            data: {
              damage: hitResult.damage,
              isCritical: hitResult.isCritical,
              attackType: player.attack.attackType,
            },
          });

          // 傷害事件
          events.push({
            id: this.generateEventId(),
            type: RealtimeCombatEventType.DAMAGE_DEALT,
            timestamp: currentTime,
            mapId: room.mapId,
            playerId: player.playerId,
            monsterInstanceId: monster.instanceId,
            position: monster.movement.position,
            data: {
              damage: hitResult.damage,
              isCritical: hitResult.isCritical,
            },
          });

          // 檢查怪物是否死亡
          if (monster.currentStats.health <= 0) {
            events.push({
              id: this.generateEventId(),
              type: RealtimeCombatEventType.MONSTER_DEATH,
              timestamp: currentTime,
              mapId: room.mapId,
              playerId: player.playerId,
              monsterInstanceId: monster.instanceId,
              position: monster.movement.position,
              data: {},
            });
          }
        } else {
          // 攻擊失誤或被閃避
          events.push({
            id: this.generateEventId(),
            type: hitResult.isDodged
              ? RealtimeCombatEventType.PLAYER_ATTACK_MISS
              : RealtimeCombatEventType.PLAYER_ATTACK_MISS,
            timestamp: currentTime,
            mapId: room.mapId,
            playerId: player.playerId,
            monsterInstanceId: monster.instanceId,
            position: monster.movement.position,
            data: { isDodged: hitResult.isDodged },
          });
        }
      }
    }

    return events;
  }

  /**
   * 更新怪物狀態
   */
  private updateMonsterState(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    if (monster.currentStats.health <= 0) {
      return events; // 死亡怪物不更新
    }

    // 更新AI行為
    const aiEvents = this.updateMonsterAI(
      monster,
      room,
      deltaTime,
      currentTime,
    );
    events.push(...aiEvents);

    // 更新移動
    if (monster.movement.isMoving) {
      const moveEvents = this.updateMonsterMovement(
        monster,
        room,
        deltaTime,
        currentTime,
      );
      events.push(...moveEvents);
    }

    // 更新攻擊
    if (monster.attack.isAttacking) {
      const attackEvents = this.updateMonsterAttack(
        monster,
        room,
        deltaTime,
        currentTime,
      );
      events.push(...attackEvents);
    }

    return events;
  }

  /**
   * 更新怪物AI
   */
  private updateMonsterAI(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    const events: RealtimeCombatEvent[] = [];

    // 如果還沒到決策時間，跳過AI更新
    if (currentTime < monster.ai.nextDecisionTime) {
      return events;
    }

    // 設置下次決策時間
    monster.ai.nextDecisionTime = new Date(currentTime.getTime() + 500); // 0.5秒後重新決策

    // 尋找最近的玩家目標
    const nearestPlayer = this.findNearestPlayer(monster, room);

    switch (monster.ai.currentBehavior) {
      case "IDLE":
        if (
          nearestPlayer &&
          this.getDistance(
            monster.movement.position,
            nearestPlayer.movement.position,
          ) <= monster.combatStats.aggroRange
        ) {
          // 切換到追擊模式
          monster.ai.currentBehavior = "CHASE";
          monster.targetPlayerId = nearestPlayer.playerId;
          this.addMonsterAggro(monster, nearestPlayer.playerId, 0);
        } else {
          // 開始巡邏
          monster.ai.currentBehavior = "PATROL";
        }
        break;

      case "PATROL":
        const patrolEvents = this.handleMonsterPatrol(
          monster,
          room,
          currentTime,
        );
        events.push(...patrolEvents);
        break;

      case "CHASE":
        const chaseEvents = this.handleMonsterChase(monster, room, currentTime);
        events.push(...chaseEvents);
        break;

      case "ATTACK":
        const attackEvents = this.handleMonsterAttackBehavior(
          monster,
          room,
          currentTime,
        );
        events.push(...attackEvents);
        break;

      case "FLEE":
        const fleeEvents = this.handleMonsterFlee(monster, room, currentTime);
        events.push(...fleeEvents);
        break;

      case "RETURN":
        const returnEvents = this.handleMonsterReturn(
          monster,
          room,
          currentTime,
        );
        events.push(...returnEvents);
        break;
    }

    return events;
  }

  // ===================
  // 輔助方法
  // ===================

  /**
   * 計算兩點間方向角度
   */
  private calculateDirection(from: Vector2D, to: Vector2D): number {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Math.atan2(dy, dx) * (180 / Math.PI);
  }

  /**
   * 根據方向和速度計算速度向量
   */
  private calculateVelocity(direction: number, speed: number): Vector2D {
    const radians = direction * (Math.PI / 180);
    return {
      x: Math.cos(radians) * speed,
      y: Math.sin(radians) * speed,
    };
  }

  /**
   * 檢查位置是否在邊界內
   */
  private isPositionInBounds(position: Vector2D, bounds: BoundingBox): boolean {
    return (
      position.x >= bounds.x &&
      position.x <= bounds.x + bounds.width &&
      position.y >= bounds.y &&
      position.y <= bounds.y + bounds.height
    );
  }

  /**
   * 計算兩點間距離
   */
  private getDistance(point1: Vector2D, point2: Vector2D): number {
    const dx = point2.x - point1.x;
    const dy = point2.y - point1.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /**
   * 邊界框碰撞檢測
   */
  private checkBoundingBoxCollision(
    box1: BoundingBox,
    box2: BoundingBox,
  ): CollisionResult {
    const hasCollision =
      box1.x < box2.x + box2.width &&
      box1.x + box1.width > box2.x &&
      box1.y < box2.y + box2.height &&
      box1.y + box1.height > box2.y;

    return {
      hasCollision,
      distance: hasCollision
        ? 0
        : this.getDistance(
            { x: box1.x + box1.width / 2, y: box1.y + box1.height / 2 },
            { x: box2.x + box2.width / 2, y: box2.y + box2.height / 2 },
          ),
    };
  }

  /**
   * 獲取怪物邊界框
   */
  private getMonsterBoundingBox(monster: RealtimeMonsterState): BoundingBox {
    const size = 32; // 假設怪物大小為 32x32 像素
    return {
      x: monster.movement.position.x - size / 2,
      y: monster.movement.position.y - size / 2,
      width: size,
      height: size,
    };
  }

  /**
   * 計算攻擊判定框
   */
  private calculateAttackHitbox(
    position: Vector2D,
    direction: number,
    range: number,
    attackType: "MELEE" | "RANGED" | "MAGIC",
  ): BoundingBox {
    const radians = direction * (Math.PI / 180);

    switch (attackType) {
      case "MELEE":
        // 近戰攻擊：前方扇形區域
        return {
          x: position.x + (Math.cos(radians) * range) / 2 - range / 4,
          y: position.y + (Math.sin(radians) * range) / 2 - range / 4,
          width: range / 2,
          height: range / 2,
        };

      case "RANGED":
      case "MAGIC":
        // 遠程攻擊：線性區域
        return {
          x: position.x,
          y: position.y,
          width: Math.abs(Math.cos(radians) * range),
          height: Math.abs(Math.sin(radians) * range),
        };
    }
  }

  /**
   * 生成唯一事件ID
   */
  private generateEventId(): string {
    return `realtime_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // TODO: 實作其餘輔助方法
  private handlePlayerSkill(
    player: RealtimePlayerState,
    action: PlayerInputAction,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private handlePlayerStop(
    player: RealtimePlayerState,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private updatePlayerStamina(
    player: RealtimePlayerState,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private calculateStaminaCost(attackType: string): number {
    return 10;
  }
  private getAttackDuration(attackType: string): number {
    return 500;
  }
  private checkCollisionWithEntities(
    position: Vector2D,
    player: RealtimePlayerState,
    room: RealtimeCombatRoom,
  ): CollisionResult {
    return { hasCollision: false, distance: 0 };
  }
  private calculateAttackHit(
    player: RealtimePlayerState,
    monster: RealtimeMonsterState,
    currentTime: Date,
  ): AttackHitResult {
    return {
      isHit: true,
      isDodged: false,
      damage: 50,
      isCritical: false,
      statusEffectsApplied: [],
      hitPosition: monster.movement.position,
    };
  }
  private addMonsterAggro(
    monster: RealtimeMonsterState,
    playerId: string,
    damage: number,
  ): void {}
  private updateMonsterMovement(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private updateMonsterAttack(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private findNearestPlayer(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
  ): RealtimePlayerState | null {
    return null;
  }
  private handleMonsterPatrol(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private handleMonsterChase(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private handleMonsterAttackBehavior(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private handleMonsterFlee(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private handleMonsterReturn(
    monster: RealtimeMonsterState,
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private updateStatusEffects(
    room: RealtimeCombatRoom,
    deltaTime: number,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
  private cleanupDeadEntities(
    room: RealtimeCombatRoom,
    currentTime: Date,
  ): RealtimeCombatEvent[] {
    return [];
  }
}
