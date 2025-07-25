import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface BankAccountInfo {
  id: string;
  characterId: string;
  accountType: 'BASIC' | 'PREMIUM' | 'BUSINESS';
  balance: number;
  creditScore: number;
  creditLimit: number;
  interestRate: number;
  accountStatus: 'ACTIVE' | 'SUSPENDED' | 'CLOSED';
  openedAt: Date;
}

export interface LoanInfo {
  id: string;
  principalAmount: number;
  interestRate: number;
  termMonths: number;
  monthlyPayment: number;
  remainingBalance: number;
  status: 'ACTIVE' | 'PAID_OFF' | 'DEFAULTED' | 'OVERDUE';
  loanPurpose: string;
  nextPaymentDue: Date | null;
}

export interface TransactionResult {
  success: boolean;
  message: string;
  newBalance?: number;
  transactionId?: string;
}

export interface LoanApplication {
  amount: number;
  termMonths: number;
  purpose: 'Job Change' | 'Equipment' | 'Business' | 'Investment';
  collateralType?: 'Equipment' | 'Property' | 'None';
  collateralValue?: number;
}

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * 創建銀行帳戶
   */
  async createBankAccount(
    characterId: string,
    accountType: 'BASIC' | 'PREMIUM' | 'BUSINESS' = 'BASIC'
  ): Promise<BankAccountInfo> {
    // 檢查是否已有帳戶
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { characterId }
    });

    if (existingAccount) {
      throw new BadRequestException('角色已有銀行帳戶');
    }

    // 獲取角色信息來評估信用分數
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { 
        level: true, 
        characterClass: true, 
        goldAmount: true,
        luckPercentage: true 
      }
    });

    if (!character) {
      throw new BadRequestException('角色不存在');
    }

    // 計算初始信用分數
    const baseCreditScore = this.calculateInitialCreditScore(character);
    const creditLimit = this.calculateCreditLimit(baseCreditScore, accountType);
    const interestRate = this.calculateInterestRate(baseCreditScore, accountType);

    const account = await this.prisma.bankAccount.create({
      data: {
        characterId,
        accountType,
        balance: 0,
        creditScore: baseCreditScore,
        creditLimit,
        interestRate,
        accountStatus: 'ACTIVE'
      }
    });

    this.logger.log(`[BankingService] 為角色 ${characterId} 創建 ${accountType} 帳戶`);

    return this.mapToBankAccountInfo(account);
  }

  /**
   * 獲取銀行帳戶信息
   */
  async getBankAccount(characterId: string): Promise<BankAccountInfo | null> {
    const account = await this.prisma.bankAccount.findUnique({
      where: { characterId }
    });

    return account ? this.mapToBankAccountInfo(account) : null;
  }

  /**
   * 存款
   */
  async deposit(characterId: string, amount: number): Promise<TransactionResult> {
    if (amount <= 0) {
      return { success: false, message: '存款金額必須大於0' };
    }

    // 檢查角色金幣是否足夠
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id: characterId },
      select: { goldAmount: true }
    });

    if (!character || character.goldAmount < amount) {
      return { success: false, message: '金幣不足' };
    }

    const account = await this.prisma.bankAccount.findUnique({
      where: { characterId }
    });

    if (!account) {
      return { success: false, message: '銀行帳戶不存在' };
    }

    if (account.accountStatus !== 'ACTIVE') {
      return { success: false, message: '帳戶已被凍結' };
    }

    // 執行存款交易
    const result = await this.prisma.$transaction(async (prisma) => {
      // 扣除角色金幣
      await prisma.gameCharacter.update({
        where: { id: characterId },
        data: { goldAmount: character.goldAmount - amount }
      });

      // 增加銀行餘額
      const updatedAccount = await prisma.bankAccount.update({
        where: { characterId },
        data: { balance: account.balance + amount }
      });

      // 記錄交易
      const transaction = await prisma.bankTransaction.create({
        data: {
          bankAccountId: account.id,
          transactionType: 'DEPOSIT',
          amount,
          balanceAfter: updatedAccount.balance,
          description: `存款 ${amount} 金幣`,
          status: 'COMPLETED'
        }
      });

      return {
        success: true,
        message: `成功存款 ${amount} 金幣`,
        newBalance: updatedAccount.balance,
        transactionId: transaction.id
      };
    });

    this.logger.log(`[BankingService] 角色 ${characterId} 存款 ${amount} 金幣`);
    return result;
  }

  /**
   * 提款
   */
  async withdraw(characterId: string, amount: number): Promise<TransactionResult> {
    if (amount <= 0) {
      return { success: false, message: '提款金額必須大於0' };
    }

    const account = await this.prisma.bankAccount.findUnique({
      where: { characterId }
    });

    if (!account) {
      return { success: false, message: '銀行帳戶不存在' };
    }

    if (account.accountStatus !== 'ACTIVE') {
      return { success: false, message: '帳戶已被凍結' };
    }

    if (account.balance < amount) {
      return { success: false, message: '帳戶餘額不足' };
    }

    // 執行提款交易
    const result = await this.prisma.$transaction(async (prisma) => {
      // 減少銀行餘額
      const updatedAccount = await prisma.bankAccount.update({
        where: { characterId },
        data: { balance: account.balance - amount }
      });

      // 增加角色金幣
      await prisma.gameCharacter.update({
        where: { id: characterId },
        data: { 
          goldAmount: {
            increment: amount
          }
        }
      });

      // 記錄交易
      const transaction = await prisma.bankTransaction.create({
        data: {
          bankAccountId: account.id,
          transactionType: 'WITHDRAWAL',
          amount: -amount, // 負數表示支出
          balanceAfter: updatedAccount.balance,
          description: `提款 ${amount} 金幣`,
          status: 'COMPLETED'
        }
      });

      return {
        success: true,
        message: `成功提款 ${amount} 金幣`,
        newBalance: updatedAccount.balance,
        transactionId: transaction.id
      };
    });

    this.logger.log(`[BankingService] 角色 ${characterId} 提款 ${amount} 金幣`);
    return result;
  }

  /**
   * 申請貸款
   */
  async applyForLoan(
    characterId: string,
    application: LoanApplication
  ): Promise<{
    approved: boolean;
    message: string;
    loanId?: string;
    terms?: {
      amount: number;
      interestRate: number;
      monthlyPayment: number;
      totalInterest: number;
    };
  }> {
    const account = await this.prisma.bankAccount.findUnique({
      where: { characterId }
    });

    if (!account) {
      return { approved: false, message: '需要先開設銀行帳戶' };
    }

    // 評估信用資格
    const creditAssessment = await this.assessCreditworthiness(characterId, application);
    
    if (!creditAssessment.approved) {
      return { 
        approved: false, 
        message: creditAssessment.reason || '信用評估未通過' 
      };
    }

    // 計算貸款條件
    const baseRate = account.interestRate;
    const riskAdjustment = this.calculateRiskAdjustment(application, account.creditScore);
    const finalRate = baseRate + riskAdjustment;
    
    const monthlyPayment = this.calculateMonthlyPayment(
      application.amount,
      finalRate,
      application.termMonths
    );

    const totalInterest = (monthlyPayment * application.termMonths) - application.amount;

    // 創建貸款記錄
    const loan = await this.prisma.loan.create({
      data: {
        characterId,
        bankAccountId: account.id,
        principalAmount: application.amount,
        interestRate: finalRate,
        termMonths: application.termMonths,
        monthlyPayment,
        remainingBalance: application.amount,
        status: 'ACTIVE',
        loanPurpose: application.purpose,
        collateralType: application.collateralType || 'None',
        collateralValue: application.collateralValue || 0,
        nextPaymentDue: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30天後
      }
    });

    // 將貸款金額存入帳戶
    await this.prisma.bankAccount.update({
      where: { characterId },
      data: { balance: account.balance + application.amount }
    });

    // 記錄交易
    await this.prisma.bankTransaction.create({
      data: {
        bankAccountId: account.id,
        transactionType: 'LOAN',
        amount: application.amount,
        balanceAfter: account.balance + application.amount,
        description: `${application.purpose}貸款放款`,
        referenceId: loan.id,
        status: 'COMPLETED'
      }
    });

    this.logger.log(`[BankingService] 角色 ${characterId} 獲得貸款 ${application.amount} 金幣，期限 ${application.termMonths} 個月`);

    return {
      approved: true,
      message: '貸款申請已通過',
      loanId: loan.id,
      terms: {
        amount: application.amount,
        interestRate: finalRate,
        monthlyPayment,
        totalInterest
      }
    };
  }

  /**
   * 還款
   */
  async makePayment(characterId: string, loanId: string, amount: number): Promise<TransactionResult> {
    const loan = await this.prisma.loan.findFirst({
      where: {
        id: loanId,
        characterId,
        status: 'ACTIVE'
      },
      include: {
        bankAccount: true
      }
    });

    if (!loan) {
      return { success: false, message: '找不到有效的貸款' };
    }

    if (amount <= 0) {
      return { success: false, message: '還款金額必須大於0' };
    }

    if (loan.bankAccount.balance < amount) {
      return { success: false, message: '帳戶餘額不足' };
    }

    // 計算利息和本金分配
    const monthlyInterest = loan.remainingBalance * (loan.interestRate / 100 / 12);
    const principalPayment = Math.max(0, amount - monthlyInterest);
    const interestPayment = amount - principalPayment;

    const newBalance = Math.max(0, loan.remainingBalance - principalPayment);
    const isFullyPaid = newBalance === 0;

    // 執行還款
    const result = await this.prisma.$transaction(async (prisma) => {
      // 扣除帳戶餘額
      await prisma.bankAccount.update({
        where: { id: loan.bankAccountId },
        data: { balance: loan.bankAccount.balance - amount }
      });

      // 更新貸款狀態
      await prisma.loan.update({
        where: { id: loanId },
        data: {
          remainingBalance: newBalance,
          status: isFullyPaid ? 'PAID_OFF' : 'ACTIVE',
          nextPaymentDue: isFullyPaid ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        }
      });

      // 記錄還款
      await prisma.loanPayment.create({
        data: {
          loanId,
          paymentAmount: amount,
          principalAmount: principalPayment,
          interestAmount: interestPayment,
          paymentType: 'SCHEDULED',
          paymentStatus: 'COMPLETED'
        }
      });

      // 記錄銀行交易
      await prisma.bankTransaction.create({
        data: {
          bankAccountId: loan.bankAccountId,
          transactionType: 'LOAN',
          amount: -amount,
          balanceAfter: loan.bankAccount.balance - amount,
          description: `貸款還款 ${amount} 金幣`,
          referenceId: loanId,
          status: 'COMPLETED'
        }
      });

      return {
        success: true,
        message: isFullyPaid ? '貸款已全額還清' : `成功還款 ${amount} 金幣，剩餘 ${newBalance} 金幣`,
        newBalance: loan.bankAccount.balance - amount
      };
    });

    // 更新信用分數
    if (isFullyPaid) {
      await this.updateCreditScore(characterId, 25); // 還清貸款提升信用
    } else {
      await this.updateCreditScore(characterId, 2); // 按時還款小幅提升信用
    }

    this.logger.log(`[BankingService] 角色 ${characterId} 還款 ${amount} 金幣，貸款 ${loanId}`);
    return result;
  }

  /**
   * 獲取貸款列表
   */
  async getLoans(characterId: string): Promise<LoanInfo[]> {
    const loans = await this.prisma.loan.findMany({
      where: { characterId },
      orderBy: { approvedAt: 'desc' }
    });

    return loans.map(loan => ({
      id: loan.id,
      principalAmount: loan.principalAmount,
      interestRate: loan.interestRate,
      termMonths: loan.termMonths,
      monthlyPayment: loan.monthlyPayment,
      remainingBalance: loan.remainingBalance,
      status: loan.status as any,
      loanPurpose: loan.loanPurpose,
      nextPaymentDue: loan.nextPaymentDue
    }));
  }

  /**
   * 計算每月還款金額
   */
  private calculateMonthlyPayment(principal: number, annualRate: number, termMonths: number): number {
    const monthlyRate = annualRate / 100 / 12;
    if (monthlyRate === 0) return principal / termMonths;
    
    const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, termMonths)) /
                    (Math.pow(1 + monthlyRate, termMonths) - 1);
    
    return Math.round(payment * 100) / 100;
  }

  /**
   * 計算初始信用分數
   */
  private calculateInitialCreditScore(character: any): number {
    let score = 500; // 基礎分數

    // 等級加成
    score += Math.min(character.level * 10, 100);

    // 職業加成
    const classBonus = {
      'WARRIOR': 20,
      'MAGE': 30,
      'ARCHER': 15,
      'ROGUE': 10,
      'NOVICE': 0
    };
    score += classBonus[character.characterClass] || 0;

    // 金幣數量影響
    if (character.goldAmount > 1000) score += 50;
    else if (character.goldAmount > 500) score += 25;

    // 幸運值影響
    const luckFactor = (character.luckPercentage - 50) / 100;
    score += Math.round(luckFactor * 50);

    return Math.max(300, Math.min(850, score));
  }

  /**
   * 計算信用額度
   */
  private calculateCreditLimit(creditScore: number, accountType: string): number {
    let baseLimit = creditScore * 2; // 基礎額度

    const typeMultiplier = {
      'BASIC': 1.0,
      'PREMIUM': 1.5,
      'BUSINESS': 2.0
    };

    return Math.round(baseLimit * (typeMultiplier[accountType] || 1.0));
  }

  /**
   * 計算利率
   */
  private calculateInterestRate(creditScore: number, accountType: string): number {
    let baseRate = 15 - ((creditScore - 300) / 550 * 10); // 5%-15%

    const typeDiscount = {
      'BASIC': 0,
      'PREMIUM': -1,
      'BUSINESS': -2
    };

    return Math.max(3, baseRate + (typeDiscount[accountType] || 0));
  }

  /**
   * 評估信用資格
   */
  private async assessCreditworthiness(
    characterId: string,
    application: LoanApplication
  ): Promise<{ approved: boolean; reason?: string }> {
    const account = await this.prisma.bankAccount.findUnique({
      where: { characterId }
    });

    if (!account) {
      return { approved: false, reason: '沒有銀行帳戶' };
    }

    // 檢查信用額度
    if (application.amount > account.creditLimit) {
      return { approved: false, reason: '申請金額超過信用額度' };
    }

    // 檢查現有貸款
    const existingLoans = await this.prisma.loan.count({
      where: {
        characterId,
        status: 'ACTIVE'
      }
    });

    if (existingLoans >= 3) {
      return { approved: false, reason: '現有貸款過多' };
    }

    // 信用分數檢查
    if (account.creditScore < 400) {
      return { approved: false, reason: '信用分數過低' };
    }

    return { approved: true };
  }

  /**
   * 計算風險調整
   */
  private calculateRiskAdjustment(application: LoanApplication, creditScore: number): number {
    let adjustment = 0;

    // 貸款用途風險
    const purposeRisk = {
      'Job Change': 0,     // 轉職風險最低
      'Equipment': 1,      // 裝備有一定風險
      'Business': 3,       // 商業風險較高
      'Investment': 5      // 投資風險最高
    };
    adjustment += purposeRisk[application.purpose] || 2;

    // 信用分數調整
    if (creditScore < 500) adjustment += 3;
    else if (creditScore < 600) adjustment += 1;

    // 抵押品調整
    if (application.collateralType && application.collateralType !== 'None') {
      adjustment -= 2; // 有抵押品降低風險
    }

    return Math.max(0, adjustment);
  }

  /**
   * 更新信用分數
   */
  private async updateCreditScore(characterId: string, change: number): Promise<void> {
    await this.prisma.bankAccount.update({
      where: { characterId },
      data: {
        creditScore: {
          increment: change
        }
      }
    });
  }

  /**
   * 轉換為銀行帳戶信息
   */
  private mapToBankAccountInfo(account: any): BankAccountInfo {
    return {
      id: account.id,
      characterId: account.characterId,
      accountType: account.accountType,
      balance: account.balance,
      creditScore: account.creditScore,
      creditLimit: account.creditLimit,
      interestRate: account.interestRate,
      accountStatus: account.accountStatus,
      openedAt: account.openedAt
    };
  }

  /**
   * 計算利息（每日執行）
   */
  async calculateDailyInterest(): Promise<void> {
    const accounts = await this.prisma.bankAccount.findMany({
      where: {
        balance: { gt: 0 },
        accountStatus: 'ACTIVE'
      }
    });

    for (const account of accounts) {
      // 存款利息（較低）
      const dailyRate = account.interestRate / 100 / 365;
      const interestEarned = Math.round(account.balance * dailyRate * 100) / 100;

      if (interestEarned > 0.01) { // 最低利息門檻
        await this.prisma.bankAccount.update({
          where: { id: account.id },
          data: {
            balance: account.balance + interestEarned,
            lastInterestDate: new Date()
          }
        });

        await this.prisma.bankTransaction.create({
          data: {
            bankAccountId: account.id,
            transactionType: 'INTEREST',
            amount: interestEarned,
            balanceAfter: account.balance + interestEarned,
            description: '每日利息',
            status: 'COMPLETED'
          }
        });
      }
    }

    this.logger.log(`[BankingService] 處理了 ${accounts.length} 個帳戶的每日利息`);
  }
}