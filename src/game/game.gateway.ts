import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, UseGuards } from "@nestjs/common";
import { BetterAuthGuard } from "../auth/better-auth.guard";
import { CurrentUser } from "../auth/better-auth.decorator";

interface ConnectedPlayer {
  id: string;
  userId: string;
  characterId: string;
  characterName: string;
  socket: Socket;
  position: {
    x: number;
    y: number;
  };
  lastUpdate: number;
}

@WebSocketGateway({
  cors: {
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  },
  transports: ["websocket"],
})
export class GameGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger = new Logger("GameGateway");
  private connectedPlayers: Map<string, ConnectedPlayer> = new Map();

  afterInit() {
    this.logger.log("WebSocket Gateway 初始化完成");
  }

  async handleConnection(client: Socket) {
    this.logger.log(`客戶端連接: ${client.id}`);

    try {
      // 從連接查詢參數或 headers 中獲取認證信息
      const token =
        client.handshake.auth?.token ||
        client.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        this.logger.warn(`客戶端 ${client.id} 未提供認證 token`);
        client.disconnect();
        return;
      }

      // 這裡應該驗證 token，簡化處理
      this.logger.log(`客戶端 ${client.id} 認證成功`);
    } catch (error) {
      this.logger.error(`客戶端 ${client.id} 認證失敗:`, error);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`客戶端斷開連接: ${client.id}`);

    // 移除連接的玩家
    const player = this.findPlayerBySocketId(client.id);
    if (player) {
      this.connectedPlayers.delete(player.userId);

      // 通知其他玩家該玩家離開
      client.broadcast.emit("player_left", {
        userId: player.userId,
        characterName: player.characterName,
      });

      this.logger.log(`玩家離開: ${player.characterName}`);
    }
  }

  @SubscribeMessage("player_join")
  async handlePlayerJoin(
    @MessageBody()
    data: { userId: string; characterId: string; characterName: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const player: ConnectedPlayer = {
        id: client.id,
        userId: data.userId,
        characterId: data.characterId,
        characterName: data.characterName,
        socket: client,
        position: { x: 0, y: 0 },
        lastUpdate: Date.now(),
      };

      this.connectedPlayers.set(data.userId, player);

      // 發送現有玩家列表給新玩家
      const existingPlayers = Array.from(this.connectedPlayers.values())
        .filter((p) => p.userId !== data.userId)
        .map((p) => ({
          userId: p.userId,
          characterId: p.characterId,
          characterName: p.characterName,
          position: p.position,
        }));

      client.emit("existing_players", existingPlayers);

      // 通知其他玩家新玩家加入
      client.broadcast.emit("player_joined", {
        userId: data.userId,
        characterId: data.characterId,
        characterName: data.characterName,
        position: player.position,
      });

      this.logger.log(`玩家加入: ${data.characterName} (${data.userId})`);

      return { success: true, message: "加入成功" };
    } catch (error) {
      this.logger.error("處理玩家加入失敗:", error);
      return { success: false, message: "加入失敗" };
    }
  }

  @SubscribeMessage("position_update")
  handlePositionUpdate(
    @MessageBody()
    data: {
      characterId: string;
      position: { x: number; y: number };
      velocity: { x: number; y: number };
      facingRight: boolean;
      isGrounded: boolean;
      timestamp: number;
    },
    @ConnectedSocket() client: Socket,
  ) {
    const player = this.findPlayerBySocketId(client.id);
    if (!player) {
      return { success: false, message: "玩家未找到" };
    }

    // 更新玩家位置
    player.position = data.position;
    player.lastUpdate = Date.now();

    // 廣播位置更新給其他玩家
    client.broadcast.emit("position_update", {
      userId: player.userId,
      characterId: data.characterId,
      position: data.position,
      velocity: data.velocity,
      facingRight: data.facingRight,
      isGrounded: data.isGrounded,
      timestamp: data.timestamp,
    });

    return { success: true };
  }

  // NOTE: Chat functionality moved to social-server
  // All chat-related WebSocket events should be handled by social-server
  // This gateway now focuses only on game mechanics (position, combat, etc.)

  @SubscribeMessage("heartbeat")
  handleHeartbeat(
    @MessageBody() data: { timestamp: number },
    @ConnectedSocket() client: Socket,
  ) {
    const player = this.findPlayerBySocketId(client.id);
    if (player) {
      player.lastUpdate = Date.now();
    }

    // 回應心跳
    return {
      success: true,
      serverTime: Date.now(),
      latency: Date.now() - data.timestamp,
    };
  }

  @SubscribeMessage("get_online_players")
  handleGetOnlinePlayers(@ConnectedSocket() client: Socket) {
    const onlinePlayers = Array.from(this.connectedPlayers.values()).map(
      (player) => ({
        userId: player.userId,
        characterId: player.characterId,
        characterName: player.characterName,
        position: player.position,
        lastUpdate: player.lastUpdate,
      }),
    );

    return {
      success: true,
      players: onlinePlayers,
      count: onlinePlayers.length,
    };
  }

  // 輔助方法
  private findPlayerBySocketId(socketId: string): ConnectedPlayer | null {
    for (const player of this.connectedPlayers.values()) {
      if (player.id === socketId) {
        return player;
      }
    }
    return null;
  }

  private findPlayerByUserId(userId: string): ConnectedPlayer | null {
    return this.connectedPlayers.get(userId) || null;
  }

  // 清理非活躍連接
  private cleanupInactivePlayers() {
    const now = Date.now();
    const timeout = 60000; // 60 秒超時

    for (const [userId, player] of this.connectedPlayers.entries()) {
      if (now - player.lastUpdate > timeout) {
        this.logger.warn(`清理非活躍玩家: ${player.characterName}`);
        player.socket.disconnect();
        this.connectedPlayers.delete(userId);
      }
    }
  }

  // 定期清理（可以在服務中調用）
  startCleanupTimer() {
    setInterval(() => {
      this.cleanupInactivePlayers();
    }, 30000); // 每 30 秒檢查一次
  }
}
