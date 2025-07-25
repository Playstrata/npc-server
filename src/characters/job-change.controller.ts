import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards 
} from '@nestjs/common';
import { 
  ApiTags, 
  ApiOperation, 
  ApiResponse, 
  ApiBearerAuth, 
  ApiParam 
} from '@nestjs/swagger';
import { AuthGuard, Session } from '@thallesp/nestjs-better-auth';
import { JobChangeService } from './job-change.service';
import { CharacterClass } from './character-classes.types';

// DTO類型
interface JobChangeRequestDto {
  targetClass: CharacterClass;
  npcTrainerId: string;
}

@Controller('job-change')
@UseGuards(AuthGuard)
@ApiTags('job-change')
@ApiBearerAuth()
export class JobChangeController {
  constructor(private readonly jobChangeService: JobChangeService) {}

  /**
   * 獲取角色可轉職的職業列表
   */
  @Get(':characterId/available-jobs')
  @ApiOperation({ summary: '獲取角色可轉職的職業列表' })
  @ApiParam({ name: 'characterId', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功獲取可轉職列表' })
  async getAvailableJobs(@Param('characterId') characterId: string) {
    try {
      const jobs = await this.jobChangeService.getAvailableJobs(characterId);
      return {
        success: true,
        data: jobs
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: []
      };
    }
  }

  /**
   * 檢查特定職業的轉職條件
   */
  @Get(':characterId/eligibility/:targetClass')
  @ApiOperation({ summary: '檢查特定職業的轉職條件' })
  @ApiParam({ name: 'characterId', description: '角色ID' })
  @ApiParam({ name: 'targetClass', description: '目標職業', enum: CharacterClass })
  @ApiResponse({ status: 200, description: '成功檢查轉職條件' })
  async checkEligibility(
    @Param('characterId') characterId: string,
    @Param('targetClass') targetClass: CharacterClass
  ) {
    try {
      const eligibility = await this.jobChangeService.checkJobChangeEligibility(
        characterId, 
        targetClass
      );
      return {
        success: true,
        data: eligibility
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 執行轉職
   */
  @Post(':characterId/change-job')
  @ApiOperation({ summary: '執行角色轉職' })
  @ApiParam({ name: 'characterId', description: '角色ID' })
  @ApiResponse({ status: 200, description: '轉職結果' })
  async changeJob(
    @Param('characterId') characterId: string,
    @Body() jobChangeRequest: JobChangeRequestDto
  ) {
    try {
      const result = await this.jobChangeService.performJobChange(
        characterId,
        jobChangeRequest.targetClass,
        jobChangeRequest.npcTrainerId
      );
      
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 獲取角色轉職歷史
   */
  @Get(':characterId/history')
  @ApiOperation({ summary: '獲取角色轉職歷史' })
  @ApiParam({ name: 'characterId', description: '角色ID' })
  @ApiResponse({ status: 200, description: '成功獲取轉職歷史' })
  async getJobChangeHistory(@Param('characterId') characterId: string) {
    try {
      const history = await this.jobChangeService.getJobChangeHistory(characterId);
      return {
        success: true,
        data: history
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
        data: []
      };
    }
  }

  /**
   * 獲取轉職費用估算
   */
  @Get('cost/:targetClass')
  @ApiOperation({ summary: '獲取指定職業的轉職費用' })
  @ApiParam({ name: 'targetClass', description: '目標職業', enum: CharacterClass })
  @ApiResponse({ status: 200, description: '成功獲取轉職費用' })
  getCostEstimate(@Param('targetClass') targetClass: CharacterClass) {
    try {
      const cost = this.jobChangeService.calculateJobChangeCost(targetClass);
      return {
        success: true,
        data: cost
      };
    } catch (error) {
      return {
        success: false,
        message: error.message
      };
    }
  }

  /**
   * 檢查NPC是否為職業訓練師
   */
  @Get('npc/:npcId/trainer-info')
  @ApiOperation({ summary: '檢查NPC是否為職業訓練師' })
  @ApiParam({ name: 'npcId', description: 'NPC ID' })
  @ApiResponse({ status: 200, description: '成功獲取NPC訓練師資訊' })
  getNpcTrainerInfo(@Param('npcId') npcId: string) {
    const trainerInfo = this.jobChangeService.isNpcJobTrainer(npcId);
    return {
      success: true,
      data: trainerInfo
    };
  }
}