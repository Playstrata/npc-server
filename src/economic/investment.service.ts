import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankingService } from './banking.service';

export interface InvestmentProduct {
  id: string;
  type: InvestmentType;
  name: string;
  description: string;
  minAmount: number;
  maxAmount: number;
  annualReturn: number;
  termMonths?: number; // null for flexible products
  riskLevel: RiskLevel;
  requiresCredit: boolean;
  minCreditScore?: number;
  minLevel?: number;
}

export interface InvestmentResult {
  success: boolean;
  message: string;
  investmentId?: string;
  expectedReturn?: number;
  maturityDate?: Date;
}

export interface InvestmentInfo {
  id: string;
  productName: string;
  type: InvestmentType;
  principalAmount: number;
  currentValue: number;
  interestRate: number;
  termMonths?: number;
  status: InvestmentStatus;
  investedAt: Date;
  maturityDate?: Date;
  expectedReturn: number;
  daysRemaining?: number;
}

export enum InvestmentType {
  FIXED_DEPOSIT = 'FIXED_DEPOSIT',
  MUTUAL_FUND = 'MUTUAL_FUND',
  GOVERNMENT_BOND = 'GOVERNMENT_BOND',
  CORPORATE_BOND = 'CORPORATE_BOND',
  LIFE_INSURANCE = 'LIFE_INSURANCE',
  INVESTMENT_INSURANCE = 'INVESTMENT_INSURANCE'
}

export enum RiskLevel {
  VERY_LOW = 'VERY_LOW',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  VERY_HIGH = 'VERY_HIGH'
}

export enum InvestmentStatus {
  ACTIVE = 'ACTIVE',
  MATURED = 'MATURED',
  CANCELLED = 'CANCELLED',
  LIQUIDATED = 'LIQUIDATED'
}

@Injectable()
export class InvestmentService {
  private readonly logger = new Logger(InvestmentService.name);

  // 預定義投資產品
  private readonly investmentProducts: InvestmentProduct[] = [
    // 定期存款 - 最安全
    {
      id: 'fd-3m',
      type: InvestmentType.FIXED_DEPOSIT,
      name: '3個月定期存款',
      description: '短期安全投資，保證收益',
      minAmount: 1000,
      maxAmount: 100000,
      annualReturn: 3.5,
      termMonths: 3,
      riskLevel: RiskLevel.VERY_LOW,
      requiresCredit: false
    },
    {
      id: 'fd-12m',
      type: InvestmentType.FIXED_DEPOSIT,
      name: '12個月定期存款',
      description: '一年期定存，穩定收益',
      minAmount: 5000,
      maxAmount: 500000,
      annualReturn: 5.0,
      termMonths: 12,
      riskLevel: RiskLevel.VERY_LOW,
      requiresCredit: false
    },
    {
      id: 'fd-60m',
      type: InvestmentType.FIXED_DEPOSIT,
      name: '5年期定期存款',
      description: '長期定存，最高保證收益',
      minAmount: 10000,
      maxAmount: 1000000,
      annualReturn: 8.0,
      termMonths: 60,
      riskLevel: RiskLevel.VERY_LOW,
      requiresCredit: false
    },

    // 政府債券 - 安全
    {
      id: 'gov-bond-1y',
      type: InvestmentType.GOVERNMENT_BOND,
      name: '政府公債1年期',
      description: '政府發行，風險極低',
      minAmount: 10000,
      maxAmount: 2000000,
      annualReturn: 4.0,
      termMonths: 12,
      riskLevel: RiskLevel.LOW,
      requiresCredit: false
    },
    {
      id: 'gov-bond-10y',
      type: InvestmentType.GOVERNMENT_BOND,
      name: '政府公債10年期',
      description: '長期政府債券，穩健投資',
      minAmount: 50000,
      maxAmount: 5000000,
      annualReturn: 6.0,
      termMonths: 120,
      riskLevel: RiskLevel.LOW,
      requiresCredit: false
    },

    // 企業債券 - 中等風險
    {
      id: 'corp-bond-aa',
      type: InvestmentType.CORPORATE_BOND,
      name: 'AA級企業債券',
      description: '高信評企業發行，收益較佳',
      minAmount: 25000,
      maxAmount: 1000000,
      annualReturn: 7.5,
      termMonths: 24,
      riskLevel: RiskLevel.MEDIUM,
      requiresCredit: true,
      minCreditScore: 600,
      minLevel: 15
    },
    {
      id: 'corp-bond-bbb',
      type: InvestmentType.CORPORATE_BOND,
      name: 'BBB級企業債券',
      description: '中等信評企業，高收益債券',
      minAmount: 50000,
      maxAmount: 500000,
      annualReturn: 12.0,
      termMonths: 36,
      riskLevel: RiskLevel.HIGH,
      requiresCredit: true,
      minCreditScore: 650,
      minLevel: 25
    },

    // 共同基金 - 高風險高報酬
    {
      id: 'mutual-balanced',
      type: InvestmentType.MUTUAL_FUND,
      name: '平衡型基金',
      description: '股債均衡配置，適合穩健投資',
      minAmount: 5000,
      maxAmount: 2000000,
      annualReturn: 6.5, // 預期報酬，實際會波動
      riskLevel: RiskLevel.MEDIUM,
      requiresCredit: true,
      minCreditScore: 550,
      minLevel: 10
    },
    {
      id: 'mutual-growth',
      type: InvestmentType.MUTUAL_FUND,
      name: '成長型基金',
      description: '以股票為主，追求高成長',
      minAmount: 10000,
      maxAmount: 1000000,
      annualReturn: 10.0, // 預期報酬，波動較大
      riskLevel: RiskLevel.HIGH,
      requiresCredit: true,
      minCreditScore: 600,
      minLevel: 20
    },
    {
      id: 'mutual-aggressive',
      type: InvestmentType.MUTUAL_FUND,
      name: '積極型基金',
      description: '高風險高報酬，適合積極投資者',
      minAmount: 25000,
      maxAmount: 500000,
      annualReturn: 15.0, // 預期報酬，風險最高
      riskLevel: RiskLevel.VERY_HIGH,
      requiresCredit: true,
      minCreditScore: 700,
      minLevel: 30
    },

    // 保險產品 - 保障型
    {
      id: 'life-insurance',
      type: InvestmentType.LIFE_INSURANCE,
      name: '終身壽險',
      description: '生命保障+儲蓄功能',
      minAmount: 12000, // 年繳保費
      maxAmount: 600000,
      annualReturn: 2.5,
      riskLevel: RiskLevel.VERY_LOW,
      requiresCredit: false
    },
    {
      id: 'invest-insurance',
      type: InvestmentType.INVESTMENT_INSURANCE,
      name: '投資型保險',
      description: '保障+投資，收益與市場連動',
      minAmount: 24000, // 年繳保費
      maxAmount: 1200000,
      annualReturn: 5.5, // 預期報酬
      riskLevel: RiskLevel.MEDIUM,
      requiresCredit: true,
      minCreditScore: 550,
      minLevel: 15
    }
  ];

  constructor(
    private prisma: PrismaService,
    private bankingService: BankingService
  ) {}

  /**
   * 獲取所有可用的投資產品
   */
  async getAvailableProducts(characterId: string): Promise<InvestmentProduct[]> {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { level: true }
    });

    const bankAccount = await this.bankingService.getBankAccount(characterId);

    if (!character || !bankAccount) {
      return [];
    }

    // 根據角色等級和信用評分篩選產品
    return this.investmentProducts.filter(product => {
      // 檢查等級要求
      if (product.minLevel && character.level < product.minLevel) {
        return false;
      }

      // 檢查信用評分要求
      if (product.requiresCredit && product.minCreditScore) {
        if (bankAccount.creditScore < product.minCreditScore) {
          return false;
        }
      }

      return true;
    });
  }

  /**
   * 獲取特定投資產品詳情
   */
  getProductDetails(productId: string): InvestmentProduct | null {
    return this.investmentProducts.find(p => p.id === productId) || null;
  }

  /**
   * 購買投資產品
   */
  async purchaseInvestment(
    characterId: string,
    productId: string,
    amount: number
  ): Promise<InvestmentResult> {
    const product = this.getProductDetails(productId);
    if (!product) {
      return { success: false, message: '投資產品不存在' };
    }

    // 驗證投資金額
    if (amount < product.minAmount || amount > product.maxAmount) {
      return {
        success: false,
        message: `投資金額必須在 ${product.minAmount} - ${product.maxAmount} 金幣之間`
      };
    }

    // 檢查銀行帳戶
    const bankAccount = await this.bankingService.getBankAccount(characterId);
    if (!bankAccount) {
      return { success: false, message: '需要先開設銀行帳戶' };
    }

    if (bankAccount.balance < amount) {
      return { success: false, message: '帳戶餘額不足' };
    }

    // 檢查資格
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { level: true }
    });

    if (!character) {
      return { success: false, message: '角色不存在' };
    }

    if (product.minLevel && character.level < product.minLevel) {
      return { success: false, message: `需要達到 ${product.minLevel} 級才能購買此產品` };
    }

    if (product.requiresCredit && product.minCreditScore) {
      if (bankAccount.creditScore < product.minCreditScore) {
        return {
          success: false,
          message: `信用評分需要達到 ${product.minCreditScore} 才能購買此產品`
        };
      }
    }

    // 計算到期日
    let maturityDate: Date | null = null;
    if (product.termMonths) {
      maturityDate = new Date();
      maturityDate.setMonth(maturityDate.getMonth() + product.termMonths);
    }

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // 扣除銀行帳戶餘額
        await prisma.bankAccount.update({
          where: { characterId },
          data: { balance: bankAccount.balance - amount }
        });

        // 創建投資記錄
        const investment = await prisma.investment.create({
          data: {
            bankAccountId: bankAccount.id,
            investmentType: product.type,
            productName: product.name,
            principalAmount: amount,
            interestRate: product.annualReturn,
            termMonths: product.termMonths,
            currentValue: amount,
            maturityDate,
            status: 'ACTIVE'
          }
        });

        // 記錄銀行交易
        await prisma.bankTransaction.create({
          data: {
            bankAccountId: bankAccount.id,
            transactionType: 'INVESTMENT',
            amount: -amount,
            balanceAfter: bankAccount.balance - amount,
            description: `購買投資產品: ${product.name}`,
            referenceId: investment.id,
            status: 'COMPLETED'
          }
        });

        return investment;
      });

      // 計算預期收益
      const expectedReturn = this.calculateExpectedReturn(amount, product.annualReturn, product.termMonths);

      this.logger.log(`[InvestmentService] 角色 ${characterId} 購買投資產品 ${product.name}，金額 ${amount}`);

      return {
        success: true,
        message: `成功購買 ${product.name}`,
        investmentId: result.id,
        expectedReturn,
        maturityDate
      };

    } catch (error) {
      this.logger.error('[InvestmentService] 購買投資產品失敗:', error);
      return { success: false, message: '購買失敗，請稍後再試' };
    }
  }

  /**
   * 獲取角色的投資組合
   */
  async getPortfolio(characterId: string): Promise<InvestmentInfo[]> {
    const bankAccount = await this.bankingService.getBankAccount(characterId);
    if (!bankAccount) {
      return [];
    }

    const investments = await this.prisma.investment.findMany({
      where: { bankAccountId: bankAccount.id },
      orderBy: { investedAt: 'desc' }
    });

    return investments.map(investment => {
      const product = this.getProductDetails(investment.investmentType);
      const expectedReturn = this.calculateExpectedReturn(
        investment.principalAmount,
        investment.interestRate,
        investment.termMonths
      );

      let daysRemaining: number | undefined;
      if (investment.maturityDate) {
        const now = new Date();
        const diffTime = investment.maturityDate.getTime() - now.getTime();
        daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      }

      return {
        id: investment.id,
        productName: investment.productName,
        type: investment.investmentType as InvestmentType,
        principalAmount: investment.principalAmount,
        currentValue: investment.currentValue,
        interestRate: investment.interestRate,
        termMonths: investment.termMonths,
        status: investment.status as InvestmentStatus,
        investedAt: investment.investedAt,
        maturityDate: investment.maturityDate,
        expectedReturn,
        daysRemaining
      };
    });
  }

  /**
   * 提前贖回投資（可能有手續費）
   */
  async liquidateInvestment(
    characterId: string,
    investmentId: string
  ): Promise<InvestmentResult> {
    const bankAccount = await this.bankingService.getBankAccount(characterId);
    if (!bankAccount) {
      return { success: false, message: '銀行帳戶不存在' };
    }

    const investment = await this.prisma.investment.findFirst({
      where: {
        id: investmentId,
        bankAccountId: bankAccount.id,
        status: 'ACTIVE'
      }
    });

    if (!investment) {
      return { success: false, message: '找不到有效的投資記錄' };
    }

    // 計算提前贖回價值
    const liquidationValue = this.calculateLiquidationValue(investment);
    const penalty = investment.principalAmount - liquidationValue;

    try {
      await this.prisma.$transaction(async (prisma) => {
        // 更新投資狀態
        await prisma.investment.update({
          where: { id: investmentId },
          data: {
            status: 'LIQUIDATED',
            currentValue: liquidationValue
          }
        });

        // 返還資金到銀行帳戶
        await prisma.bankAccount.update({
          where: { characterId },
          data: { balance: bankAccount.balance + liquidationValue }
        });

        // 記錄交易
        await prisma.bankTransaction.create({
          data: {
            bankAccountId: bankAccount.id,
            transactionType: 'INVESTMENT',
            amount: liquidationValue,
            balanceAfter: bankAccount.balance + liquidationValue,
            description: `提前贖回投資: ${investment.productName}`,
            referenceId: investmentId,
            status: 'COMPLETED'
          }
        });
      });

      this.logger.log(`[InvestmentService] 角色 ${characterId} 提前贖回投資 ${investmentId}，獲得 ${liquidationValue}`);

      return {
        success: true,
        message: penalty > 0 
          ? `提前贖回成功，扣除手續費 ${penalty.toFixed(2)} 金幣，實際獲得 ${liquidationValue.toFixed(2)} 金幣`
          : `贖回成功，獲得 ${liquidationValue.toFixed(2)} 金幣`,
        expectedReturn: liquidationValue
      };

    } catch (error) {
      this.logger.error('[InvestmentService] 提前贖回失敗:', error);
      return { success: false, message: '贖回失敗，請稍後再試' };
    }
  }

  /**
   * 處理到期投資（每日執行）
   */
  async processMaturedInvestments(): Promise<void> {
    const now = new Date();
    
    const maturedInvestments = await this.prisma.investment.findMany({
      where: {
        status: 'ACTIVE',
        maturityDate: {
          lte: now
        }
      },
      include: {
        bankAccount: true
      }
    });

    for (const investment of maturedInvestments) {
      const maturityValue = this.calculateMaturityValue(investment);
      
      await this.prisma.$transaction(async (prisma) => {
        // 更新投資狀態
        await prisma.investment.update({
          where: { id: investment.id },
          data: {
            status: 'MATURED',
            currentValue: maturityValue
          }
        });

        // 返還本金和收益
        await prisma.bankAccount.update({
          where: { id: investment.bankAccountId },
          data: {
            balance: investment.bankAccount.balance + maturityValue
          }
        });

        // 記錄交易
        await prisma.bankTransaction.create({
          data: {
            bankAccountId: investment.bankAccountId,
            transactionType: 'INVESTMENT',
            amount: maturityValue,
            balanceAfter: investment.bankAccount.balance + maturityValue,
            description: `投資到期: ${investment.productName}`,
            referenceId: investment.id,
            status: 'COMPLETED'
          }
        });
      });

      this.logger.log(`[InvestmentService] 投資 ${investment.id} 到期，價值 ${maturityValue}`);
    }

    this.logger.log(`[InvestmentService] 處理了 ${maturedInvestments.length} 個到期投資`);
  }

  /**
   * 更新共同基金價值（基於市場波動）
   */
  async updateMutualFundValues(): Promise<void> {
    const mutualFunds = await this.prisma.investment.findMany({
      where: {
        investmentType: InvestmentType.MUTUAL_FUND,
        status: 'ACTIVE'
      }
    });

    for (const fund of mutualFunds) {
      // 基於市場波動計算新價值
      const marketVolatility = this.generateMarketVolatility(fund.investmentType);
      const daysSinceInvestment = this.calculateDaysSinceInvestment(fund.investedAt);
      const newValue = this.calculateMutualFundValue(
        fund.principalAmount,
        fund.interestRate,
        daysSinceInvestment,
        marketVolatility
      );

      await this.prisma.investment.update({
        where: { id: fund.id },
        data: { currentValue: newValue }
      });
    }

    this.logger.log(`[InvestmentService] 更新了 ${mutualFunds.length} 個共同基金價值`);
  }

  /**
   * 計算預期收益
   */
  private calculateExpectedReturn(principal: number, annualRate: number, termMonths?: number): number {
    if (!termMonths) {
      return principal; // 無固定期限
    }
    
    const yearlyReturn = principal * (annualRate / 100);
    return principal + (yearlyReturn * termMonths / 12);
  }

  /**
   * 計算提前贖回價值
   */
  private calculateLiquidationValue(investment: any): number {
    const daysSinceInvestment = this.calculateDaysSinceInvestment(investment.investedAt);
    const product = this.getProductDetails(investment.investmentType);
    
    if (!product) {
      return investment.principalAmount * 0.95; // 5% 手續費
    }

    // 根據產品類型計算提前贖回價值
    switch (product.type) {
      case InvestmentType.FIXED_DEPOSIT:
        // 定期存款提前解約，無利息且有手續費
        return investment.principalAmount * 0.98; // 2% 手續費
        
      case InvestmentType.GOVERNMENT_BOND:
      case InvestmentType.CORPORATE_BOND:
        // 債券按已持有天數計算利息
        const earnedInterest = (investment.principalAmount * investment.interestRate / 100 / 365) * daysSinceInvestment;
        return investment.principalAmount + earnedInterest * 0.8; // 20% 手續費
        
      case InvestmentType.MUTUAL_FUND:
        // 共同基金按市場價值，扣除手續費
        return investment.currentValue * 0.97; // 3% 手續費
        
      case InvestmentType.LIFE_INSURANCE:
      case InvestmentType.INVESTMENT_INSURANCE:
        // 保險產品提前解約價值較低
        if (daysSinceInvestment < 365) {
          return investment.principalAmount * 0.7; // 一年內解約只退70%
        } else {
          return investment.principalAmount * 0.9; // 一年後解約退90%
        }
        
      default:
        return investment.principalAmount * 0.95;
    }
  }

  /**
   * 計算到期價值
   */
  private calculateMaturityValue(investment: any): number {
    const product = this.getProductDetails(investment.investmentType);
    if (!product || !investment.termMonths) {
      return investment.currentValue;
    }

    // 固定收益產品按約定利率計算
    if ([InvestmentType.FIXED_DEPOSIT, InvestmentType.GOVERNMENT_BOND, InvestmentType.CORPORATE_BOND].includes(product.type)) {
      const yearlyReturn = investment.principalAmount * (investment.interestRate / 100);
      return investment.principalAmount + (yearlyReturn * investment.termMonths / 12);
    }

    // 其他產品使用當前價值
    return investment.currentValue;
  }

  /**
   * 計算共同基金價值（含市場波動）
   */
  private calculateMutualFundValue(
    principal: number,
    expectedAnnualReturn: number,
    daysSinceInvestment: number,
    marketVolatility: number
  ): number {
    const expectedDailyReturn = expectedAnnualReturn / 100 / 365;
    const actualDailyReturn = expectedDailyReturn * (1 + marketVolatility);
    
    return principal * Math.pow(1 + actualDailyReturn, daysSinceInvestment);
  }

  /**
   * 生成市場波動率
   */
  private generateMarketVolatility(investmentType: string): number {
    // 根據投資類型產生不同程度的波動
    const baseVolatility = {
      [InvestmentType.MUTUAL_FUND]: 0.15, // ±15%
      [InvestmentType.INVESTMENT_INSURANCE]: 0.08 // ±8%
    };

    const volatility = baseVolatility[investmentType] || 0.1;
    
    // 產生 -volatility 到 +volatility 之間的隨機數
    return (Math.random() - 0.5) * 2 * volatility;
  }

  /**
   * 計算投資天數
   */
  private calculateDaysSinceInvestment(investedAt: Date): number {
    const now = new Date();
    const diffTime = now.getTime() - investedAt.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  }
}