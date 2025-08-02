import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Param,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { AuthGuard, Session } from "@thallesp/nestjs-better-auth";
import {
  EnhancedDialogueService,
  PlayerDialogueRequest,
} from "./enhanced-dialogue.service";
import { DialogueResult } from "../ai/ai.types";

export interface DialogueRequestDto {
  npcId: string;
  message: string;
  location?: string;
  timeOfDay?: string;
  weather?: string;
}

export interface DialogueHistoryDto {
  npcId: string;
  limit?: number;
}

@Controller("dialogue")
@UseGuards(AuthGuard)
export class EnhancedDialogueController {
  constructor(private enhancedDialogueService: EnhancedDialogueService) {}

  /**
   * 處理玩家的自由文字對話
   * POST /dialogue/chat
   */
  @Post("chat")
  async chatWithNPC(
    @Body() dialogueRequest: DialogueRequestDto,
    @Session() session: any,
  ): Promise<{
    success: boolean;
    data?: DialogueResult;
    error?: string;
  }> {
    try {
      // 驗證輸入
      if (!dialogueRequest.npcId || !dialogueRequest.message) {
        throw new HttpException(
          "缺少必要參數：npcId 和 message",
          HttpStatus.BAD_REQUEST,
        );
      }

      // 檢查訊息長度限制
      if (dialogueRequest.message.length > 500) {
        throw new HttpException(
          "訊息過長，請限制在500字以內",
          HttpStatus.BAD_REQUEST,
        );
      }

      // 檢查訊息是否為空或只有空白
      if (dialogueRequest.message.trim().length === 0) {
        throw new HttpException("訊息不能為空", HttpStatus.BAD_REQUEST);
      }

      const playerId = session.user.userId; // 從 JWT token 中獲取用戶ID

      const playerDialogueRequest: PlayerDialogueRequest = {
        npcId: dialogueRequest.npcId,
        playerId: playerId,
        playerMessage: dialogueRequest.message.trim(),
        location: dialogueRequest.location,
        timeOfDay: dialogueRequest.timeOfDay,
        weather: dialogueRequest.weather,
      };

      const result = await this.enhancedDialogueService.processPlayerDialogue(
        playerDialogueRequest,
      );

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        error: error.message || "處理對話時發生未知錯誤",
      };
    }
  }

  /**
   * 獲取與特定 NPC 的對話歷史
   * GET /dialogue/history/:npcId
   */
  @Get("history/:npcId")
  async getDialogueHistory(
    @Param("npcId") npcId: string,
    @Session() session: any,
  ): Promise<{
    success: boolean;
    data?: any[];
    error?: string;
  }> {
    try {
      if (!npcId) {
        throw new HttpException("缺少 NPC ID", HttpStatus.BAD_REQUEST);
      }

      const playerId = session.user.userId;

      // 目前返回空陣列，實際實現時應該從資料庫獲取歷史記錄
      const history = [];

      return {
        success: true,
        data: history,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        error: error.message || "獲取對話歷史時發生錯誤",
      };
    }
  }

  /**
   * 獲取所有可對話的 NPC 列表
   * GET /dialogue/available-npcs
   */
  @Get("available-npcs")
  async getAvailableNPCs(@Session() session: any): Promise<{
    success: boolean;
    data?: Array<{
      id: string;
      name: string;
      location: string;
      socialClass: string;
      isAvailable: boolean;
      friendshipLevel: string;
    }>;
    error?: string;
  }> {
    try {
      // 返回可對話的 NPC 列表（暫時硬編碼）
      const availableNPCs = [
        {
          id: "npc-001",
          name: "村長",
          location: "村莊中央",
          socialClass: "貴族",
          isAvailable: true,
          friendshipLevel: "NEUTRAL",
        },
        {
          id: "npc-002",
          name: "艾莉絲",
          location: "武器商店",
          socialClass: "商人",
          isAvailable: true,
          friendshipLevel: "NEUTRAL",
        },
        {
          id: "npc-003",
          name: "老賢者",
          location: "圖書館",
          socialClass: "學者",
          isAvailable: true,
          friendshipLevel: "NEUTRAL",
        },
        {
          id: "npc-blacksmith-001",
          name: "鐵匠",
          location: "鐵匠鋪",
          socialClass: "工匠",
          isAvailable: true,
          friendshipLevel: "NEUTRAL",
        },
        {
          id: "npc-miner-001",
          name: "礦工",
          location: "礦場",
          socialClass: "平民",
          isAvailable: true,
          friendshipLevel: "NEUTRAL",
        },
      ];

      return {
        success: true,
        data: availableNPCs,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message || "獲取 NPC 列表時發生錯誤",
      };
    }
  }

  /**
   * 獲取 NPC 的詳細資訊（包含社會背景）
   * GET /dialogue/npc/:npcId/profile
   */
  @Get("npc/:npcId/profile")
  async getNPCProfile(
    @Param("npcId") npcId: string,
    @Session() session: any,
  ): Promise<{
    success: boolean;
    data?: {
      id: string;
      name: string;
      socialClass: string;
      education: string;
      culturalBackground: string;
      personality: any;
      currentMood: any;
      friendshipLevel: string;
      friendshipScore: number;
      preferredTopics: string[];
      tabooTopics: string[];
    };
    error?: string;
  }> {
    try {
      if (!npcId) {
        throw new HttpException("缺少 NPC ID", HttpStatus.BAD_REQUEST);
      }

      // 暫時返回模擬數據，實際應該通過 EnhancedDialogueService 獲取詳細檔案
      const mockProfile = {
        id: npcId,
        name: this.getNPCName(npcId),
        socialClass: this.getSocialClassName(npcId),
        education: this.getEducationName(npcId),
        culturalBackground: this.getCulturalBackgroundName(npcId),
        personality: {
          traits: {
            friendliness: 6,
            curiosity: 5,
            helpfulness: 7,
            chattiness: 4,
            patience: 6,
          },
        },
        currentMood: {
          currentMood: "CONTENT",
          energy: 7,
          sociability: 6,
        },
        friendshipLevel: "NEUTRAL",
        friendshipScore: 50,
        preferredTopics: this.getPreferredTopics(npcId),
        tabooTopics: this.getTabooTopics(npcId),
      };

      return {
        success: true,
        data: mockProfile,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      return {
        success: false,
        error: error.message || "獲取 NPC 資料時發生錯誤",
      };
    }
  }

  // 輔助方法
  private getNPCName(npcId: string): string {
    const names = {
      "npc-001": "村長",
      "npc-002": "艾莉絲",
      "npc-003": "老賢者",
      "npc-blacksmith-001": "鐵匠",
      "npc-miner-001": "礦工",
    };
    return names[npcId] || "未知NPC";
  }

  private getSocialClassName(npcId: string): string {
    const classes = {
      "npc-001": "貴族",
      "npc-002": "商人",
      "npc-003": "學者",
      "npc-blacksmith-001": "工匠",
      "npc-miner-001": "平民",
    };
    return classes[npcId] || "平民";
  }

  private getEducationName(npcId: string): string {
    const education = {
      "npc-001": "大學程度",
      "npc-002": "學徒出身",
      "npc-003": "大學程度",
      "npc-blacksmith-001": "學徒出身",
      "npc-miner-001": "基礎教育",
    };
    return education[npcId] || "基礎教育";
  }

  private getCulturalBackgroundName(npcId: string): string {
    const backgrounds = {
      "npc-001": "精緻文化",
      "npc-002": "都市文化",
      "npc-003": "精緻文化",
      "npc-blacksmith-001": "都市文化",
      "npc-miner-001": "鄉村文化",
    };
    return backgrounds[npcId] || "鄉村文化";
  }

  private getPreferredTopics(npcId: string): string[] {
    const topics = {
      "npc-001": ["政治", "管理", "村莊發展", "法律"],
      "npc-002": ["武器", "貿易", "金錢", "冒險裝備"],
      "npc-003": ["魔法", "學術", "古代歷史", "研究"],
      "npc-blacksmith-001": ["鍛造", "金屬工藝", "武器製作", "工具"],
      "npc-miner-001": ["挖礦", "礦石", "地質", "勞動"],
    };
    return topics[npcId] || ["日常生活"];
  }

  private getTabooTopics(npcId: string): string[] {
    const taboos = {
      "npc-001": ["叛亂", "違法行為", "腐敗指控"],
      "npc-002": ["免費贈送", "虧本生意", "競爭對手"],
      "npc-003": ["反智言論", "迷信", "學術造假"],
      "npc-blacksmith-001": ["劣質工藝", "廉價替代品", "機械化"],
      "npc-miner-001": ["礦場安全問題", "工資剝削", "危險作業"],
    };
    return taboos[npcId] || [];
  }
}
