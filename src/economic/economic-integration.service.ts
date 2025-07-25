import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankingService } from './banking.service';
import { InvestmentService } from './investment.service';
import { StockMarketService } from './stock-market.service';
import { WorldEventsService } from './world-events.service';
import { SupplyChainService } from './supply-chain.service';
import { CharacterClass } from '../characters/character-classes.types';

export interface NPCJobChangeService {
  id: string;
  npcId: string;
  npcName: string;
  targetClass: CharacterClass;
  location: string;
  baseCost: number;
  giftsCost: number;
  totalCost: number;
  availabilityStatus: 'AVAILABLE' | 'BUSY' | 'OUT_OF_STOCK' | 'UNAVAILABLE';
  estimatedWaitTime?: number; // 分鐘
  specialOffers: SpecialOffer[];
}

export interface SpecialOffer {
  id: string;
  type: 'DISCOUNT' | 'FINANCING' | 'PACKAGE_DEAL' | 'LOYALTY_BONUS';
  description: string;
  discountPercentage?: number;
  financeTerms?: {
    interestRate: number;
    termMonths: number;
    downPayment: number;
  };
  validUntil: Date;
  conditions?: string[];
}

export interface JobChangePackage {
  targetClass: CharacterClass;
  baseCost: number;
  giftsCost: number;
  totalCost: number;
  paymentOptions: PaymentOption[];
  gifts: Array<{
    itemId: string;
    name: string;
    quantity: number;
    quality: string;
    value: number;
  }>;
  npcServices: NPCJobChangeService[];
}

export interface PaymentOption {
  type: 'FULL_PAYMENT' | 'INSTALLMENT' | 'LOAN' | 'INVESTMENT_BACKED';
  description: string;
  upfrontCost: number;
  totalCost: number;
  terms?: any;
  requiresApproval: boolean;
  eligibilityCheck: () => Promise<boolean>;
}

export interface EconomicReport {
  marketOverview: {
    totalMarketCap: number;
    avgPriceChange: number;
    activeEvents: number;
  };
  bankingStats: {
    totalDeposits: number;
    activeLoans: number;
    avgInterestRate: number;
  };
  jobChangeEconomy: {
    totalRevenue: number;
    popularClasses: Array<{ class: CharacterClass; count: number }>;
    avgCost: number;
  };
  supplyChainStats: {
    activeSuppliers: number;
    avgDeliveryTime: number;
    inventoryLevels: string;
  };
}

@Injectable()
export class EconomicIntegrationService {
  private readonly logger = new Logger(EconomicIntegrationService.name);

  constructor(
    private prisma: PrismaService,
    private bankingService: BankingService,
    private investmentService: InvestmentService,
    private stockMarketService: StockMarketService,
    private worldEventsService: WorldEventsService,
    private supplyChainService: SupplyChainService
  ) {}

  /**
   * 獲取完整的轉職經濟套餐
   */
  async getJobChangePackage(
    characterId: string,
    targetClass: CharacterClass
  ): Promise<JobChangePackage> {
    // 獲取基礎轉職費用
    const baseCost = this.getBaseCost(targetClass);
    
    // 獲取禮物成本
    const giftCostInfo = await this.supplyChainService.calculateJobChangeGiftCost(targetClass);
    
    // 獲取可用的NPC服務
    const npcServices = await this.getAvailableNPCServices(targetClass);
    
    // 生成支付選項
    const paymentOptions = await this.generatePaymentOptions(characterId, baseCost + giftCostInfo.totalCost);

    return {
      targetClass,
      baseCost,
      giftsCost: giftCostInfo.totalCost,
      totalCost: baseCost + giftCostInfo.totalCost,
      paymentOptions,
      gifts: giftCostInfo.gifts.map(gift => ({
        itemId: gift.itemId,
        name: gift.name,
        quantity: gift.quantity,
        quality: gift.quality,
        value: gift.baseValue
      })),
      npcServices
    };
  }

  /**
   * 處理轉職服務預約和支付
   */
  async processJobChangeService(
    characterId: string,
    targetClass: CharacterClass,
    npcId: string,
    paymentType: string,
    paymentDetails?: any
  ): Promise<{
    success: boolean;
    message: string;
    appointmentId?: string;
    paymentResult?: any;
    estimatedCompletion?: Date;
  }> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId }
    });

    if (!character) {
      return { success: false, message: '角色不存在' };
    }

    // 獲取轉職套餐信息
    const jobPackage = await this.getJobChangePackage(characterId, targetClass);
    const totalCost = jobPackage.totalCost;

    // 處理支付
    let paymentResult;
    switch (paymentType) {
      case 'FULL_PAYMENT':
        paymentResult = await this.processFullPayment(characterId, totalCost);
        break;
      case 'LOAN':
        paymentResult = await this.processLoanPayment(characterId, totalCost, paymentDetails);
        break;
      case 'INSTALLMENT':
        paymentResult = await this.processInstallmentPayment(characterId, totalCost, paymentDetails);
        break;
      case 'INVESTMENT_BACKED':
        paymentResult = await this.processInvestmentBackedPayment(characterId, totalCost);
        break;
      default:
        return { success: false, message: '不支援的支付方式' };
    }

    if (!paymentResult.success) {
      return { success: false, message: paymentResult.message, paymentResult };
    }

    // 創建轉職預約
    const appointment = await this.createJobChangeAppointment(
      characterId,
      targetClass,
      npcId,
      totalCost,
      paymentType
    );

    // 創建供應鏈訂單
    const suppliers = await this.supplyChainService.getSuppliersBySpecialty(targetClass);
    if (suppliers.length > 0) {
      await this.supplyChainService.createPurchaseOrder(
        targetClass,
        suppliers[0].id,
        `character-${characterId}`
      );
    }

    this.logger.log(`[EconomicIntegrationService] 角色 ${characterId} 預約轉職為 ${targetClass}，費用 ${totalCost} 金幣`);

    return {
      success: true,
      message: '轉職服務預約成功',
      appointmentId: appointment.id,
      paymentResult,
      estimatedCompletion: appointment.scheduledAt
    };
  }

  /**
   * 獲取經濟系統報告
   */
  async getEconomicReport(): Promise<EconomicReport> {
    // 市場概覽
    const marketOverview = await this.stockMarketService.getMarketOverview();
    const activeEvents = await this.worldEventsService.getActiveEvents();

    // 銀行統計
    const bankingStats = await this.getBankingStatistics();

    // 轉職經濟統計
    const jobChangeStats = await this.getJobChangeStatistics();

    // 供應鏈統計
    const supplyChainStats = await this.getSupplyChainStatistics();

    return {
      marketOverview: {
        totalMarketCap: marketOverview.totalMarketCap,
        avgPriceChange: marketOverview.avgPriceChange,
        activeEvents: activeEvents.length
      },
      bankingStats,
      jobChangeEconomy: jobChangeStats,
      supplyChainStats
    };
  }

  /**
   * 執行每日經濟維護任務
   */
  async performDailyMaintenance(): Promise<void> {
    this.logger.log('[EconomicIntegrationService] 開始每日經濟維護');

    try {
      // 更新股價
      await this.stockMarketService.updateStockPrices();
      
      // 處理銀行利息
      await this.bankingService.calculateDailyInterest();
      
      // 處理投資到期
      await this.investmentService.processMaturedInvestments();
      
      // 更新共同基金價值
      await this.investmentService.updateMutualFundValues();
      
      // 處理世界事件影響
      await this.worldEventsService.processOngoingImpacts();
      
      // 自動補貨
      await this.supplyChainService.autoRestockInventory();
      
      // 更新市場價格
      await this.supplyChainService.updateMarketPrices();
      
      // 觸發隨機事件
      const randomEvent = await this.worldEventsService.triggerRandomEvent();
      if (randomEvent) {
        this.logger.log(`[EconomicIntegrationService] 觸發隨機事件: ${randomEvent.title}`);
      }

      this.logger.log('[EconomicIntegrationService] 每日經濟維護完成');

    } catch (error) {
      this.logger.error('[EconomicIntegrationService] 每日維護失敗:', error);
    }
  }

  /**
   * 執行每月經濟任務
   */
  async performMonthlyMaintenance(): Promise<void> {
    this.logger.log('[EconomicIntegrationService] 開始每月經濟維護');

    try {
      // 支付股息
      await this.stockMarketService.payDividends();
      
      // 重置供應商聲譽和價格
      await this.resetSupplierMetrics();
      
      // 生成經濟報告
      const report = await this.getEconomicReport();
      this.logger.log('[EconomicIntegrationService] 月度經濟報告已生成', report);

    } catch (error) {
      this.logger.error('[EconomicIntegrationService] 每月維護失敗:', error);
    }
  }

  /**
   * 獲取角色的完整經濟狀況
   */
  async getCharacterEconomicStatus(characterId: string): Promise<{
    bankAccount: any;
    investments: any[];
    stockPortfolio: any;
    loans: any[];
    jobChangeHistory: any[];
    creditScore: number;
    netWorth: number;
  }> {
    const bankAccount = await this.bankingService.getBankAccount(characterId);
    const investments = await this.investmentService.getPortfolio(characterId);
    const stockPortfolio = await this.stockMarketService.getPortfolio(characterId);
    const loans = await this.bankingService.getLoans(characterId);
    
    const jobChangeHistory = await this.prisma.jobChangeCost.findMany({
      orderBy: { lastUpdated: 'desc' },
      take: 10
    });

    const netWorth = (bankAccount?.balance || 0) + 
                    (Array.isArray(investments) ? investments.reduce((sum, inv) => sum + (inv.currentValue || 0), 0) : 0) + 
                    stockPortfolio.totalValue - 
                    loans.reduce((sum, loan) => sum + loan.remainingBalance, 0);

    return {
      bankAccount,
      investments: Array.isArray(investments) ? investments : [],
      stockPortfolio,
      loans,
      jobChangeHistory,
      creditScore: bankAccount?.creditScore || 0,
      netWorth
    };
  }

  // ========== 私有方法 ==========

  private getBaseCost(targetClass: CharacterClass): number {
    const baseCosts = {
      [CharacterClass.NOVICE]: 0,
      [CharacterClass.WARRIOR]: 1000,
      [CharacterClass.MAGE]: 1500,
      [CharacterClass.ARCHER]: 1200,
      [CharacterClass.ROGUE]: 800
    };
    return baseCosts[targetClass] || 1000;
  }

  private async getAvailableNPCServices(targetClass: CharacterClass): Promise<NPCJobChangeService[]> {
    // 模擬NPC服務（實際應該從NPC系統獲取）
    const npcMapping = {
      [CharacterClass.WARRIOR]: { id: 'npc-warrior-trainer', name: '劍士訓練師' },
      [CharacterClass.MAGE]: { id: 'npc-003', name: '智者奧丁' },
      [CharacterClass.ARCHER]: { id: 'npc-archer-trainer', name: '弓箭手訓練師' },
      [CharacterClass.ROGUE]: { id: 'npc-rogue-trainer', name: '盜賊訓練師' }
    };

    const npc = npcMapping[targetClass];
    if (!npc) return [];

    return [{
      id: `service-${npc.id}`,
      npcId: npc.id,
      npcName: npc.name,
      targetClass,
      location: '王國首都',
      baseCost: this.getBaseCost(targetClass),
      giftsCost: 0, // 會在外部計算
      totalCost: 0, // 會在外部計算
      availabilityStatus: 'AVAILABLE',
      specialOffers: await this.generateSpecialOffers(targetClass)
    }];
  }

  private async generatePaymentOptions(characterId: string, totalCost: number): Promise<PaymentOption[]> {
    const options: PaymentOption[] = [];

    // 全額支付
    options.push({
      type: 'FULL_PAYMENT',
      description: '一次性付清全額',
      upfrontCost: totalCost,
      totalCost,
      requiresApproval: false,
      eligibilityCheck: async () => {
        const bankAccount = await this.bankingService.getBankAccount(characterId);
        return bankAccount ? bankAccount.balance >= totalCost : false;
      }
    });

    // 貸款支付
    options.push({
      type: 'LOAN',
      description: '銀行貸款支付',
      upfrontCost: 0,
      totalCost: totalCost * 1.1, // 10% 利息
      terms: {
        interestRate: 10,
        termMonths: 12
      },
      requiresApproval: true,
      eligibilityCheck: async () => {
        const bankAccount = await this.bankingService.getBankAccount(characterId);
        return bankAccount ? bankAccount.creditScore >= 500 : false;
      }
    });

    // 分期付款
    options.push({
      type: 'INSTALLMENT',
      description: '分期付款 (3期)',
      upfrontCost: totalCost / 3,
      totalCost: totalCost * 1.05, // 5% 手續費
      terms: {
        installments: 3,
        monthlyPayment: (totalCost * 1.05) / 3
      },
      requiresApproval: false,
      eligibilityCheck: async () => {
        const bankAccount = await this.bankingService.getBankAccount(characterId);
        return bankAccount ? bankAccount.balance >= totalCost / 3 : false;
      }
    });

    return options;
  }

  private async generateSpecialOffers(targetClass: CharacterClass): Promise<SpecialOffer[]> {
    const offers: SpecialOffer[] = [];

    // 隨機生成優惠
    if (Math.random() < 0.3) { // 30% 機率有折扣
      offers.push({
        id: `discount-${Date.now()}`,
        type: 'DISCOUNT',
        description: '新手轉職優惠',
        discountPercentage: 10,
        validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天有效
        conditions: ['首次轉職', '等級10-15']
      });
    }

    return offers;
  }

  private async processFullPayment(characterId: string, amount: number): Promise<any> {
    const bankAccount = await this.bankingService.getBankAccount(characterId);
    if (!bankAccount || bankAccount.balance < amount) {
      return { success: false, message: '餘額不足' };
    }

    return await this.bankingService.withdraw(characterId, amount);
  }

  private async processLoanPayment(characterId: string, amount: number, loanDetails: any): Promise<any> {
    const loanApplication = {
      amount,
      termMonths: loanDetails?.termMonths || 12,
      purpose: 'Job Change' as const,
      collateralType: 'None' as const
    };

    return await this.bankingService.applyForLoan(characterId, loanApplication);
  }

  private async processInstallmentPayment(characterId: string, amount: number, installmentDetails: any): Promise<any> {
    const firstInstallment = amount / (installmentDetails?.installments || 3);
    
    const paymentResult = await this.bankingService.withdraw(characterId, firstInstallment);
    if (!paymentResult.success) {
      return paymentResult;
    }

    // 創建分期付款記錄
    // TODO: Add installmentPlan model to Prisma schema
    /*
    await this.prisma.installmentPlan.create({
      data: {
        characterId,
        totalAmount: amount,
        installmentCount: installmentDetails?.installments || 3,
        monthlyPayment: firstInstallment,
        remainingPayments: (installmentDetails?.installments || 3) - 1,
        purpose: 'Job Change',
        status: 'ACTIVE'
      }
    });
    */

    return { success: true, message: '首期付款成功，已建立分期計劃' };
  }

  private async processInvestmentBackedPayment(characterId: string, amount: number): Promise<any> {
    const portfolio = await this.stockMarketService.getPortfolio(characterId);
    if (portfolio.totalValue < amount * 1.2) { // 需要120%抵押價值
      return { success: false, message: '投資組合價值不足作為抵押' };
    }

    // 使用投資組合作為抵押的特殊貸款
    return await this.processLoanPayment(characterId, amount, {
      termMonths: 6,
      collateralType: 'Investment Portfolio'
    });
  }

  private async createJobChangeAppointment(
    characterId: string,
    targetClass: CharacterClass,
    npcId: string,
    totalCost: number,
    paymentType: string
  ): Promise<any> {
    // TODO: Add jobChangeAppointment model to Prisma schema
    /* return await this.prisma.jobChangeAppointment.create({
      data: {
        characterId,
        targetClass,
        npcTrainerId: npcId,
        totalCost,
        paymentMethod: paymentType,
        status: 'SCHEDULED',
        scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24小時後
        appointmentType: 'JOB_CHANGE'
      }
    }); */
    
    // Temporary return for missing model
    return {
      id: 'temp-' + Date.now(),
      characterId,
      targetClass,
      status: 'SCHEDULED',
      scheduledAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    };
  }

  private async getBankingStatistics(): Promise<any> {
    const accounts = await this.prisma.bankAccount.findMany();
    const loans = await this.prisma.loan.findMany({ where: { status: 'ACTIVE' } });

    return {
      totalDeposits: accounts.reduce((sum, acc) => sum + acc.balance, 0),
      activeLoans: loans.length,
      avgInterestRate: loans.reduce((sum, loan) => sum + loan.interestRate, 0) / (loans.length || 1)
    };
  }

  private async getJobChangeStatistics(): Promise<any> {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentJobChanges = await this.prisma.jobChangeHistory.findMany({
      where: { changedAt: { gte: weekAgo } }
    });

    const classCounts: Record<string, number> = {};
    let totalRevenue = 0;

    for (const jobChange of recentJobChanges) {
      classCounts[jobChange.toClass] = (classCounts[jobChange.toClass] || 0) + 1;
      totalRevenue += jobChange.costPaid;
    }

    const popularClasses = Object.entries(classCounts)
      .map(([cls, count]) => ({ class: cls as CharacterClass, count }))
      .sort((a, b) => b.count - a.count);

    return {
      totalRevenue,
      popularClasses,
      avgCost: recentJobChanges.length > 0 ? totalRevenue / recentJobChanges.length : 0
    };
  }

  private async getSupplyChainStatistics(): Promise<any> {
    const suppliers = await this.prisma.supplier.findMany({ where: { isActive: true } });
    const recentOrders = await this.prisma.purchaseOrder.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }
    });

    const avgDeliveryTime = recentOrders.length > 0
      ? recentOrders.reduce((sum, order) => {
          const deliveryTime = order.actualDelivery 
            ? (order.actualDelivery.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60)
            : 24;
          return sum + deliveryTime;
        }, 0) / recentOrders.length
      : 24;

    return {
      activeSuppliers: suppliers.length,
      avgDeliveryTime: Math.round(avgDeliveryTime),
      inventoryLevels: 'ADEQUATE' // 簡化指標
    };
  }

  private async resetSupplierMetrics(): Promise<void> {
    // 重置供應商聲譽和價格到合理範圍
    await this.prisma.supplier.updateMany({
      data: {
        reputationScore: { multiply: 0.95 }, // 輕微下降，需要維護
        baseMarkupPercentage: { set: 20 } // 重置到基礎加價
      }
    });

    this.logger.log('[EconomicIntegrationService] 供應商指標已重置');
  }
}