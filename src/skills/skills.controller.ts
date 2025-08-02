import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiBody,
  ApiResponse,
} from "@nestjs/swagger";
import { SkillsService, SkillType, KnowledgeType } from "./skills.service";

@ApiTags("Skills")
@Controller("skills")
export class SkillsController {
  constructor(private readonly skillsService: SkillsService) {}

  /**
   * 獲取玩家的所有技能
   */
  @Get(":playerId")
  @ApiOperation({ summary: "獲取玩家的所有技能" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiResponse({
    status: 200,
    description: "玩家技能信息",
    schema: {
      type: "object",
      properties: {
        playerId: { type: "string" },
        skills: {
          type: "object",
          additionalProperties: {
            type: "object",
            properties: {
              skillType: { type: "string" },
              experience: { type: "number" },
              level: { type: "string" },
              knowledges: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    name: { type: "string" },
                    proficiency: { type: "number" },
                    learnedAt: { type: "string", format: "date-time" },
                    teacherNpcId: { type: "string" },
                  },
                },
              },
            },
          },
        },
        totalSkillPoints: { type: "number" },
      },
    },
  })
  async getPlayerSkills(@Param("playerId") playerId: string) {
    try {
      const skills = await this.skillsService.getPlayerSkills(playerId);

      return {
        success: true,
        data: skills,
        message: "技能信息獲取成功",
      };
    } catch (error) {
      console.error("[SkillsController] 獲取玩家技能失敗:", error);
      throw new NotFoundException("無法獲取玩家技能信息");
    }
  }

  /**
   * 從 NPC 學習技能知識
   */
  @Post(":playerId/learn")
  @ApiOperation({ summary: "從 NPC 學習技能知識" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        npcId: { type: "string", description: "NPC ID" },
        skillType: {
          type: "string",
          enum: Object.values(SkillType),
          description: "技能類型",
        },
        knowledgeType: {
          type: "string",
          enum: Object.values(KnowledgeType),
          description: "知識類型",
        },
        knowledgeName: { type: "string", description: "知識名稱" },
      },
      required: ["npcId", "skillType", "knowledgeType", "knowledgeName"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "學習成功",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        knowledgeLearned: { type: "object" },
        costPaid: { type: "number" },
      },
    },
  })
  async learnFromNpc(
    @Param("playerId") playerId: string,
    @Body()
    learnDto: {
      npcId: string;
      skillType: SkillType;
      knowledgeType: KnowledgeType;
      knowledgeName: string;
    },
  ) {
    try {
      const result = await this.skillsService.learnSkillFromNpc(
        playerId,
        learnDto.npcId,
        learnDto.skillType,
        learnDto.knowledgeType,
        learnDto.knowledgeName,
      );

      return {
        success: result.success,
        data: result.success
          ? {
              knowledgeLearned: result.knowledgeLearned,
              costPaid: result.costPaid,
            }
          : null,
        message: result.message,
      };
    } catch (error) {
      console.error("[SkillsController] 學習技能失敗:", error);
      throw new BadRequestException("學習技能失敗");
    }
  }

  /**
   * 練習技能
   */
  @Post(":playerId/practice")
  @ApiOperation({ summary: "練習技能獲得經驗和熟練度" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        skillType: {
          type: "string",
          enum: Object.values(SkillType),
          description: "技能類型",
        },
        practiceType: { type: "string", description: "練習類型" },
        practiceIntensity: {
          type: "string",
          enum: ["light", "normal", "intense"],
          description: "練習強度",
          default: "normal",
        },
        knowledgeUsed: { type: "string", description: "使用的知識（可選）" },
      },
      required: ["skillType", "practiceType"],
    },
  })
  @ApiResponse({
    status: 200,
    description: "練習成功",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        message: { type: "string" },
        experienceGained: { type: "number" },
        proficiencyGained: { type: "number" },
        levelUp: { type: "boolean" },
      },
    },
  })
  async practiceSkill(
    @Param("playerId") playerId: string,
    @Body()
    practiceDto: {
      skillType: SkillType;
      practiceType: string;
      practiceIntensity?: "light" | "normal" | "intense";
      knowledgeUsed?: string;
    },
  ) {
    try {
      const result = await this.skillsService.practiceSkill(
        playerId,
        practiceDto.skillType,
        practiceDto.practiceType,
        practiceDto.practiceIntensity || "normal",
        practiceDto.knowledgeUsed,
      );

      return {
        success: result.success,
        data: result.success
          ? {
              experienceGained: result.experienceGained,
              proficiencyGained: result.proficiencyGained,
              levelUp: result.levelUp,
            }
          : null,
        message: result.message,
      };
    } catch (error) {
      console.error("[SkillsController] 練習技能失敗:", error);
      throw new BadRequestException("練習技能失敗");
    }
  }

  /**
   * 獲取 NPC 可教授的技能
   */
  @Get("npc/:npcId/teachable")
  @ApiOperation({ summary: "獲取 NPC 可教授的技能知識" })
  @ApiParam({ name: "npcId", description: "NPC ID" })
  @ApiResponse({
    status: 200,
    description: "NPC 可教授的技能列表",
    schema: {
      type: "object",
      properties: {
        success: { type: "boolean" },
        data: {
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
      const teachableSkills =
        await this.skillsService.getNpcTeachableSkills(npcId);

      return {
        success: true,
        data: teachableSkills,
        message: `NPC ${npcId} 可教授 ${teachableSkills.length} 種技能知識`,
      };
    } catch (error) {
      console.error("[SkillsController] 獲取 NPC 可教授技能失敗:", error);
      throw new NotFoundException("無法獲取 NPC 技能信息");
    }
  }

  /**
   * 獲取特定技能的詳細信息
   */
  @Get(":playerId/:skillType")
  @ApiOperation({ summary: "獲取特定技能的詳細信息" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiParam({ name: "skillType", description: "技能類型" })
  @ApiResponse({
    status: 200,
    description: "技能詳細信息",
    schema: {
      type: "object",
      properties: {
        skillType: { type: "string" },
        experience: { type: "number" },
        level: { type: "string" },
        knowledges: { type: "array" },
        practiceHistory: { type: "array" },
        nextLevelRequirement: { type: "number" },
      },
    },
  })
  async getSkillDetail(
    @Param("playerId") playerId: string,
    @Param("skillType") skillType: string,
  ) {
    try {
      const playerSkills = await this.skillsService.getPlayerSkills(playerId);
      const skill = playerSkills.skills[skillType as SkillType];

      if (!skill) {
        throw new NotFoundException("技能未解鎖");
      }

      // 計算下一等級所需經驗
      const levelRequirements = {
        NOVICE: 100,
        APPRENTICE: 300,
        JOURNEYMAN: 700,
        EXPERT: 1500,
        MASTER: 3000,
        GRANDMASTER: -1, // 已達最高等級
      };

      const nextLevelExp =
        levelRequirements[skill.level as keyof typeof levelRequirements];
      const expNeeded =
        nextLevelExp === -1 ? 0 : Math.max(0, nextLevelExp - skill.experience);

      return {
        success: true,
        data: {
          ...skill,
          nextLevelRequirement: expNeeded,
          totalKnowledges: skill.knowledges.length,
          averageProficiency:
            skill.knowledges.length > 0
              ? Math.round(
                  skill.knowledges.reduce((sum, k) => sum + k.proficiency, 0) /
                    skill.knowledges.length,
                )
              : 0,
        },
        message: "技能詳情獲取成功",
      };
    } catch (error) {
      console.error("[SkillsController] 獲取技能詳情失敗:", error);
      throw new NotFoundException("無法獲取技能詳情");
    }
  }

  /**
   * 獲取技能統計信息
   */
  @Get(":playerId/statistics")
  @ApiOperation({ summary: "獲取玩家技能統計信息" })
  @ApiParam({ name: "playerId", description: "玩家ID" })
  @ApiResponse({
    status: 200,
    description: "技能統計信息",
    schema: {
      type: "object",
      properties: {
        totalSkills: { type: "number" },
        totalExperience: { type: "number" },
        totalKnowledges: { type: "number" },
        skillDistribution: { type: "object" },
        mostPracticedSkill: { type: "string" },
        recentActivity: { type: "array" },
      },
    },
  })
  async getSkillStatistics(@Param("playerId") playerId: string) {
    try {
      const playerSkills = await this.skillsService.getPlayerSkills(playerId);

      const totalSkills = Object.keys(playerSkills.skills).length;
      const totalExperience = Object.values(playerSkills.skills).reduce(
        (sum, skill) => sum + skill.experience,
        0,
      );
      const totalKnowledges = Object.values(playerSkills.skills).reduce(
        (sum, skill) => sum + skill.knowledges.length,
        0,
      );

      // 技能等級分布
      const skillDistribution = Object.values(playerSkills.skills).reduce(
        (dist, skill) => {
          dist[skill.level] = (dist[skill.level] || 0) + 1;
          return dist;
        },
        {} as { [level: string]: number },
      );

      // 找出最常練習的技能
      const practiceCount = Object.entries(playerSkills.skills)
        .map(([type, skill]) => ({
          type,
          practiceCount: skill.practiceHistory.length,
        }))
        .sort((a, b) => b.practiceCount - a.practiceCount);

      const mostPracticedSkill =
        practiceCount.length > 0 ? practiceCount[0].type : null;

      // 最近活動（最近5次練習）
      const allPracticeHistory = Object.values(playerSkills.skills)
        .flatMap((skill) =>
          skill.practiceHistory.map((history) => ({
            ...history,
            skillType: skill.skillType,
          })),
        )
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 5);

      return {
        success: true,
        data: {
          totalSkills,
          totalExperience,
          totalKnowledges,
          skillDistribution,
          mostPracticedSkill,
          recentActivity: allPracticeHistory,
        },
        message: "技能統計獲取成功",
      };
    } catch (error) {
      console.error("[SkillsController] 獲取技能統計失敗:", error);
      throw new NotFoundException("無法獲取技能統計");
    }
  }
}
