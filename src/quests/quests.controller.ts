import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Query,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { QuestsService } from "./quests.service";
import { BetterAuthGuard } from "../auth/better-auth.guard";
import { UserId } from "../auth/better-auth.decorator";

@ApiTags("quests")
@Controller("quests")
@UseGuards(BetterAuthGuard)
@ApiBearerAuth()
export class QuestsController {
  constructor(private readonly questsService: QuestsService) {}

  @Get()
  @ApiOperation({ summary: "獲取玩家的所有任務" })
  @ApiResponse({ status: 200, description: "成功獲取任務列表" })
  @ApiQuery({ name: "status", required: false, description: "過濾任務狀態" })
  async getPlayerQuests(
    @UserId() userId: string,
    @Query("status") status?: string,
  ) {
    const allQuests = await this.questsService.getPlayerQuests(userId);

    if (status) {
      return allQuests.filter((quest) => quest.status === status);
    }

    return allQuests;
  }

  @Get("available")
  @ApiOperation({ summary: "獲取可接受的任務列表" })
  @ApiResponse({ status: 200, description: "成功獲取可接受任務" })
  async getAvailableQuests(@UserId() userId: string) {
    return this.questsService.getAvailableQuests(userId);
  }

  @Get("daily")
  @ApiOperation({ summary: "獲取每日任務" })
  @ApiResponse({ status: 200, description: "成功獲取每日任務" })
  async getDailyQuests(@UserId() userId: string) {
    return this.questsService.getDailyQuests(userId);
  }

  @Get(":id")
  @ApiOperation({ summary: "獲取特定任務詳情" })
  @ApiParam({ name: "id", description: "任務ID" })
  @ApiResponse({ status: 200, description: "成功獲取任務詳情" })
  @ApiResponse({ status: 404, description: "任務不存在" })
  async getQuestDetails(
    @UserId() userId: string,
    @Param("id") questId: string,
  ) {
    const allQuests = await this.questsService.getPlayerQuests(userId);
    const quest = allQuests.find((q) => q.id === questId);

    if (!quest) {
      throw new Error("任務不存在");
    }

    return quest;
  }

  @Post(":id/accept")
  @ApiOperation({ summary: "接受任務" })
  @ApiParam({ name: "id", description: "任務ID" })
  @ApiResponse({ status: 200, description: "任務接受成功" })
  @ApiResponse({ status: 400, description: "任務不可接受或不符合條件" })
  @ApiResponse({ status: 404, description: "任務不存在" })
  async acceptQuest(@UserId() userId: string, @Param("id") questId: string) {
    return this.questsService.acceptQuest(userId, questId);
  }

  @Patch(":id/progress")
  @ApiOperation({ summary: "更新任務進度" })
  @ApiParam({ name: "id", description: "任務ID" })
  @ApiResponse({ status: 200, description: "任務進度更新成功" })
  @ApiResponse({ status: 400, description: "任務未處於進行中狀態" })
  @ApiResponse({ status: 404, description: "任務或目標不存在" })
  async updateQuestProgress(
    @UserId() userId: string,
    @Param("id") questId: string,
    @Body()
    updateData: {
      objectiveId: string;
      progress: number;
    },
  ) {
    return this.questsService.updateQuestProgress(
      userId,
      questId,
      updateData.objectiveId,
      updateData.progress,
    );
  }

  @Post(":id/submit")
  @ApiOperation({ summary: "提交已完成的任務並獲得獎勵" })
  @ApiParam({ name: "id", description: "任務ID" })
  @ApiResponse({ status: 200, description: "任務提交成功，獎勵已發放" })
  @ApiResponse({ status: 400, description: "任務尚未完成" })
  @ApiResponse({ status: 404, description: "任務不存在" })
  async submitQuest(@UserId() userId: string, @Param("id") questId: string) {
    return this.questsService.submitQuest(userId, questId);
  }

  @Delete(":id/abandon")
  @ApiOperation({ summary: "放棄任務" })
  @ApiParam({ name: "id", description: "任務ID" })
  @ApiResponse({ status: 200, description: "任務放棄成功" })
  @ApiResponse({ status: 400, description: "只能放棄已接受的任務" })
  @ApiResponse({ status: 404, description: "任務不存在" })
  async abandonQuest(@UserId() userId: string, @Param("id") questId: string) {
    const result = await this.questsService.abandonQuest(userId, questId);
    return { success: result };
  }

  @Post("cleanup-expired")
  @ApiOperation({ summary: "清理過期任務" })
  @ApiResponse({ status: 200, description: "過期任務清理完成" })
  async cleanupExpiredQuests(@UserId() userId: string) {
    const cleanedCount = await this.questsService.cleanupExpiredQuests(userId);
    return {
      message: "過期任務清理完成",
      cleanedCount,
    };
  }

  // 便利端點：批次操作
  @Get("summary/stats")
  @ApiOperation({ summary: "獲取任務統計資訊" })
  @ApiResponse({ status: 200, description: "成功獲取任務統計" })
  async getQuestStats(@UserId() userId: string) {
    const allQuests = await this.questsService.getPlayerQuests(userId);

    const stats = {
      total: allQuests.length,
      available: allQuests.filter((q) => q.status === "AVAILABLE").length,
      accepted: allQuests.filter((q) => q.status === "ACCEPTED").length,
      completed: allQuests.filter((q) => q.status === "COMPLETED").length,
      submitted: allQuests.filter((q) => q.status === "SUBMITTED").length,
      expired: allQuests.filter((q) => q.status === "EXPIRED").length,
    };

    return stats;
  }

  @Post("batch/accept")
  @ApiOperation({ summary: "批次接受任務" })
  @ApiResponse({ status: 200, description: "批次接受任務完成" })
  async batchAcceptQuests(
    @UserId() userId: string,
    @Body() data: { questIds: string[] },
  ) {
    const results = [];

    for (const questId of data.questIds) {
      try {
        const quest = await this.questsService.acceptQuest(userId, questId);
        results.push({ questId, success: true, quest });
      } catch (error) {
        results.push({
          questId,
          success: false,
          error: error.message,
        });
      }
    }

    return {
      message: "批次接受任務完成",
      results,
    };
  }
}
