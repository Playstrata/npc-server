import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CharacterClass } from '../characters/character-classes.types';

export interface JobChangeGift {
  itemId: string;
  quantity: number;
  quality: 'POOR' | 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'ARTIFACT';
  name: string;
  description: string;
  baseValue: number; // 基礎價值（金幣）
}

export interface SupplierInfo {
  id: string;
  name: string;
  specialtyType: CharacterClass;
  location: string;
  reputation: number; // 0-100
  markup: number; // 加價比例
}

export interface PurchaseOrder {
  supplierId: string;
  items: Array<{
    itemId: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    quality: string;
  }>;
  totalAmount: number;
  expectedDelivery: Date;
}

@Injectable()
export class SupplyChainService {
  private readonly logger = new Logger(SupplyChainService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 獲取各職業的轉職禮物配置
   */
  private getJobChangeGifts(): Record<CharacterClass, JobChangeGift[]> {
    return {
      [CharacterClass.NOVICE]: [], // 初心者不需要禮物
      
      [CharacterClass.WARRIOR]: [
        {
          itemId: 'warrior-sword-iron',
          quantity: 1,
          quality: 'COMMON',
          name: '鐵製長劍',
          description: '新手劍士的標準武器',
          baseValue: 150
        },
        {
          itemId: 'warrior-shield-wood',
          quantity: 1,
          quality: 'COMMON',
          name: '木製盾牌',
          description: '基礎防護裝備',
          baseValue: 80
        },
        {
          itemId: 'warrior-armor-leather',
          quantity: 1,
          quality: 'COMMON',
          name: '皮革護甲',
          description: '輕型防護服',
          baseValue: 120
        },
        {
          itemId: 'warrior-manual-basic',
          quantity: 1,
          quality: 'COMMON',
          name: '基礎戰術手冊',
          description: '劍士入門指南',
          baseValue: 50
        }
      ],
      
      [CharacterClass.MAGE]: [
        {
          itemId: 'mage-staff-apprentice',
          quantity: 1,
          quality: 'UNCOMMON',
          name: '學徒法杖',
          description: '增強魔法威力的法杖',
          baseValue: 200
        },
        {
          itemId: 'mage-robe-novice',
          quantity: 1,
          quality: 'COMMON',
          name: '初級法師袍',
          description: '提升魔力恢復的長袍',
          baseValue: 180
        },
        {
          itemId: 'mage-crystals-mana',
          quantity: 5,
          quality: 'COMMON',
          name: '魔力水晶',
          description: '儲存魔力的水晶',
          baseValue: 30
        },
        {
          itemId: 'mage-tome-elements',
          quantity: 1,
          quality: 'UNCOMMON',
          name: '元素魔法概論',
          description: '基礎魔法理論書籍',
          baseValue: 150
        },
        {
          itemId: 'mage-pouch-spell',
          quantity: 1,
          quality: 'COMMON',
          name: '法術材料袋',
          description: '存放法術材料的袋子',
          baseValue: 75
        }
      ],
      
      [CharacterClass.ARCHER]: [
        {
          itemId: 'archer-bow-composite',
          quantity: 1,
          quality: 'COMMON',
          name: '複合弓',
          description: '射程和威力平衡的弓',
          baseValue: 180
        },
        {
          itemId: 'archer-arrows-steel',
          quantity: 50,
          quality: 'COMMON',
          name: '鋼製箭矢',
          description: '高品質箭矢',
          baseValue: 2
        },
        {
          itemId: 'archer-quiver-leather',
          quantity: 1,
          quality: 'COMMON',
          name: '皮革箭袋',
          description: '容量大的箭袋',
          baseValue: 60
        },
        {
          itemId: 'archer-gloves-leather',
          quantity: 1,
          quality: 'COMMON',
          name: '弓手護手',
          description: '保護手部的護具',
          baseValue: 45
        },
        {
          itemId: 'archer-guide-hunting',
          quantity: 1,
          quality: 'COMMON',
          name: '狩獵指南',
          description: '野外生存和狩獵技巧',
          baseValue: 40
        }
      ],
      
      [CharacterClass.ROGUE]: [
        {
          itemId: 'rogue-daggers-twin',
          quantity: 2,
          quality: 'COMMON',
          name: '雙子匕首',
          description: '速度和精準的象徵',
          baseValue: 90
        },
        {
          itemId: 'rogue-cloak-shadow',
          quantity: 1,
          quality: 'UNCOMMON',
          name: '暗影斗篷',
          description: '提升潛行效果',
          baseValue: 160
        },
        {
          itemId: 'rogue-tools-lockpick',
          quantity: 1,
          quality: 'COMMON',
          name: '專業開鎖工具組',
          description: '各種開鎖工具',
          baseValue: 85
        },
        {
          itemId: 'rogue-boots-silent',
          quantity: 1,
          quality: 'COMMON',
          name: '無聲靴',
          description: '減少移動聲音',
          baseValue: 70
        },
        {
          itemId: 'rogue-manual-stealth',
          quantity: 1,
          quality: 'COMMON',
          name: '潛行技巧手冊',
          description: '盜賊基礎技能指南',
          baseValue: 35
        }
      ]
    };
  }

  /**
   * 獲取特定職業的供應商列表
   */
  async getSuppliersBySpecialty(specialty: CharacterClass): Promise<SupplierInfo[]> {
    const suppliers = await this.prisma.supplier.findMany({
      where: {
        specialtyType: specialty,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        specialtyType: true,
        location: true,
        reputationScore: true,
        baseMarkupPercentage: true
      }
    });

    return suppliers.map(s => ({
      id: s.id,
      name: s.name,
      specialtyType: s.specialtyType as CharacterClass,
      location: s.location,
      reputation: s.reputationScore,
      markup: s.baseMarkupPercentage
    }));
  }

  /**
   * 計算轉職禮物的總成本
   */
  async calculateJobChangeGiftCost(targetClass: CharacterClass): Promise<{
    gifts: JobChangeGift[];
    baseCost: number;
    supplierCost: number;
    totalCost: number;
    availableSuppliers: SupplierInfo[];
    recommendedSupplier: SupplierInfo | null;
  }> {
    const gifts = this.getJobChangeGifts()[targetClass];
    const baseCost = gifts.reduce((total, gift) => total + (gift.baseValue * gift.quantity), 0);
    
    // 獲取該職業的供應商
    const suppliers = await this.getSuppliersBySpecialty(targetClass);
    
    if (suppliers.length === 0) {
      this.logger.warn(`[SupplyChainService] 沒有找到 ${targetClass} 的供應商`);
      return {
        gifts,
        baseCost,
        supplierCost: baseCost * 1.5, // 默認50%加價
        totalCost: baseCost * 1.5,
        availableSuppliers: [],
        recommendedSupplier: null
      };
    }

    // 選擇最佳供應商（聲譽高、加價低）
    const recommendedSupplier = suppliers.reduce((best, current) => {
      const currentScore = current.reputation - current.markup;
      const bestScore = best.reputation - best.markup;
      return currentScore > bestScore ? current : best;
    });

    const supplierMultiplier = 1 + (recommendedSupplier.markup / 100);
    const supplierCost = Math.round(baseCost * supplierMultiplier);

    return {
      gifts,
      baseCost,
      supplierCost,
      totalCost: supplierCost,
      availableSuppliers: suppliers,
      recommendedSupplier
    };
  }

  /**
   * 創建採購訂單
   */
  async createPurchaseOrder(
    targetClass: CharacterClass,
    supplierId: string,
    orderedBy: string = 'system'
  ): Promise<PurchaseOrder> {
    const gifts = this.getJobChangeGifts()[targetClass];
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId }
    });

    if (!supplier) {
      throw new Error(`供應商 ${supplierId} 不存在`);
    }

    const supplierMultiplier = 1 + (supplier.baseMarkupPercentage / 100);
    let totalAmount = 0;
    
    const orderItems = gifts.map(gift => {
      const unitPrice = Math.round(gift.baseValue * supplierMultiplier);
      const totalPrice = unitPrice * gift.quantity;
      totalAmount += totalPrice;
      
      return {
        itemId: gift.itemId,
        quantity: gift.quantity,
        unitPrice,
        totalPrice,
        quality: gift.quality
      };
    });

    // 創建採購訂單記錄
    const purchaseOrder = await this.prisma.purchaseOrder.create({
      data: {
        supplierId,
        orderType: 'JOB_CHANGE',
        totalAmount,
        orderedBy,
        expectedDelivery: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小時後交付
        orderItems: {
          create: orderItems.map(item => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            qualityGrade: item.quality
          }))
        }
      },
      include: {
        orderItems: true
      }
    });

    this.logger.log(`[SupplyChainService] 創建採購訂單 ${purchaseOrder.id}，總金額: ${totalAmount}`);

    return {
      supplierId,
      items: orderItems,
      totalAmount,
      expectedDelivery: purchaseOrder.expectedDelivery || new Date()
    };
  }

  /**
   * 檢查供應商庫存
   */
  async checkSupplierInventory(supplierId: string, gifts: JobChangeGift[]): Promise<{
    inStock: boolean;
    shortages: Array<{
      itemId: string;
      required: number;
      available: number;
      shortage: number;
    }>;
  }> {
    const shortages = [];
    let allInStock = true;

    for (const gift of gifts) {
      const inventory = await this.prisma.supplierInventory.findUnique({
        where: {
          supplierId_itemId_qualityGrade: {
            supplierId,
            itemId: gift.itemId,
            qualityGrade: gift.quality
          }
        }
      });

      const available = inventory?.quantity || 0;
      if (available < gift.quantity) {
        allInStock = false;
        shortages.push({
          itemId: gift.itemId,
          required: gift.quantity,
          available,
          shortage: gift.quantity - available
        });
      }
    }

    return {
      inStock: allInStock,
      shortages
    };
  }

  /**
   * 自動補貨系統
   */
  async autoRestockInventory(): Promise<void> {
    const lowStockItems = await this.prisma.supplierInventory.findMany({
      where: {
        quantity: {
          lt: this.prisma.supplierInventory.fields.minimumStock
        }
      },
      include: {
        supplier: true
      }
    });

    for (const item of lowStockItems) {
      const restockQuantity = item.restockAmount;
      const restockCost = item.unitCost * restockQuantity;

      await this.prisma.supplierInventory.update({
        where: { id: item.id },
        data: {
          quantity: item.quantity + restockQuantity,
          lastRestockedAt: new Date()
        }
      });

      this.logger.log(`[SupplyChainService] 自動補貨: ${item.supplier.name} - ${item.itemId} +${restockQuantity}個，成本: ${restockCost}金幣`);
    }
  }

  /**
   * 更新市場價格（基於供需關係）
   */
  async updateMarketPrices(): Promise<void> {
    // 獲取過去7天的訂單數據來計算需求
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        createdAt: {
          gte: weekAgo
        },
        orderType: 'JOB_CHANGE'
      },
      include: {
        orderItems: true
      }
    });

    // 計算各職業的需求量
    const demandByClass: Record<string, number> = {};
    
    for (const order of recentOrders) {
      const supplier = await this.prisma.supplier.findUnique({
        where: { id: order.supplierId },
        select: { specialtyType: true }
      });
      
      if (supplier) {
        demandByClass[supplier.specialtyType] = (demandByClass[supplier.specialtyType] || 0) + 1;
      }
    }

    // 根據需求調整價格
    for (const [classType, demand] of Object.entries(demandByClass)) {
      if (demand > 10) { // 高需求
        await this.prisma.supplier.updateMany({
          where: { specialtyType: classType },
          data: {
            baseMarkupPercentage: {
              multiply: 1.1 // 價格上漲10%
            }
          }
        });
        
        this.logger.log(`[SupplyChainService] ${classType} 高需求，價格上漲10%`);
      } else if (demand < 3) { // 低需求
        await this.prisma.supplier.updateMany({
          where: { specialtyType: classType },
          data: {
            baseMarkupPercentage: {
              multiply: 0.95 // 價格下降5%
            }
          }
        });
        
        this.logger.log(`[SupplyChainService] ${classType} 低需求，價格下降5%`);
      }
    }
  }

  /**
   * 獲取轉職禮物清單（用於顯示給玩家）
   */
  getJobChangeGiftsList(targetClass: CharacterClass): JobChangeGift[] {
    return this.getJobChangeGifts()[targetClass] || [];
  }

  /**
   * 模擬交付延遲（基於供應商聲譽）
   */
  async simulateDeliveryTime(supplierId: string): Promise<number> {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: supplierId },
      select: { reputationScore: true }
    });

    if (!supplier) return 24; // 默認24小時

    // 聲譽越高，交付越快
    // 聲譽100 = 12小時，聲譽50 = 24小時，聲譽0 = 48小時
    const baseHours = 12;
    const maxHours = 48;
    const reputationFactor = supplier.reputationScore / 100;
    
    return Math.round(baseHours + (maxHours - baseHours) * (1 - reputationFactor));
  }
}