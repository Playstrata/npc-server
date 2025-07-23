import { Controller, Get, Post, Param, Body, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { SkillDecayService } from './skill-decay.service';
import { SkillType } from './skills.service';

@ApiTags('Skill Decay')
@Controller('skill-decay')
export class SkillDecayController {
  constructor(private readonly skillDecayService: SkillDecayService) {}

  /**
   * 檢查玩家技能衰減狀態
   */
  @Get('check/:playerId')
  @ApiOperation({ summary: '檢查玩家技能衰減狀態' })
  @ApiParam({ name: 'playerId', description: '玩家ID' })
  @ApiResponse({
    status: 200,
    description: '技能衰減檢查結果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            decayedSkills: { type: 'array' },
            warnings: { type: 'array' }
          }
        }
      }
    }
  })
  async checkPlayerSkillDecay(@Param('playerId') playerId: string) {
    try {
      const result = await this.skillDecayService.checkPlayerSkillDecay(playerId);
      
      return {
        success: true,
        data: result,
        message: `檢查完成：${result.decayedSkills.length} 個技能衰減，${result.warnings.length} 個警告`
      };
    } catch (error) {
      console.error('[SkillDecayController] 檢查技能衰減失敗:', error);
      throw new BadRequestException('無法檢查技能衰減狀態');
    }
  }

  /**
   * 復習技能
   */
  @Post('review/:playerId')
  @ApiOperation({ summary: '復習技能以防止衰減' })
  @ApiParam({ name: 'playerId', description: '玩家ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        skillType: {
          type: 'string',
          enum: Object.values(SkillType),
          description: '技能類型'
        },
        knowledgeName: {
          type: 'string',
          description: '知識名稱'
        }
      },
      required: ['skillType', 'knowledgeName']
    }
  })
  @ApiResponse({
    status: 200,
    description: '復習結果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            proficiencyRestored: { type: 'number' },
            experienceGained: { type: 'number' }
          }
        },
        message: { type: 'string' }
      }
    }
  })
  async reviewSkill(
    @Param('playerId') playerId: string,
    @Body() reviewDto: {
      skillType: SkillType;
      knowledgeName: string;
    }
  ) {
    try {
      const result = await this.skillDecayService.reviewSkill(
        playerId,
        reviewDto.skillType,
        reviewDto.knowledgeName
      );

      return {
        success: result.success,
        data: result.success ? {
          proficiencyRestored: result.proficiencyRestored,
          experienceGained: result.experienceGained
        } : null,
        message: result.message
      };
    } catch (error) {
      console.error('[SkillDecayController] 復習技能失敗:', error);
      throw new BadRequestException('復習技能失敗');
    }
  }

  /**
   * 獲取技能維護建議
   */
  @Get('maintenance-recommendations/:playerId')
  @ApiOperation({ summary: '獲取技能維護建議' })
  @ApiParam({ name: 'playerId', description: '玩家ID' })
  @ApiResponse({
    status: 200,
    description: '技能維護建議',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              skillType: { type: 'string' },
              knowledgeName: { type: 'string' },
              priority: { type: 'string' },
              recommendation: { type: 'string' },
              daysSinceLastPractice: { type: 'number' },
              currentProficiency: { type: 'number' }
            }
          }
        }
      }
    }
  })
  async getMaintenanceRecommendations(@Param('playerId') playerId: string) {
    try {
      const recommendations = await this.skillDecayService.getSkillMaintenanceRecommendations(playerId);
      
      return {
        success: true,
        data: recommendations,
        message: `獲取到 ${recommendations.length} 個維護建議`
      };
    } catch (error) {
      console.error('[SkillDecayController] 獲取維護建議失敗:', error);
      throw new BadRequestException('無法獲取技能維護建議');
    }
  }

  /**
   * 手動觸發技能衰減檢查（管理員功能）
   */
  @Post('admin/trigger-decay-check')
  @ApiOperation({ summary: '手動觸發技能衰減檢查（管理員功能）' })
  @ApiResponse({
    status: 200,
    description: '衰減檢查結果',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        message: { type: 'string' }
      }
    }
  })
  async triggerDecayCheck() {
    try {
      await this.skillDecayService.performDailyDecayCheck();
      
      return {
        success: true,
        message: '技能衰減檢查已手動執行完成'
      };
    } catch (error) {
      console.error('[SkillDecayController] 手動觸發衰減檢查失敗:', error);
      throw new BadRequestException('手動觸發衰減檢查失敗');
    }
  }
}