import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param,
  BadRequestException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { StaminaService, StaminaInfo, MovementType } from './stamina.service';

// DTO 類別
class DrainStaminaDto {
  movementType: MovementType;
  duration: number; // 秒數
}

class IncreaseMaxStaminaDto {
  amount: number;
}

@ApiTags('耐力系統')
@Controller('stamina')
export class StaminaController {
  constructor(private readonly staminaService: StaminaService) {}

  /**
   * 獲取角色耐力資訊
   */
  @Get(':characterId')
  @ApiOperation({ summary: '獲取角色耐力資訊' })
  @ApiResponse({ status: 200, description: '耐力資訊' })
  async getStaminaInfo(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    data: StaminaInfo;
  }> {
    const staminaInfo = await this.staminaService.getStaminaInfo(characterId);

    return {
      success: true,
      data: staminaInfo
    };
  }

  /**
   * 消耗耐力（移動時使用）
   */
  @Post(':characterId/drain')
  @ApiOperation({ summary: '消耗耐力' })
  @ApiResponse({ status: 200, description: '耐力消耗結果' })
  async drainStamina(
    @Param('characterId') characterId: string,
    @Body() drainDto: DrainStaminaDto
  ): Promise<{
    success: boolean;
    message?: string;
    data: {
      newStamina: number;
      staminaInfo: StaminaInfo;
    };
  }> {
    if (!drainDto.movementType || drainDto.duration <= 0) {
      throw new BadRequestException('移動類型和持續時間必須有效');
    }

    const result = await this.staminaService.drainStamina(
      characterId,
      drainDto.movementType,
      drainDto.duration
    );

    return {
      success: result.success,
      message: result.message,
      data: {
        newStamina: result.newStamina,
        staminaInfo: result.staminaInfo
      }
    };
  }

  /**
   * 開始休息
   */
  @Post(':characterId/rest/start')
  @ApiOperation({ summary: '開始休息' })
  @ApiResponse({ status: 200, description: '開始休息結果' })
  async startResting(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    message: string;
    data: StaminaInfo;
  }> {
    const result = await this.staminaService.startResting(characterId);

    return {
      success: result.success,
      message: result.message,
      data: result.staminaInfo
    };
  }

  /**
   * 停止休息
   */
  @Post(':characterId/rest/stop')
  @ApiOperation({ summary: '停止休息' })
  @ApiResponse({ status: 200, description: '停止休息結果' })
  async stopResting(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      staminaInfo: StaminaInfo;
      restDuration?: number;
    };
  }> {
    const result = await this.staminaService.stopResting(characterId);

    return {
      success: result.success,
      message: result.message,
      data: {
        staminaInfo: result.staminaInfo,
        restDuration: result.restDuration
      }
    };
  }

  /**
   * 增加耐力上限
   */
  @Post(':characterId/increase-max')
  @ApiOperation({ summary: '增加耐力上限' })
  @ApiResponse({ status: 200, description: '增加耐力上限結果' })
  async increaseMaxStamina(
    @Param('characterId') characterId: string,
    @Body() increaseDto: IncreaseMaxStaminaDto
  ): Promise<{
    success: boolean;
    message: string;
    newMaxStamina: number;
  }> {
    if (!increaseDto.amount || increaseDto.amount <= 0) {
      throw new BadRequestException('增加量必須大於0');
    }

    const result = await this.staminaService.increaseMaxStamina(
      characterId,
      increaseDto.amount
    );

    return {
      success: result.success,
      message: `耐力上限增加了 ${increaseDto.amount}`,
      newMaxStamina: result.newMaxStamina
    };
  }

  /**
   * 獲取移動類型的耐力消耗資訊
   */
  @Get('movement-info/:movementType')
  @ApiOperation({ summary: '獲取移動類型的耐力消耗資訊' })
  @ApiResponse({ status: 200, description: '移動類型資訊' })
  async getMovementInfo(
    @Param('movementType') movementType: string
  ): Promise<{
    success: boolean;
    data: {
      movementType: string;
      description: string;
      baseDrainRate: number;
      weightMultiplier: number;
      speedPenalty: number;
      recommendations: string[];
    };
  }> {
    const movementDescriptions = {
      [MovementType.WALKING]: {
        description: '步行移動，耐力消耗較低，適合長距離旅行',
        recommendations: [
          '攜帶重物時建議選擇步行',
          '耐力不足時的安全選擇',
          '可以持續較長時間'
        ]
      },
      [MovementType.RUNNING]: {
        description: '跑步移動，速度快但耐力消耗高',
        recommendations: [
          '需要至少20點耐力才能開始跑步',
          '適合短距離快速移動',
          '重載時不建議跑步'
        ]
      },
      [MovementType.CARRYING]: {
        description: '搬運重物，耐力消耗很高且有速度懲罰',
        recommendations: [
          '攜帶重物超過負重80%時自動啟用',
          '建議提升力量屬性減少負擔',
          '需要頻繁休息'
        ]
      },
      [MovementType.RESTING]: {
        description: '休息狀態，快速恢復耐力',
        recommendations: [
          '耐力恢復速度是正常的2倍',
          '完全靜止狀態，無法移動',
          '耐力滿時會自動停止休息'
        ]
      }
    };

    const info = movementDescriptions[movementType as MovementType];
    if (!info) {
      throw new BadRequestException('無效的移動類型');
    }

    // 這裡可以從 StaminaService 獲取具體的數值配置
    // 暫時返回模擬數據
    return {
      success: true,
      data: {
        movementType,
        description: info.description,
        baseDrainRate: movementType === MovementType.WALKING ? 0.5 :
                      movementType === MovementType.RUNNING ? 2.0 :
                      movementType === MovementType.CARRYING ? 1.5 : -2.0,
        weightMultiplier: movementType === MovementType.WALKING ? 1.0 :
                         movementType === MovementType.RUNNING ? 2.0 :
                         movementType === MovementType.CARRYING ? 3.0 : 0.0,
        speedPenalty: movementType === MovementType.CARRYING ? 0.3 : 0.0,
        recommendations: info.recommendations
      }
    };
  }

  /**
   * 獲取耐力狀態說明
   */
  @Get('status/help')
  @ApiOperation({ summary: '獲取耐力狀態說明' })
  @ApiResponse({ status: 200, description: '耐力狀態說明' })
  async getStaminaStatusHelp(): Promise<{
    success: boolean;
    data: {
      statusLevels: Array<{
        status: string;
        range: string;
        description: string;
        effects: string[];
        recommendations: string[];
      }>;
    };
  }> {
    const statusLevels = [
      {
        status: 'FULL',
        range: '90-100%',
        description: '精力充沛，狀態極佳',
        effects: [
          '無移動速度懲罰',
          '可以進行任何類型的移動',
          '耐力恢復正常'
        ],
        recommendations: [
          '最佳狀態，適合進行長途旅行',
          '可以嘗試跑步或搬運重物'
        ]
      },
      {
        status: 'GOOD',
        range: '70-89%',
        description: '狀態良好，略有疲憊',
        effects: [
          '無明顯移動懲罰',
          '可以正常移動和工作'
        ],
        recommendations: [
          '適合繼續活動',
          '注意耐力管理'
        ]
      },
      {
        status: 'TIRED',
        range: '40-69%',
        description: '感到疲憊，需要注意休息',
        effects: [
          '輕微移動速度懲罰',
          '跑步耐力消耗增加'
        ],
        recommendations: [
          '考慮短暫休息',
          '避免高強度活動'
        ]
      },
      {
        status: 'EXHAUSTED',
        range: '10-39%',
        description: '精疲力盡，急需休息',
        effects: [
          '明顯移動速度懲罰(30%)',
          '無法跑步',
          '耐力恢復緩慢'
        ],
        recommendations: [
          '立即尋找休息地點',
          '避免攜帶重物',
          '考慮丟棄非必需品'
        ]
      },
      {
        status: 'COLLAPSED',
        range: '0-9%',
        description: '虛脫狀態，極度危險',
        effects: [
          '嚴重移動速度懲罰(50%)',
          '無法進行任何高消耗活動',
          '可能出現健康問題'
        ],
        recommendations: [
          '必須立即休息',
          '尋求醫療協助',
          '丟棄所有非必需物品'
        ]
      }
    ];

    return {
      success: true,
      data: {
        statusLevels
      }
    };
  }
}