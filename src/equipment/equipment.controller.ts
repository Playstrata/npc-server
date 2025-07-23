import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param,
  BadRequestException 
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EquipmentService, EquipmentStatus, EquipmentSlot, CapacityCalculation } from './equipment.service';

// DTO 類別
class EquipItemDto {
  itemId: string;
  equipmentSlot: EquipmentSlot;
}

class UnequipItemDto {
  equipmentSlot: EquipmentSlot;
}

@ApiTags('裝備系統')
@Controller('equipment')
export class EquipmentController {
  constructor(private readonly equipmentService: EquipmentService) {}

  /**
   * 獲取角色裝備狀態
   */
  @Get(':characterId/status')
  @ApiOperation({ summary: '獲取角色裝備狀態' })
  @ApiResponse({ status: 200, description: '裝備狀態' })
  async getEquipmentStatus(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    data: EquipmentStatus;
  }> {
    const equipmentStatus = await this.equipmentService.getEquipmentStatus(characterId);

    return {
      success: true,
      data: equipmentStatus
    };
  }

  /**
   * 裝備物品
   */
  @Post(':characterId/equip')
  @ApiOperation({ summary: '裝備物品' })
  @ApiResponse({ status: 200, description: '裝備結果' })
  async equipItem(
    @Param('characterId') characterId: string,
    @Body() equipDto: EquipItemDto
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      newCapacity?: CapacityCalculation;
      unequippedItem?: string;
    };
  }> {
    if (!equipDto.itemId || !equipDto.equipmentSlot) {
      throw new BadRequestException('物品ID和裝備槽位不能為空');
    }

    const result = await this.equipmentService.equipItem(
      characterId,
      equipDto.itemId,
      equipDto.equipmentSlot
    );

    return {
      success: result.success,
      message: result.message,
      data: {
        newCapacity: result.newCapacity,
        unequippedItem: result.unequippedItem
      }
    };
  }

  /**
   * 卸下裝備
   */
  @Post(':characterId/unequip')
  @ApiOperation({ summary: '卸下裝備' })
  @ApiResponse({ status: 200, description: '卸下裝備結果' })
  async unequipItem(
    @Param('characterId') characterId: string,
    @Body() unequipDto: UnequipItemDto
  ): Promise<{
    success: boolean;
    message: string;
    data?: {
      unequippedItem?: string;
      newCapacity?: CapacityCalculation;
    };
  }> {
    if (!unequipDto.equipmentSlot) {
      throw new BadRequestException('裝備槽位不能為空');
    }

    const result = await this.equipmentService.unequipItem(
      characterId,
      unequipDto.equipmentSlot
    );

    return {
      success: result.success,
      message: result.message,
      data: {
        unequippedItem: result.unequippedItem,
        newCapacity: result.newCapacity
      }
    };
  }

  /**
   * 計算角色容量
   */
  @Get(':characterId/capacity')
  @ApiOperation({ summary: '計算角色容量' })
  @ApiResponse({ status: 200, description: '容量計算結果' })
  async calculateCapacity(
    @Param('characterId') characterId: string
  ): Promise<{
    success: boolean;
    data: CapacityCalculation;
  }> {
    const capacity = await this.equipmentService.calculateCapacity(characterId);

    return {
      success: true,
      data: capacity
    };
  }

  /**
   * 獲取裝備槽位資訊
   */
  @Get('slots/info')
  @ApiOperation({ summary: '獲取裝備槽位資訊' })
  @ApiResponse({ status: 200, description: '裝備槽位資訊' })
  async getEquipmentSlotsInfo(): Promise<{
    success: boolean;
    data: {
      slots: Array<{
        slot: string;
        name: string;
        description: string;
        allowedItemTypes: string[];
        maxItems: number;
      }>;
    };
  }> {
    const slotsInfo = [
      {
        slot: EquipmentSlot.BACKPACK,
        name: '背包槽位',
        description: '裝備背包以增加攜帶容量和格子數量',
        allowedItemTypes: ['BACKPACK'],
        maxItems: 1
      },
      {
        slot: EquipmentSlot.WEAPON,
        name: '武器槽位',
        description: '裝備武器以提升戰鬥能力',
        allowedItemTypes: ['WEAPON'],
        maxItems: 1
      },
      {
        slot: EquipmentSlot.ARMOR,
        name: '護甲槽位',
        description: '裝備護甲以提升防禦能力',
        allowedItemTypes: ['ARMOR'],
        maxItems: 1
      },
      {
        slot: EquipmentSlot.HANDS,
        name: '雙手模式',
        description: '無裝備時的基本狀態，容量和體積都很有限',
        allowedItemTypes: [],
        maxItems: 0
      }
    ];

    return {
      success: true,
      data: {
        slots: slotsInfo
      }
    };
  }

  /**
   * 獲取容量計算說明
   */
  @Get('capacity/help')
  @ApiOperation({ summary: '獲取容量計算說明' })
  @ApiResponse({ status: 200, description: '容量計算說明' })
  async getCapacityHelp(): Promise<{
    success: boolean;
    data: {
      calculation: {
        weightFormula: string;
        volumeFormula: string;
        explanation: {
          baseCapacity: string;
          strengthBonus: string;
          vitalityBonus: string;
          backpackBonus: string;
          volumeCalculation: string;
        };
      };
      examples: Array<{
        scenario: string;
        stats: any;
        equipment: string;
        result: any;
      }>;
    };
  }> {
    return {
      success: true,
      data: {
        calculation: {
          weightFormula: '總容量 = 基礎容量(5kg) + 力量×2 + 體力×0.5 + 背包加成',
          volumeFormula: '總體積 = 基礎體積(2L) + 背包體積加成',
          explanation: {
            baseCapacity: '所有角色的基礎攜帶能力都是5公斤，這代表雙手能夠攜帶的重量',
            strengthBonus: '每點力量屬性提供2公斤的額外攜帶能力，力量是負重的主要因素',
            vitalityBonus: '每點體力屬性提供0.5公斤的額外攜帶能力，體力影響持久力',
            backpackBonus: '裝備背包後根據背包等級提供額外的重量和體積容量',
            volumeCalculation: '體積限制確保即使重量足夠，也不能攜帶過多大型物品'
          }
        },
        examples: [
          {
            scenario: '新手角色（無背包）',
            stats: { strength: 10, vitality: 10 },
            equipment: '雙手攜帶',
            result: { 
              weight: '5 + 10×2 + 10×0.5 = 30kg',
              volume: '2L',
              slots: '8格'
            }
          },
          {
            scenario: '裝備小型背包',
            stats: { strength: 12, vitality: 10 },
            equipment: '小型皮革背包',
            result: { 
              weight: '5 + 12×2 + 10×0.5 + 15 = 49kg',
              volume: '2 + 12 = 14L',
              slots: '16格'
            }
          },
          {
            scenario: '高力量角色+大背包',
            stats: { strength: 20, vitality: 15 },
            equipment: '大型強化背包',
            result: { 
              weight: '5 + 20×2 + 15×0.5 + 40 = 92.5kg',
              volume: '2 + 35 = 37L',
              slots: '32格'
            }
          }
        ]
      }
    };
  }

  /**
   * 獲取背包比較
   */
  @Get('backpack/comparison')
  @ApiOperation({ summary: '獲取背包比較資訊' })
  @ApiResponse({ status: 200, description: '背包比較' })
  async getBackpackComparison(): Promise<{
    success: boolean;
    data: {
      backpacks: Array<{
        id: string;
        name: string;
        quality: string;
        weight: number;
        capacityBonus: number;
        volumeBonus: number;
        slots: number;
        requirements: any;
        price: number;
        pros: string[];
        cons: string[];
      }>;
    };
  }> {
    const backpacks = [
      {
        id: 'backpack-hands-only',
        name: '雙手攜帶',
        quality: 'POOR',
        weight: 0,
        capacityBonus: 0,
        volumeBonus: 0,
        slots: 8,
        requirements: { none: true },
        price: 0,
        pros: [
          '無需購買',
          '沒有重量負擔',
          '立即可用'
        ],
        cons: [
          '容量極小',
          '格子數量少',
          '不適合長途旅行',
          '無法攜帶大型物品'
        ]
      },
      {
        id: 'backpack-small-leather',
        name: '小型皮革背包',
        quality: 'COMMON',
        weight: 1.5,
        capacityBonus: 15,
        volumeBonus: 12,
        slots: 16,
        requirements: { level: 1 },
        price: 45,
        pros: [
          '價格便宜',
          '容易獲得',
          '適合新手',
          '重量輕'
        ],
        cons: [
          '容量有限',
          '耐久度一般'
        ]
      },
      {
        id: 'backpack-medium-canvas',
        name: '中型帆布背包',
        quality: 'UNCOMMON',
        weight: 2.5,
        capacityBonus: 25,
        volumeBonus: 20,
        slots: 24,
        requirements: { level: 8, strength: 12 },
        price: 120,
        pros: [
          '容量適中',
          '性價比高',
          '耐用性好'
        ],
        cons: [
          '有等級要求',
          '重量增加'
        ]
      },
      {
        id: 'backpack-large-reinforced',
        name: '大型強化背包',
        quality: 'RARE',
        weight: 4.0,
        capacityBonus: 40,
        volumeBonus: 35,
        slots: 32,
        requirements: { level: 15, strength: 18, vitality: 15 },
        price: 280,
        pros: [
          '大容量',
          '高耐久度',
          '格子數量多'
        ],
        cons: [
          '價格昂貴',
          '要求高屬性',
          '自重較大'
        ]
      },
      {
        id: 'backpack-expedition',
        name: '探險家背包',
        quality: 'EPIC',
        weight: 3.5,
        capacityBonus: 50,
        volumeBonus: 45,
        slots: 40,
        requirements: { level: 25, strength: 22, vitality: 18 },
        price: 650,
        pros: [
          '最大容量',
          '特殊附魔',
          '頂級品質',
          '重量優化'
        ],
        cons: [
          '極高價格',
          '苛刻要求',
          '難以獲得'
        ]
      }
    ];

    return {
      success: true,
      data: {
        backpacks
      }
    };
  }
}