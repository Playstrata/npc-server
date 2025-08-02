import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { NpcsService } from "./npcs.service";
import { BetterAuthGuard } from "../auth/better-auth.guard";
import { UserId } from "../auth/better-auth.decorator";

@ApiTags("npcs")
@Controller("npcs")
@UseGuards(BetterAuthGuard)
@ApiBearerAuth()
export class NpcsController {
  constructor(private readonly npcsService: NpcsService) {}

  @Get()
  @ApiOperation({ summary: "獲取所有NPC列表" })
  @ApiResponse({ status: 200, description: "成功獲取NPC列表" })
  @ApiQuery({
    name: "mapId",
    required: false,
    description: "過濾特定地圖的NPC",
  })
  async getAllNPCs(@Query("mapId") mapId?: string) {
    const npcs = await this.npcsService.getAllNPCs();

    if (mapId) {
      return npcs.filter((npc) => npc.location.mapId === mapId);
    }

    return npcs;
  }

  @Get("nearby")
  @ApiOperation({ summary: "獲取附近的NPC" })
  @ApiResponse({ status: 200, description: "成功獲取附近NPC" })
  @ApiQuery({ name: "mapId", required: true, description: "地圖ID" })
  @ApiQuery({ name: "x", required: true, description: "X座標" })
  @ApiQuery({ name: "y", required: true, description: "Y座標" })
  @ApiQuery({
    name: "radius",
    required: false,
    description: "搜索半徑，預設100",
  })
  async getNearbyNPCs(
    @Query("mapId") mapId: string,
    @Query("x") x: number,
    @Query("y") y: number,
    @Query("radius") radius?: number,
  ) {
    return this.npcsService.getNPCsByLocation(
      mapId,
      Number(x),
      Number(y),
      radius ? Number(radius) : 100,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "獲取特定NPC詳細資訊" })
  @ApiParam({ name: "id", description: "NPC ID" })
  @ApiResponse({ status: 200, description: "成功獲取NPC詳細資訊" })
  @ApiResponse({ status: 404, description: "NPC 不存在" })
  async getNPCById(@Param("id") npcId: string) {
    const npc = await this.npcsService.getNPCById(npcId);

    if (!npc) {
      throw new Error("NPC 不存在");
    }

    // 不返回敏感資訊如完整的relationships
    const { relationships, ...publicNPCData } = npc;
    return publicNPCData;
  }

  @Post(":id/interact")
  @ApiOperation({ summary: "與NPC互動對話" })
  @ApiParam({ name: "id", description: "NPC ID" })
  @ApiResponse({ status: 200, description: "成功與NPC互動" })
  @ApiResponse({ status: 404, description: "NPC 不存在" })
  async interactWithNPC(
    @Param("id") npcId: string,
    @UserId() userId: string,
    @Body()
    interactionData: {
      dialogueId?: string;
      action?: string;
    },
  ) {
    const dialogueId = interactionData.dialogueId || "greeting";

    const result = await this.npcsService.interactWithNPC(
      npcId,
      userId,
      dialogueId,
    );

    return {
      npc: {
        id: result.npc.id,
        name: result.npc.name,
        type: result.npc.type,
        appearance: result.npc.appearance,
        personality: result.npc.personality,
      },
      dialogue: result.dialogue,
      relationship: result.relationship,
    };
  }

  @Get(":id/shop")
  @ApiOperation({ summary: "獲取NPC商店資訊" })
  @ApiParam({ name: "id", description: "NPC ID" })
  @ApiResponse({ status: 200, description: "成功獲取商店資訊" })
  @ApiResponse({ status: 400, description: "此NPC沒有商店" })
  @ApiResponse({ status: 404, description: "NPC 不存在" })
  async getNPCShop(@Param("id") npcId: string, @UserId() userId: string) {
    return this.npcsService.getNPCShop(npcId, userId);
  }

  @Post(":id/shop/buy")
  @ApiOperation({ summary: "從NPC商店購買物品" })
  @ApiParam({ name: "id", description: "NPC ID" })
  @ApiResponse({ status: 200, description: "購買成功" })
  @ApiResponse({ status: 400, description: "購買失敗（金錢不足、庫存不足等）" })
  async buyFromNPC(
    @Param("id") npcId: string,
    @UserId() userId: string,
    @Body()
    purchaseData: {
      itemId: string;
      quantity: number;
    },
  ) {
    return this.npcsService.buyFromNPC(
      npcId,
      userId,
      purchaseData.itemId,
      purchaseData.quantity,
    );
  }

  @Get(":id/quests")
  @ApiOperation({ summary: "獲取NPC提供的任務" })
  @ApiParam({ name: "id", description: "NPC ID" })
  @ApiResponse({ status: 200, description: "成功獲取NPC任務" })
  async getNPCQuests(@Param("id") npcId: string) {
    const npc = await this.npcsService.getNPCById(npcId);

    if (!npc) {
      throw new Error("NPC 不存在");
    }

    // 返回NPC可提供的任務ID列表
    // 實際的任務資料應該通過 /quests 端點獲取
    return {
      npcId: npc.id,
      npcName: npc.name,
      availableQuests: npc.quests,
    };
  }

  @Post(":id/quests/generate")
  @ApiOperation({ summary: "基於NPC職業生成日常任務" })
  @ApiParam({ name: "id", description: "NPC ID" })
  @ApiResponse({ status: 200, description: "成功生成職業相關任務" })
  async generateProfessionQuests(@Param("id") npcId: string) {
    const quests = await this.npcsService.generateProfessionBasedQuests(npcId);

    return {
      npcId,
      generatedQuests: quests,
      count: quests.length,
    };
  }

  @Get("statistics/summary")
  @ApiOperation({ summary: "獲取NPC統計摘要" })
  @ApiResponse({ status: 200, description: "成功獲取NPC統計" })
  async getNPCStatistics() {
    const npcs = await this.npcsService.getAllNPCs();

    const statistics = {
      totalNPCs: npcs.length,
      byType: npcs.reduce(
        (acc, npc) => {
          acc[npc.type] = (acc[npc.type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>,
      ),
      byProfession: npcs.reduce(
        (acc, npc) => {
          if (npc.profession) {
            acc[npc.profession] = (acc[npc.profession] || 0) + 1;
          }
          return acc;
        },
        {} as Record<string, number>,
      ),
      averageLevel: Math.round(
        npcs.reduce((sum, npc) => sum + npc.level, 0) / npcs.length,
      ),
      withShops: npcs.filter((npc) => npc.shop).length,
      questGivers: npcs.filter((npc) => npc.quests.length > 0).length,
    };

    return statistics;
  }

  @Post("daily-update")
  @ApiOperation({ summary: "執行NPC每日狀態更新" })
  @ApiResponse({ status: 200, description: "每日更新完成" })
  async performDailyUpdate() {
    await this.npcsService.updateDailyStatus();

    return {
      message: "NPC 每日狀態更新完成",
      timestamp: new Date(),
    };
  }

  // 管理員專用端點（可以添加額外的權限檢查）
  @Get(":id/relationships")
  @ApiOperation({ summary: "獲取NPC與所有玩家的關係（管理員用）" })
  @ApiParam({ name: "id", description: "NPC ID" })
  @ApiResponse({ status: 200, description: "成功獲取關係資料" })
  async getNPCRelationships(@Param("id") npcId: string) {
    const npc = await this.npcsService.getNPCById(npcId);

    if (!npc) {
      throw new Error("NPC 不存在");
    }

    // 這裡可以添加管理員權限檢查
    // if (!isAdmin) throw new UnauthorizedException();

    return {
      npcId: npc.id,
      npcName: npc.name,
      relationships: Object.entries(npc.relationships).map(
        ([playerId, relationship]) => ({
          playerId,
          reputation: relationship.reputation,
          lastInteraction: relationship.lastInteraction,
        }),
      ),
    };
  }

  /**
   * 村莊聲譽系統 API
   */

  @Get(":playerId/village-reputation")
  @ApiOperation({ summary: "獲取玩家在村莊中的聲譽" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiResponse({
    status: 200,
    description: "村莊聲譽信息",
    schema: {
      type: "object",
      properties: {
        overallReputation: { type: "number", description: "總體聲譽值" },
        reputationLevel: {
          type: "string",
          enum: ["hero", "popular", "neutral", "disliked", "enemy"],
          description: "聲譽等級",
        },
        npcOpinions: {
          type: "array",
          description: "NPC 個別意見",
          items: {
            type: "object",
            properties: {
              npcId: { type: "string" },
              npcName: { type: "string" },
              impression: { type: "number" },
              knownEventsCount: { type: "number" },
              lastUpdate: { type: "string", format: "date-time" },
            },
          },
        },
      },
    },
  })
  async getVillageReputation(@Param("playerId") playerId: string) {
    try {
      const reputation = await this.npcsService.getVillageReputation(playerId);

      return {
        success: true,
        data: reputation,
        message: `玩家 ${playerId} 的村莊聲譽: ${reputation.reputationLevel}`,
      };
    } catch (error) {
      console.error("[NpcsController] 獲取村莊聲譽失敗:", error);
      throw new NotFoundException("無法獲取村莊聲譽信息");
    }
  }

  @Post("broadcast-news")
  @ApiOperation({ summary: "廣播村莊消息（測試用）" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        playerId: { type: "string", description: "玩家ID" },
        newsType: {
          type: "string",
          enum: [
            "quest_completed",
            "quest_failed",
            "trade_success",
            "rude_behavior",
            "helpful_action",
          ],
          description: "消息類型",
        },
        sourceNpcId: { type: "string", description: "消息來源NPC ID" },
        description: { type: "string", description: "事件描述" },
        impact: { type: "number", description: "影響值 (-10 到 +10)" },
      },
      required: [
        "playerId",
        "newsType",
        "sourceNpcId",
        "description",
        "impact",
      ],
    },
  })
  @ApiResponse({ status: 200, description: "消息廣播成功" })
  async broadcastNews(
    @Body()
    broadcastDto: {
      playerId: string;
      newsType:
        | "quest_completed"
        | "quest_failed"
        | "trade_success"
        | "rude_behavior"
        | "helpful_action";
      sourceNpcId: string;
      description: string;
      impact: number;
    },
  ) {
    try {
      await this.npcsService.broadcastVillageNews(
        broadcastDto.playerId,
        broadcastDto.newsType,
        broadcastDto.sourceNpcId,
        broadcastDto.description,
        broadcastDto.impact,
      );

      return {
        success: true,
        message: "村莊消息廣播成功",
        data: {
          playerId: broadcastDto.playerId,
          newsType: broadcastDto.newsType,
          impact: broadcastDto.impact,
        },
      };
    } catch (error) {
      console.error("[NpcsController] 廣播消息失敗:", error);
      throw new BadRequestException("廣播消息失敗");
    }
  }

  @Get(":npcId/adjusted-price/:playerId/:basePrice")
  @ApiOperation({ summary: "根據村莊聲譽獲取調整後的商品價格" })
  @ApiParam({ name: "npcId", description: "NPC ID" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiParam({ name: "basePrice", description: "基礎價格" })
  @ApiResponse({
    status: 200,
    description: "調整後的價格",
    schema: {
      type: "object",
      properties: {
        basePrice: { type: "number" },
        adjustedPrice: { type: "number" },
        discount: { type: "number" },
        reason: { type: "string" },
      },
    },
  })
  async getAdjustedPrice(
    @Param("npcId") npcId: string,
    @Param("playerId") playerId: string,
    @Param("basePrice") basePrice: string,
  ) {
    try {
      const basePriceNum = parseInt(basePrice);
      const adjustedPrice = await this.npcsService.getAdjustedPrice(
        npcId,
        playerId,
        basePriceNum,
      );
      const adjustedPriceNum = Number(adjustedPrice) || basePriceNum;
      const discount = Math.round(
        ((basePriceNum - adjustedPriceNum) / basePriceNum) * 100,
      );

      let reason = "正常價格";
      if (discount > 0) {
        reason = `好感度折扣 ${discount}%`;
      } else if (discount < 0) {
        reason = `聲譽不佳加價 ${Math.abs(discount)}%`;
      }

      return {
        success: true,
        data: {
          basePrice: basePriceNum,
          adjustedPrice: adjustedPriceNum,
          discount,
          reason,
        },
      };
    } catch (error) {
      console.error("[NpcsController] 獲取調整價格失敗:", error);
      throw new BadRequestException("無法計算調整價格");
    }
  }

  @Post(":npcId/dynamic-dialogue/:playerId")
  @ApiOperation({ summary: "生成基於村莊聲譽的動態對話" })
  @ApiParam({ name: "npcId", description: "NPC ID" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        timeOfDay: {
          type: "string",
          enum: ["morning", "afternoon", "evening", "night"],
          description: "時間段",
        },
        weather: {
          type: "string",
          enum: ["sunny", "rainy", "cloudy"],
          description: "天氣",
        },
        lastQuestCompleted: { type: "string", description: "最近完成的任務ID" },
        recentInteraction: { type: "boolean", description: "是否最近有互動" },
      },
      required: ["timeOfDay", "weather"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "動態生成的對話",
    schema: {
      type: "object",
      properties: {
        id: { type: "string" },
        text: { type: "string" },
        options: {
          type: "array",
          items: {
            type: "object",
            properties: {
              id: { type: "string" },
              text: { type: "string" },
              action: { type: "string" },
            },
          },
        },
        metadata: {
          type: "object",
          properties: {
            villageReputation: { type: "string" },
            personalImpression: { type: "number" },
            eventsKnown: { type: "number" },
          },
        },
      },
    },
  })
  async getDynamicDialogue(
    @Param("npcId") npcId: string,
    @Param("playerId") playerId: string,
    @Body()
    context: {
      timeOfDay: "morning" | "afternoon" | "evening" | "night";
      weather: "sunny" | "rainy" | "cloudy";
      lastQuestCompleted?: string;
      recentInteraction?: boolean;
    },
  ) {
    try {
      const dialogue = await this.npcsService.generateReputationBasedDialogue(
        npcId,
        playerId,
        context,
      );

      return {
        success: true,
        data: dialogue,
        message: "動態對話生成成功",
      };
    } catch (error) {
      console.error("[NpcsController] 生成動態對話失敗:", error);
      throw new BadRequestException("無法生成動態對話");
    }
  }

  /**
   * NPC 友好度相關 API
   */

  @Get(":npcId/friendship/:playerId")
  @ApiOperation({ summary: "獲取玩家與 NPC 的友好度狀態" })
  @ApiParam({ name: "npcId", description: "NPC ID" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiResponse({
    status: 200,
    description: "友好度詳細資訊",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
          type: "object",
          properties: {
            npcName: { type: "string" },
            friendshipInfo: { type: "object" },
            relationshipHistory: { type: "object" },
          },
        },
      },
    },
  })
  async getFriendshipStatus(
    @Param("npcId") npcId: string,
    @Param("playerId") playerId: string,
  ) {
    try {
      const result = await this.npcsService.getFriendshipStatus(
        npcId,
        playerId,
      );

      return {
        success: true,
        data: result,
        message: `你與 ${result.npcName} 的關係是：${result.friendshipInfo.title}（友好度：${result.friendshipInfo.score}）`,
      };
    } catch (error) {
      console.error("[NpcsController] 獲取友好度狀態失敗:", error);
      throw new NotFoundException("無法獲取友好度信息");
    }
  }

  /**
   * NPC 技能教學相關 API
   */

  @Get(":npcId/teachable-skills")
  @ApiOperation({ summary: "獲取 NPC 可教授的技能（不含個人化價格）" })
  @ApiParam({ name: "npcId", description: "NPC ID" })
  @ApiResponse({
    status: 200,
    description: "NPC 可教授的技能列表",
    schema: {
      type: "object",
      properties: {
        npcId: { type: "string" },
        npcName: { type: "string" },
        teachableSkills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              skillType: { type: "string" },
              knowledgeType: { type: "string" },
              knowledgeName: { type: "string" },
              description: { type: "string" },
              cost: { type: "number" },
              prerequisites: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  })
  async getNpcTeachableSkills(@Param("npcId") npcId: string) {
    try {
      const npc = await this.npcsService.getNPCById(npcId);
      if (!npc) {
        throw new NotFoundException("NPC 不存在");
      }

      // 根據 NPC 職業返回可教授的技能
      const teachableSkills = await this.getTeachableSkillsByNpcProfession(
        npc.profession,
        npcId,
      );

      return {
        success: true,
        data: {
          npcId,
          npcName: npc.name,
          teachableSkills,
        },
        message: `${npc.name} 可教授 ${teachableSkills.length} 種技能知識`,
      };
    } catch (error) {
      console.error("[NpcsController] 獲取 NPC 可教授技能失敗:", error);
      throw new NotFoundException("無法獲取 NPC 技能信息");
    }
  }

  @Get(":npcId/teachable-skills/:playerId")
  @ApiOperation({
    summary: "獲取 NPC 對特定玩家的可教授技能（含友好度價格調整）",
  })
  @ApiParam({ name: "npcId", description: "NPC ID" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiResponse({
    status: 200,
    description: "NPC 可教授的技能列表（含個人化價格）",
    schema: {
      type: "object",
      properties: {
        npcId: { type: "string" },
        npcName: { type: "string" },
        friendshipInfo: { type: "object" },
        teachableSkills: {
          type: "array",
          items: {
            type: "object",
            properties: {
              skillType: { type: "string" },
              knowledgeType: { type: "string" },
              knowledgeName: { type: "string" },
              description: { type: "string" },
              originalCost: { type: "number" },
              adjustedCost: { type: "number" },
              discount: { type: "number" },
              prerequisites: { type: "array", items: { type: "string" } },
            },
          },
        },
      },
    },
  })
  async getNpcTeachableSkillsForPlayer(
    @Param("npcId") npcId: string,
    @Param("playerId") playerId: string,
  ) {
    try {
      const npc = await this.npcsService.getNPCById(npcId);
      if (!npc) {
        throw new NotFoundException("NPC 不存在");
      }

      // 獲取友好度資訊
      const friendshipInfo = await this.npcsService.calculateFriendshipInfo(
        npcId,
        playerId,
      );

      // 根據 NPC 職業返回可教授的技能
      const baseSkills = await this.getTeachableSkillsByNpcProfession(
        npc.profession,
        npcId,
      );

      // 應用友好度價格調整
      const teachableSkills = baseSkills.map((skill) => ({
        ...skill,
        originalCost: skill.cost,
        adjustedCost: Math.round(skill.cost * friendshipInfo.priceModifier),
        discount: friendshipInfo.discountPercentage,
      }));

      return {
        success: true,
        data: {
          npcId,
          npcName: npc.name,
          friendshipInfo,
          teachableSkills,
          priceExplanation: `由於你是${friendshipInfo.title}，學習費用${friendshipInfo.discountPercentage > 0 ? "享有" : friendshipInfo.discountPercentage < 0 ? "需要" : ""} ${Math.abs(friendshipInfo.discountPercentage)}%${friendshipInfo.discountPercentage > 0 ? "折扣" : friendshipInfo.discountPercentage < 0 ? "加價" : ""}`,
        },
        message: `${npc.name} 可教授 ${teachableSkills.length} 種技能知識`,
      };
    } catch (error) {
      console.error("[NpcsController] 獲取 NPC 個人化技能信息失敗:", error);
      throw new NotFoundException("無法獲取 NPC 技能信息");
    }
  }

  @Post(":npcId/teach-skill/:playerId")
  @ApiOperation({ summary: "NPC 教授技能給玩家" })
  @ApiParam({ name: "npcId", description: "NPC ID" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        skillType: { type: "string", description: "技能類型" },
        knowledgeType: { type: "string", description: "知識類型" },
        knowledgeName: { type: "string", description: "知識名稱" },
        paymentAmount: { type: "number", description: "支付金額" },
      },
      required: [
        "skillType",
        "knowledgeType",
        "knowledgeName",
        "paymentAmount",
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: "技能教授成功",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        skillLearned: { type: "object" },
        npcReaction: { type: "string" },
      },
    },
  })
  async teachSkillToPlayer(
    @Param("npcId") npcId: string,
    @Param("playerId") playerId: string,
    @Body()
    teachDto: {
      skillType: string;
      knowledgeType: string;
      knowledgeName: string;
      paymentAmount: number;
    },
  ) {
    try {
      const npc = await this.npcsService.getNPCById(npcId);
      if (!npc) {
        throw new NotFoundException("NPC 不存在");
      }

      // 驗證 NPC 是否可以教授此技能
      const teachableSkills = await this.getTeachableSkillsByNpcProfession(
        npc.profession,
        npcId,
      );
      const canTeach = teachableSkills.find(
        (skill) =>
          skill.skillType === teachDto.skillType &&
          skill.knowledgeName === teachDto.knowledgeName,
      );

      if (!canTeach) {
        return {
          success: false,
          message: `${npc.name} 無法教授這個技能`,
          data: null,
        };
      }

      // 使用友好度系統計算學習費用
      const friendshipInfo = await this.npcsService.calculateFriendshipInfo(
        npcId,
        playerId,
      );
      const adjustedCost = Math.round(
        canTeach.cost * friendshipInfo.priceModifier,
      );

      // 檢查支付金額是否足夠
      if (teachDto.paymentAmount < adjustedCost) {
        let message = `學習費用不足，需要 ${adjustedCost} 金幣`;
        if (adjustedCost !== canTeach.cost) {
          message += ` (原價 ${canTeach.cost} 金幣，由於你是${friendshipInfo.title}，${friendshipInfo.discountPercentage > 0 ? "享有" : "需要"}${Math.abs(friendshipInfo.discountPercentage)}%${friendshipInfo.discountPercentage > 0 ? "折扣" : "加價"})`;
        }
        return {
          success: false,
          message,
          data: null,
        };
      }

      // 模擬教學過程（實際應該調用 SkillsService）
      const teachingResult = {
        success: true,
        knowledgeLearned: {
          skillType: teachDto.skillType,
          knowledgeType: teachDto.knowledgeType,
          knowledgeName: teachDto.knowledgeName,
          teacherNpcId: npcId,
          learnedAt: new Date(),
        },
      };

      // 生成 NPC 反應對話
      const npcReaction = this.generateTeachingReaction(
        npc,
        teachDto.knowledgeName,
      );

      // 觸發村莊聲譽提升（學習是正面行為）
      await this.npcsService.broadcastVillageNews(
        playerId,
        "helpful_action",
        npcId,
        `向 ${npc.name} 學習了「${teachDto.knowledgeName}」`,
        3,
      );

      console.log(
        `[NpcsController] ${npc.name} 教授 ${teachDto.knowledgeName} 給玩家 ${playerId}`,
      );

      return {
        success: true,
        data: {
          skillLearned: teachingResult.knowledgeLearned,
          costPaid: canTeach.cost,
          npcReaction,
        },
        message: `${npc.name} 成功教授了「${teachDto.knowledgeName}」！`,
      };
    } catch (error) {
      console.error("[NpcsController] NPC 教授技能失敗:", error);
      throw new BadRequestException("技能教授失敗");
    }
  }

  // 輔助方法
  private async getTeachableSkillsByNpcProfession(
    profession: string,
    npcId: string,
  ): Promise<any[]> {
    const skillsByProfession: { [profession: string]: any[] } = {
      WOODCUTTER: [
        {
          skillType: "WOODCUTTING",
          knowledgeType: "BASIC",
          knowledgeName: "基礎伐木技術",
          description: "學習如何安全有效地砍伐樹木，了解不同木材的特性",
          cost: 50,
          prerequisites: [],
        },
        {
          skillType: "WOODCUTTING",
          knowledgeType: "INTERMEDIATE",
          knowledgeName: "高效伐木法",
          description: "掌握提高伐木效率的進階技巧，減少體力消耗",
          cost: 200,
          prerequisites: ["基礎伐木技術"],
        },
        {
          skillType: "WOODCUTTING",
          knowledgeType: "ADVANCED",
          knowledgeName: "珍稀木材識別",
          description: "學會識別和採集珍稀木材，提升木材品質",
          cost: 500,
          prerequisites: ["高效伐木法"],
        },
      ],
      MERCHANT: [
        {
          skillType: "TRADING",
          knowledgeType: "BASIC",
          knowledgeName: "基礎貿易知識",
          description: "了解市場供需原理，掌握基本的買賣技巧",
          cost: 100,
          prerequisites: [],
        },
        {
          skillType: "NEGOTIATION",
          knowledgeType: "BASIC",
          knowledgeName: "談判技巧",
          description: "學習在交易中爭取更好價格的談判策略",
          cost: 150,
          prerequisites: ["基礎貿易知識"],
        },
        {
          skillType: "TRADING",
          knowledgeType: "INTERMEDIATE",
          knowledgeName: "商品評估",
          description: "準確評估商品價值，避免上當受騙",
          cost: 300,
          prerequisites: ["基礎貿易知識"],
        },
      ],
      SCHOLAR: [
        {
          skillType: "MAGIC",
          knowledgeType: "BASIC",
          knowledgeName: "魔法基礎理論",
          description: "理解魔法的基本原理和法則",
          cost: 300,
          prerequisites: [],
        },
        {
          skillType: "SCHOLARSHIP",
          knowledgeType: "BASIC",
          knowledgeName: "學術研究方法",
          description: "掌握系統化的知識研究和分析方法",
          cost: 250,
          prerequisites: [],
        },
        {
          skillType: "MAGIC",
          knowledgeType: "INTERMEDIATE",
          knowledgeName: "元素魔法原理",
          description: "深入了解火、水、土、風四元素魔法",
          cost: 600,
          prerequisites: ["魔法基礎理論"],
        },
      ],
    };

    return skillsByProfession[profession] || [];
  }

  private generateTeachingReaction(npc: any, knowledgeName: string): string {
    const reactions = [
      `很好！我相信你能掌握「${knowledgeName}」的精髓。`,
      `「${knowledgeName}」是很實用的知識，多加練習就能熟練運用。`,
      `我很高興能將「${knowledgeName}」傳授給你，希望對你有幫助。`,
      `學習「${knowledgeName}」需要耐心和實踐，不要急於求成。`,
      `你已經掌握了「${knowledgeName}」的基礎，接下來就看你的努力了。`,
    ];

    return reactions[Math.floor(Math.random() * reactions.length)];
  }
}
