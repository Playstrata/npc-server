import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  Query,
  BadRequestException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { DeliveryService, DeliveryQuestConfig } from './delivery.service';

// DTO 類別
class AcceptQuestDto {
  questId: string;
  characterId: string;
}

class GetQuestsQueryDto {
  characterId: string;
  maxWeight?: number;
  difficulty?: string;
  location?: string;
}

@ApiTags('送貨系統')
@Controller('delivery')
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  /**
   * 獲取可用的送貨任務列表
   */
  @Get('quests/available')
  @ApiOperation({ summary: '獲取可用的送貨任務列表' })
  @ApiResponse({ status: 200, description: '成功獲取任務列表' })
  async getAvailableQuests(
    @Query() query: GetQuestsQueryDto
  ): Promise<{
    success: boolean;
    data: {
      quests: Array<DeliveryQuestConfig & { id: string }>;
      totalCount: number;
      playerCapacity?: {
        current: number;
        max: number;
        available: number;
      };
    };
  }> {
    if (!query.characterId) {
      throw new BadRequestException('缺少角色ID');
    }

    const quests = await this.deliveryService.getAvailableDeliveryQuests(
      query.characterId,
      query.maxWeight
    );

    // 根據條件過濾任務
    let filteredQuests = quests;

    if (query.difficulty) {
      filteredQuests = filteredQuests.filter(q => q.difficulty === query.difficulty);
    }

    if (query.location) {
      filteredQuests = filteredQuests.filter(q => 
        q.fromLocation.includes(query.location!) || 
        q.toLocation.includes(query.location!)
      );
    }

    return {
      success: true,
      data: {
        quests: filteredQuests,
        totalCount: filteredQuests.length
      }
    };
  }

  /**
   * 玩家接取送貨任務
   */
  @Post('quests/accept')
  @ApiOperation({ summary: '玩家接取送貨任務' })
  @ApiResponse({ status: 200, description: '任務接取結果' })
  async acceptQuest(
    @Body() acceptQuestDto: AcceptQuestDto
  ): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    if (!acceptQuestDto.questId || !acceptQuestDto.characterId) {
      throw new BadRequestException('缺少必要參數：questId 和 characterId');
    }

    const result = await this.deliveryService.acceptDeliveryQuest(
      acceptQuestDto.questId,
      acceptQuestDto.characterId
    );

    return {
      success: result.success,
      message: result.message,
      data: result.quest
    };
  }

  /**
   * 獲取任務詳細資訊
   */
  @Get('quests/:questId')
  @ApiOperation({ summary: '獲取送貨任務詳細資訊' })
  @ApiResponse({ status: 200, description: '任務詳細資訊' })
  async getQuestDetails(
    @Param('questId') questId: string
  ): Promise<{
    success: boolean;
    data?: any;
    message?: string;
  }> {
    // 這裡可以實現獲取任務詳細資訊的邏輯
    // 暫時返回基本結構
    return {
      success: true,
      data: {
        questId,
        message: '任務詳細資訊功能待實現'
      }
    };
  }

  /**
   * 獲取玩家進行中的送貨任務
   */
  @Get('quests/:characterId/active')
  @ApiOperation({ summary: '獲取玩家進行中的送貨任務' })
  @ApiResponse({ status: 200, description: '進行中的任務列表' })
  async getActiveQuests(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    data: {
      activeQuests: any[];
      count: number;
    };
  }> {
    // 這裡可以實現獲取進行中任務的邏輯
    // 暫時返回空列表
    return {
      success: true,
      data: {
        activeQuests: [],
        count: 0
      }
    };
  }

  /**
   * 確認取貨
   */
  @Post('quests/:questId/pickup')
  @ApiOperation({ summary: '確認取貨' })
  @ApiResponse({ status: 200, description: '取貨確認結果' })
  async confirmPickup(
    @Param('questId') questId: string,
    @Body() body: { characterId: string; location: string }
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    // 這裡可以實現確認取貨的邏輯
    return {
      success: true,
      message: '取貨確認功能待實現'
    };
  }

  /**
   * 確認送達
   */
  @Post('quests/:questId/delivery')
  @ApiOperation({ summary: '確認送達' })
  @ApiResponse({ status: 200, description: '送達確認結果' })
  async confirmDelivery(
    @Param('questId') questId: string,
    @Body() body: { characterId: string; location: string }
  ): Promise<{
    success: boolean;
    message: string;
    rewards?: {
      gold: number;
      experience: number;
      reputation: number;
    };
  }> {
    // 這裡可以實現確認送達的邏輯
    return {
      success: true,
      message: '送達確認功能待實現'
    };
  }

  /**
   * 獲取送貨統計資訊
   */
  @Get('stats/:characterId')
  @ApiOperation({ summary: '獲取玩家送貨統計資訊' })
  @ApiResponse({ status: 200, description: '送貨統計資訊' })
  async getDeliveryStats(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    data: {
      totalDeliveries: number;
      completedDeliveries: number;
      failedDeliveries: number;
      totalEarnings: number;
      averageRating: number;
      deliveryLevel: string;
      nextLevelRequirement: number;
    };
  }> {
    // 這裡可以實現獲取統計資訊的邏輯
    return {
      success: true,
      data: {
        totalDeliveries: 0,
        completedDeliveries: 0,
        failedDeliveries: 0,
        totalEarnings: 0,
        averageRating: 0,
        deliveryLevel: 'NOVICE',
        nextLevelRequirement: 10
      }
    };
  }

  /**
   * 獲取送貨路線資訊
   */
  @Get('routes')
  @ApiOperation({ summary: '獲取送貨路線資訊' })
  @ApiResponse({ status: 200, description: '路線資訊' })
  async getDeliveryRoutes(): Promise<{
    success: boolean;
    data: {
      routes: Array<{
        id: string;
        name: string;
        startLocation: string;
        endLocation: string;
        distance: number;
        estimatedTime: number;
        difficulty: string;
        isActive: boolean;
      }>;
    };
  }> {
    // 模擬路線資料
    const routes = [
      {
        id: 'route-001',
        name: '城鎮中心 → 森林入口',
        startLocation: 'town_center',
        endLocation: 'forest_entrance',
        distance: 150,
        estimatedTime: 15,
        difficulty: 'EASY',
        isActive: true
      },
      {
        id: 'route-002', 
        name: '銅礦場 → 鐵匠鋪',
        startLocation: 'copper_mine',
        endLocation: 'blacksmith_shop',
        distance: 200,
        estimatedTime: 25,
        difficulty: 'NORMAL',
        isActive: true
      },
      {
        id: 'route-003',
        name: '鐵匠鋪 → 城鎮中心',
        startLocation: 'blacksmith_shop', 
        endLocation: 'town_center',
        distance: 50,
        estimatedTime: 8,
        difficulty: 'EASY',
        isActive: true
      }
    ];

    return {
      success: true,
      data: {
        routes
      }
    };
  }

  /**
   * 獲取 NPC 送貨員資訊
   */
  @Get('workers')
  @ApiOperation({ summary: '獲取 NPC 送貨員資訊' })
  @ApiResponse({ status: 200, description: 'NPC 送貨員列表' })
  async getDeliveryWorkers(): Promise<{
    success: boolean;
    data: {
      workers: Array<{
        id: string;
        name: string;
        capacity: number;
        efficiency: number;
        reputation: number;
        isWorking: boolean;
        currentRoute?: string;
      }>;
    };
  }> {
    // 模擬送貨員資料
    const workers = [
      {
        id: 'npc-delivery-001',
        name: '快腿湯姆',
        capacity: 30,
        efficiency: 1.2,
        reputation: 85,
        isWorking: true,
        currentRoute: '城鎮中心 → 森林入口'
      },
      {
        id: 'npc-delivery-002',
        name: '鐵背傑克',
        capacity: 80,
        efficiency: 1.0,
        reputation: 92,
        isWorking: false
      }
    ];

    return {
      success: true,
      data: {
        workers
      }
    };
  }

  /**
   * 手動觸發任務生成 (測試用)
   */
  @Post('admin/generate-quests')
  @ApiOperation({ summary: '手動生成送貨任務 (管理員功能)' })
  @ApiResponse({ status: 200, description: '任務生成結果' })
  async generateQuests(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.deliveryService.generateDeliveryQuests();
      return {
        success: true,
        message: '送貨任務生成完成'
      };
    } catch (error) {
      return {
        success: false,
        message: '任務生成失敗: ' + error.message
      };
    }
  }

  /**
   * 手動觸發 NPC 送貨 (測試用)
   */
  @Post('admin/trigger-npc-deliveries')
  @ApiOperation({ summary: '手動觸發 NPC 送貨 (管理員功能)' })
  @ApiResponse({ status: 200, description: 'NPC 送貨執行結果' })
  async triggerNPCDeliveries(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      await this.deliveryService.performNPCDeliveries();
      return {
        success: true,
        message: 'NPC 送貨執行完成'
      };
    } catch (error) {
      return {
        success: false,
        message: 'NPC 送貨執行失敗: ' + error.message
      };
    }
  }
}