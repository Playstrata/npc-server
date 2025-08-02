import { Injectable, Logger, forwardRef, Inject } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AIService } from "../ai/ai.service";
import { NpcsService, FriendshipLevel } from "./npcs.service";
import {
  ContentAnalysis,
  AIResponseContext,
  DialogueResult,
  DetailedNPCProfile,
  SocialClass,
  EducationLevel,
  CulturalBackground,
} from "../ai/ai.types";

export interface PlayerDialogueRequest {
  npcId: string;
  playerId: string;
  playerMessage: string;
  location?: string;
  timeOfDay?: string;
  weather?: string;
}

export interface ConversationHistory {
  id: string;
  npcId: string;
  playerId: string;
  playerMessage: string;
  npcResponse: string;
  friendshipChange: number;
  timestamp: Date;
  contentAnalysis: ContentAnalysis;
}

@Injectable()
export class EnhancedDialogueService {
  private readonly logger = new Logger(EnhancedDialogueService.name);

  constructor(
    private prisma: PrismaService,
    private aiService: AIService,
    @Inject(forwardRef(() => NpcsService))
    private npcsService: NpcsService,
  ) {}

  /**
   * 處理玩家的自由文字對話
   */
  async processPlayerDialogue(
    request: PlayerDialogueRequest,
  ): Promise<DialogueResult> {
    this.logger.log(
      `處理玩家 ${request.playerId} 與 NPC ${request.npcId} 的對話: "${request.playerMessage}"`,
    );

    try {
      // 1. 分析玩家輸入內容
      const contentAnalysis = await this.aiService.analyzePlayerMessage(
        request.playerMessage,
      );

      // 2. 獲取 NPC 詳細資料
      const npcProfile = await this.buildDetailedNPCProfile(request.npcId);

      // 3. 獲取關係上下文
      const relationshipContext = await this.getRelationshipContext(
        request.npcId,
        request.playerId,
      );

      // 4. 建立情境上下文
      const situationalContext = this.buildSituationalContext(request);

      // 5. 獲取對話歷史
      const conversationHistory = await this.getRecentConversationHistory(
        request.npcId,
        request.playerId,
        5,
      );

      // 6. 計算容忍度
      const toleranceCalculation = this.aiService.calculateTolerance(
        npcProfile,
        relationshipContext.friendshipScore,
        contentAnalysis,
      );

      // 7. 計算友好度影響
      const friendshipImpact = this.aiService.calculateFriendshipImpact(
        contentAnalysis,
        relationshipContext.friendshipScore,
        npcProfile,
        toleranceCalculation,
      );

      // 8. 檢查 NPC 是否拒絕對話
      const shouldRefuseDialogue = this.shouldRefuseDialogue(
        contentAnalysis,
        toleranceCalculation,
        npcProfile,
      );

      if (shouldRefuseDialogue) {
        return this.createRefusalResponse(
          npcProfile,
          contentAnalysis,
          friendshipImpact,
        );
      }

      // 9. 構建 AI 回應上下文
      const aiContext: AIResponseContext = {
        npcProfile,
        relationshipContext: {
          friendshipLevel:
            relationshipContext.friendshipLevel as FriendshipLevel,
          friendshipScore: relationshipContext.friendshipScore,
          conversationHistory: conversationHistory.map(
            (h) => `玩家: ${h.playerMessage} | NPC: ${h.npcResponse}`,
          ),
          playerReputation: relationshipContext.playerReputation,
        },
        situationalContext,
        playerMessage: request.playerMessage,
        contentAnalysis,
      };

      // 10. 生成 AI 回應
      const aiResponse = await this.aiService.generateNPCResponse(aiContext);

      // 11. 更新友好度
      const newFriendshipScore = Math.max(
        0,
        Math.min(
          100,
          relationshipContext.friendshipScore + friendshipImpact.finalImpact,
        ),
      );

      await this.updateFriendship(
        request.npcId,
        request.playerId,
        newFriendshipScore,
      );

      // 12. 保存對話歷史
      await this.saveConversationHistory({
        npcId: request.npcId,
        playerId: request.playerId,
        playerMessage: request.playerMessage,
        npcResponse: aiResponse.response,
        friendshipChange: friendshipImpact.finalImpact,
        contentAnalysis,
      });

      // 13. 構建完整回應
      const dialogueResult: DialogueResult = {
        success: true,
        npcResponse: aiResponse.response,
        friendshipChange: friendshipImpact.finalImpact,
        friendshipDetails: {
          tolerance: toleranceCalculation,
          impact: friendshipImpact,
        },
        conversationContinued: aiResponse.conversationDirection === "continue",
        aiResponse,
      };

      this.logger.log(
        `對話完成，友好度變化: ${friendshipImpact.finalImpact.toFixed(2)}`,
      );

      return dialogueResult;
    } catch (error) {
      this.logger.error("處理對話時發生錯誤:", error);

      return {
        success: false,
        npcResponse: "抱歉，我現在無法與你對話。",
        friendshipChange: 0,
        friendshipDetails: {
          tolerance: {
            baseTolerance: 0,
            friendshipBonus: 0,
            finalTolerance: 0,
            penaltyCalculation: {
              contentSeverity: 0,
              baseDeduction: 0,
              toleranceReduction: 0,
              finalDeduction: 0,
            },
          },
          impact: {
            contentImpact: 0,
            relationshipModifier: 1,
            expectationPenalty: 0,
            toleranceCredit: 0,
            finalImpact: 0,
          },
        },
        conversationContinued: false,
        aiResponse: {
          response: "抱歉，我現在無法與你對話。",
          emotionalTone: "neutral",
          responseStyle: "polite",
          conversationDirection: "end",
        },
      };
    }
  }

  /**
   * 構建詳細的 NPC 檔案
   */
  private async buildDetailedNPCProfile(
    npcId: string,
  ): Promise<DetailedNPCProfile> {
    // 從現有的 NPC 服務獲取基本資料
    const basicNpcData = await this.npcsService.getNPCById(npcId);

    if (!basicNpcData) {
      throw new Error(`找不到 NPC: ${npcId}`);
    }

    // 根據 NPC ID 決定社會階層和背景（暫時硬編碼，實際應該從資料庫讀取）
    const socialClassMapping = this.getSocialClassMapping(npcId);

    const detailedProfile: DetailedNPCProfile = {
      id: basicNpcData.id,
      name: basicNpcData.name,
      socialClass: socialClassMapping.socialClass,
      education: socialClassMapping.education,
      culturalBackground: socialClassMapping.culturalBackground,
      personality: {
        traits: {
          friendliness: 5,
          curiosity: 5,
          helpfulness: 5,
          chattiness: 5,
          greediness: 3,
          trustfulness: 5,
          pride: 5,
          patience: 5,
        },
        quirks: [],
        fears: [],
        interests: [],
        speechPatterns: {
          formality: "casual",
          accent: "standard",
          catchphrases: [],
          vocabulary: "simple",
        },
      },
      currentMood: {
        currentMood: "neutral",
        energy: 7,
        stress: 3,
        satisfaction: 6,
        recentEvents: [],
      },

      dialoguePreferences: {
        preferredTopics: this.getPreferredTopics(
          socialClassMapping.socialClass,
        ),
        tabooTopics: this.getTabooTopics(socialClassMapping.socialClass),
        languagePreference: {
          formality:
            socialClassMapping.socialClass === SocialClass.NOBILITY
              ? "high"
              : socialClassMapping.socialClass === SocialClass.SCHOLAR
                ? "high"
                : socialClassMapping.socialClass === SocialClass.ROGUE
                  ? "low"
                  : "medium",
          complexity:
            socialClassMapping.education === EducationLevel.UNIVERSITY
              ? "sophisticated"
              : socialClassMapping.education === EducationLevel.ILLITERATE
                ? "simple"
                : "moderate",
        },
      },

      negotiationTraits: {
        baseStubborness: this.calculateBaseStubborness(
          basicNpcData.personality.traits,
        ),
        greedLevel: this.calculateGreedLevel(basicNpcData.personality.traits),
        emotionalInfluence: 5, // Default value
      },

      toleranceConfig: {
        inappropriateContent: this.calculateToleranceLevel(
          socialClassMapping.socialClass,
          "inappropriate",
        ),
        nonsensicalText: this.calculateToleranceLevel(
          socialClassMapping.socialClass,
          "nonsensical",
        ),
        lengthTolerance: this.calculateToleranceLevel(
          socialClassMapping.socialClass,
          "length",
        ),
        spamTolerance: this.calculateToleranceLevel(
          socialClassMapping.socialClass,
          "spam",
        ),
        hostilityTolerance: this.calculateToleranceLevel(
          socialClassMapping.socialClass,
          "hostility",
        ),
      },
    };

    return detailedProfile;
  }

  /**
   * 獲取社會階層映射
   */
  private getSocialClassMapping(npcId: string): {
    socialClass: SocialClass;
    education: EducationLevel;
    culturalBackground: CulturalBackground;
  } {
    // 根據 NPC ID 決定社會背景（實際應該從資料庫讀取）
    const mappings = {
      "npc-001": {
        // 村長
        socialClass: SocialClass.NOBILITY,
        education: EducationLevel.UNIVERSITY,
        culturalBackground: CulturalBackground.REFINED,
      },
      "npc-002": {
        // 艾莉絲（武器商人）
        socialClass: SocialClass.MERCHANT,
        education: EducationLevel.APPRENTICED,
        culturalBackground: CulturalBackground.URBAN,
      },
      "npc-003": {
        // 老賢者
        socialClass: SocialClass.SCHOLAR,
        education: EducationLevel.UNIVERSITY,
        culturalBackground: CulturalBackground.REFINED,
      },
      "npc-blacksmith-001": {
        // 鐵匠
        socialClass: SocialClass.ARTISAN,
        education: EducationLevel.APPRENTICED,
        culturalBackground: CulturalBackground.URBAN,
      },
      "npc-miner-001": {
        // 礦工
        socialClass: SocialClass.COMMONER,
        education: EducationLevel.BASIC,
        culturalBackground: CulturalBackground.RURAL,
      },
    };

    return (
      mappings[npcId] || {
        socialClass: SocialClass.COMMONER,
        education: EducationLevel.BASIC,
        culturalBackground: CulturalBackground.RURAL,
      }
    );
  }

  /**
   * 獲取偏好話題
   */
  private getPreferredTopics(socialClass: SocialClass): string[] {
    const topicMappings = {
      [SocialClass.NOBILITY]: ["政治", "藝術", "文學", "歷史"],
      [SocialClass.SCHOLAR]: ["學術", "魔法", "研究", "書籍"],
      [SocialClass.MERCHANT]: ["貿易", "金錢", "商業", "利潤"],
      [SocialClass.ARTISAN]: ["手工藝", "技能", "工具", "品質"],
      [SocialClass.COMMONER]: ["天氣", "農作", "家庭", "日常生活"],
      [SocialClass.ROGUE]: ["賭博", "酒", "八卦", "冒險"],
      [SocialClass.OUTLAW]: ["戰鬥", "自由", "反抗", "生存"],
    };

    return topicMappings[socialClass] || ["日常生活"];
  }

  /**
   * 獲取禁忌話題
   */
  private getTabooTopics(socialClass: SocialClass): string[] {
    const tabooMappings = {
      [SocialClass.NOBILITY]: ["貧窮", "粗俗言論", "革命"],
      [SocialClass.SCHOLAR]: ["反智", "迷信", "暴力"],
      [SocialClass.MERCHANT]: ["虧損", "破產", "免費"],
      [SocialClass.ARTISAN]: ["劣質工藝", "機械化", "廉價替代"],
      [SocialClass.COMMONER]: ["高深理論", "奢侈品", "政治陰謀"],
      [SocialClass.ROGUE]: ["道德說教", "法律", "正義"],
      [SocialClass.OUTLAW]: ["投降", "束縛", "權威"],
    };

    return tabooMappings[socialClass] || [];
  }

  /**
   * 計算基礎固執程度
   */
  private calculateBaseStubborness(traits: any): number {
    const confidence = traits.confidence || 5;
    const patience = traits.patience || 5;
    return Math.max(0, Math.min(10, confidence - patience + 5));
  }

  /**
   * 計算貪婪程度
   */
  private calculateGreedLevel(traits: any): number {
    const greed = traits.greed || 3;
    const generosity = traits.generosity || 5;
    return Math.max(0, Math.min(10, greed * 2 - generosity));
  }

  /**
   * 計算容忍度等級
   */
  private calculateToleranceLevel(
    socialClass: SocialClass,
    toleranceType: string,
  ): number {
    const baseLevels = {
      [SocialClass.NOBILITY]: {
        inappropriate: 0,
        nonsensical: 2,
        length: 7,
        spam: 1,
        hostility: 0,
      },
      [SocialClass.SCHOLAR]: {
        inappropriate: 1,
        nonsensical: 1,
        length: 9,
        spam: 2,
        hostility: 2,
      },
      [SocialClass.MERCHANT]: {
        inappropriate: 3,
        nonsensical: 4,
        length: 5,
        spam: 3,
        hostility: 4,
      },
      [SocialClass.ARTISAN]: {
        inappropriate: 4,
        nonsensical: 5,
        length: 6,
        spam: 4,
        hostility: 5,
      },
      [SocialClass.COMMONER]: {
        inappropriate: 5,
        nonsensical: 6,
        length: 5,
        spam: 5,
        hostility: 6,
      },
      [SocialClass.ROGUE]: {
        inappropriate: 8,
        nonsensical: 7,
        length: 4,
        spam: 7,
        hostility: 8,
      },
      [SocialClass.OUTLAW]: {
        inappropriate: 10,
        nonsensical: 8,
        length: 3,
        spam: 8,
        hostility: 10,
      },
    };

    return baseLevels[socialClass]?.[toleranceType] || 5;
  }

  /**
   * 獲取關係上下文
   */
  private async getRelationshipContext(npcId: string, playerId: string) {
    const friendship = await this.npcsService.calculateFriendshipInfo(
      npcId,
      playerId,
    );

    return {
      friendshipLevel: friendship.level || "NEUTRAL",
      friendshipScore: friendship.score || 50,
      playerReputation: 50, // 暫時固定值，實際應該從玩家數據讀取
    };
  }

  /**
   * 建立情境上下文
   */
  private buildSituationalContext(request: PlayerDialogueRequest) {
    const now = new Date();
    const hour = now.getHours();

    let timeOfDay: string;
    if (hour >= 6 && hour < 12) timeOfDay = "早晨";
    else if (hour >= 12 && hour < 18) timeOfDay = "下午";
    else if (hour >= 18 && hour < 22) timeOfDay = "傍晚";
    else timeOfDay = "夜晚";

    return {
      timeOfDay: request.timeOfDay || timeOfDay,
      location: request.location || "村莊中央",
      weather: request.weather || "晴朗",
      npcCurrentActivity: this.getNPCCurrentActivity(hour),
    };
  }

  /**
   * 獲取 NPC 當前活動
   */
  private getNPCCurrentActivity(hour: number): string {
    if (hour >= 6 && hour < 9) return "準備開始一天的工作";
    else if (hour >= 9 && hour < 12) return "工作中";
    else if (hour >= 12 && hour < 14) return "休息用餐";
    else if (hour >= 14 && hour < 18) return "忙於工作";
    else if (hour >= 18 && hour < 20) return "整理收尾";
    else if (hour >= 20 && hour < 22) return "放鬆休閒";
    else return "準備休息";
  }

  /**
   * 獲取近期對話歷史
   */
  private async getRecentConversationHistory(
    npcId: string,
    playerId: string,
    limit: number = 5,
  ): Promise<ConversationHistory[]> {
    // 實際應該從資料庫讀取，這裡返回空陣列
    return [];
  }

  /**
   * 檢查是否應該拒絕對話
   */
  private shouldRefuseDialogue(
    contentAnalysis: ContentAnalysis,
    toleranceCalculation: any,
    npcProfile: DetailedNPCProfile,
  ): boolean {
    // 如果內容過於不當且超出容忍範圍
    if (
      contentAnalysis.contentType === "inappropriate" &&
      toleranceCalculation.finalTolerance < 2
    ) {
      return true;
    }

    // 如果是垃圾信息且NPC不容忍
    if (
      contentAnalysis.contentType === "spam" &&
      npcProfile.toleranceConfig.spamTolerance < 3
    ) {
      return true;
    }

    // 如果內容過長且NPC不耐煩
    if (
      contentAnalysis.contentFeatures.approximateLength === "excessive" &&
      npcProfile.toleranceConfig.lengthTolerance < 4
    ) {
      return true;
    }

    return false;
  }

  /**
   * 創建拒絕回應
   */
  private createRefusalResponse(
    npcProfile: DetailedNPCProfile,
    contentAnalysis: ContentAnalysis,
    friendshipImpact: any,
  ): DialogueResult {
    let refusalMessage = "我不想繼續這個話題。";

    switch (npcProfile.socialClass) {
      case SocialClass.NOBILITY:
        refusalMessage = "這種言論實在不合適，請您保持應有的禮貌。";
        break;
      case SocialClass.SCHOLAR:
        refusalMessage = "我們的對話應該更有建設性，請重新考慮您的表達方式。";
        break;
      case SocialClass.ROGUE:
        refusalMessage = "哈！你這話太無聊了，說點有意思的。";
        break;
      case SocialClass.OUTLAW:
        refusalMessage = "別浪費我的時間。";
        break;
    }

    return {
      success: true,
      npcResponse: refusalMessage,
      friendshipChange: friendshipImpact.finalImpact,
      friendshipDetails: {
        tolerance: {
          baseTolerance: 0,
          friendshipBonus: 0,
          finalTolerance: 0,
          penaltyCalculation: {
            contentSeverity: 5,
            baseDeduction: 5,
            toleranceReduction: 0,
            finalDeduction: 5,
          },
        },
        impact: friendshipImpact,
      },
      conversationContinued: false,
      aiResponse: {
        response: refusalMessage,
        emotionalTone: "disapproving",
        responseStyle: "dismissive",
        conversationDirection: "end",
      },
    };
  }

  /**
   * 更新友好度
   */
  private async updateFriendship(
    npcId: string,
    playerId: string,
    newScore: number,
  ): Promise<void> {
    try {
      // TODO: Implement friendship score update
      // await this.npcsService.updateFriendshipScore(npcId, playerId, newScore);
    } catch (error) {
      this.logger.error("更新友好度失敗:", error);
    }
  }

  /**
   * 保存對話歷史
   */
  private async saveConversationHistory(historyData: {
    npcId: string;
    playerId: string;
    playerMessage: string;
    npcResponse: string;
    friendshipChange: number;
    contentAnalysis: ContentAnalysis;
  }): Promise<void> {
    try {
      // 實際應該保存到資料庫
      this.logger.log(
        `保存對話歷史: NPC ${historyData.npcId} <-> Player ${historyData.playerId}`,
      );
    } catch (error) {
      this.logger.error("保存對話歷史失敗:", error);
    }
  }
}
