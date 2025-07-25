import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BankingService } from './banking.service';

export interface CompanyInfo {
  id: string;
  name: string;
  tickerSymbol: string;
  sector: CompanySector;
  description: string;
  currentPrice: number;
  marketCap: number;
  dividendYield: number;
  peRatio: number;
  priceChange: number;
  priceChangePercent: number;
  volume: number;
  high: number;
  low: number;
  isActive: boolean;
}

export interface StockTransaction {
  success: boolean;
  message: string;
  transactionId?: string;
  shares?: number;
  totalCost?: number;
  newPortfolioValue?: number;
}

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  positions: PortfolioPosition[];
}

export interface PortfolioPosition {
  companyId: string;
  companyName: string;
  tickerSymbol: string;
  sharesOwned: number;
  averageCost: number;
  currentPrice: number;
  currentValue: number;
  totalInvested: number;
  unrealizedGainLoss: number;
  unrealizedGainLossPercent: number;
}

export interface MarketOverview {
  totalMarketCap: number;
  avgPriceChange: number;
  topGainers: CompanyInfo[];
  topLosers: CompanyInfo[];
  mostActive: CompanyInfo[];
}

export enum CompanySector {
  RESOURCES = 'RESOURCES',      // 資源開採
  TRANSPORT = 'TRANSPORT',      // 運輸物流
  TECHNOLOGY = 'TECHNOLOGY',    // 科技創新
  SERVICES = 'SERVICES',        // 服務業
  FINANCE = 'FINANCE',          // 金融業
  MANUFACTURING = 'MANUFACTURING' // 製造業
}

@Injectable()
export class StockMarketService {
  private readonly logger = new Logger(StockMarketService.name);

  // 交易手續費率
  private readonly TRANSACTION_FEE_RATE = 0.002; // 0.2%
  private readonly MIN_TRANSACTION_FEE = 10; // 最低手續費 10 金幣

  constructor(
    private prisma: PrismaService,
    private bankingService: BankingService
  ) {}

  /**
   * 初始化股票市場（創建預設公司）
   */
  async initializeMarket(): Promise<void> {
    const existingCompanies = await this.prisma.company.count();
    if (existingCompanies > 0) {
      this.logger.log('[StockMarketService] 股票市場已初始化');
      return;
    }

    const companies = [
      // 資源公司
      {
        name: '地底寶石開採公司',
        tickerSymbol: 'GEMS',
        sector: CompanySector.RESOURCES,
        description: '專業開採稀有寶石和礦物的領導企業',
        currentPrice: 45.50,
        marketCap: 2275000,
        dividendYield: 3.2,
        peRatio: 18.5
      },
      {
        name: '魔法水晶集團',
        tickerSymbol: 'MCRYS',
        sector: CompanySector.RESOURCES,
        description: '魔法水晶開採與加工的知名企業',
        currentPrice: 89.20,
        marketCap: 4460000,
        dividendYield: 2.8,
        peRatio: 22.1
      },
      
      // 運輸公司
      {
        name: '飛龍快遞',
        tickerSymbol: 'FLYDR',
        sector: CompanySector.TRANSPORT,
        description: '跨大陸空中運輸與物流服務領導者',
        currentPrice: 34.75,
        marketCap: 1737500,
        dividendYield: 4.1,
        peRatio: 15.3
      },
      {
        name: '傳送門運輸',
        tickerSymbol: 'PORTAL',
        sector: CompanySector.TRANSPORT,
        description: '魔法傳送門網絡運營商',
        currentPrice: 125.60,
        marketCap: 6280000,
        dividendYield: 1.9,
        peRatio: 28.7
      },
      
      // 科技公司
      {
        name: '魔導科技',
        tickerSymbol: 'MTECH',
        sector: CompanySector.TECHNOLOGY,
        description: '魔法與科技融合的創新公司',
        currentPrice: 156.80,
        marketCap: 7840000,
        dividendYield: 0.8,
        peRatio: 45.2
      },
      {
        name: '煉金術創新',
        tickerSymbol: 'ALCHEM',
        sector: CompanySector.TECHNOLOGY,
        description: '先進煉金術技術研發企業',
        currentPrice: 78.30,
        marketCap: 3915000,
        dividendYield: 1.5,
        peRatio: 35.8
      },
      
      // 服務業
      {
        name: '冒險者公會聯盟',
        tickerSymbol: 'ADVGLD',
        sector: CompanySector.SERVICES,
        description: '冒險者服務與任務管理平台',
        currentPrice: 67.90,
        marketCap: 3395000,
        dividendYield: 5.2,
        peRatio: 12.8
      },
      {
        name: '魔法學院集團',
        tickerSymbol: 'MAGIC',
        sector: CompanySector.SERVICES,
        description: '魔法教育與研究機構',
        currentPrice: 98.45,
        marketCap: 4922500,
        dividendYield: 2.3,
        peRatio: 19.7
      },
      
      // 金融業
      {
        name: '王國中央銀行',
        tickerSymbol: 'KCBANK',
        sector: CompanySector.FINANCE,
        description: '王國最大的金融服務機構',
        currentPrice: 112.30,
        marketCap: 5615000,
        dividendYield: 6.8,
        peRatio: 11.2
      },
      
      // 製造業
      {
        name: '神匠武器工坊',
        tickerSymbol: 'WEAPON',
        sector: CompanySector.MANUFACTURING,
        description: '高品質武器裝備製造商',
        currentPrice: 52.70,
        marketCap: 2635000,
        dividendYield: 3.8,
        peRatio: 16.4
      }
    ];

    for (const companyData of companies) {
      const company = await this.prisma.company.create({
        data: {
          ...companyData,
          foundedAt: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000) // 隨機過去一年內成立
        }
      });

      // 創建初始股價記錄
      await this.prisma.stockPrice.create({
        data: {
          companyId: company.id,
          price: companyData.currentPrice,
          volume: Math.floor(Math.random() * 10000) + 1000,
          high: companyData.currentPrice * (1 + Math.random() * 0.05),
          low: companyData.currentPrice * (1 - Math.random() * 0.05),
          openPrice: companyData.currentPrice * (1 + (Math.random() - 0.5) * 0.02),
          closePrice: companyData.currentPrice,
          priceChange: 0,
          priceChangePercent: 0
        }
      });
    }

    this.logger.log(`[StockMarketService] 已初始化 ${companies.length} 家公司到股票市場`);
  }

  /**
   * 獲取所有可交易的公司
   */
  async getAllCompanies(): Promise<CompanyInfo[]> {
    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
      include: {
        stockPrices: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    return companies.map(company => {
      const latestPrice = company.stockPrices[0];
      return {
        id: company.id,
        name: company.name,
        tickerSymbol: company.tickerSymbol,
        sector: company.sector as CompanySector,
        description: company.description || '',
        currentPrice: company.currentPrice,
        marketCap: company.marketCap,
        dividendYield: company.dividendYield,
        peRatio: company.peRatio || 15.0,
        priceChange: latestPrice?.priceChange || 0,
        priceChangePercent: latestPrice?.priceChangePercent || 0,
        volume: latestPrice?.volume || 0,
        high: latestPrice?.high || company.currentPrice,
        low: latestPrice?.low || company.currentPrice,
        isActive: company.isActive
      };
    });
  }

  /**
   * 獲取特定公司詳情
   */
  async getCompanyDetails(companyId: string): Promise<CompanyInfo | null> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      include: {
        stockPrices: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    if (!company) return null;

    const latestPrice = company.stockPrices[0];
    return {
      id: company.id,
      name: company.name,
      tickerSymbol: company.tickerSymbol,
      sector: company.sector as CompanySector,
      description: company.description || '',
      currentPrice: company.currentPrice,
      marketCap: company.marketCap,
      dividendYield: company.dividendYield,
      peRatio: company.peRatio || 15.0,
      priceChange: latestPrice?.priceChange || 0,
      priceChangePercent: latestPrice?.priceChangePercent || 0,
      volume: latestPrice?.volume || 0,
      high: latestPrice?.high || company.currentPrice,
      low: latestPrice?.low || company.currentPrice,
      isActive: company.isActive
    };
  }

  /**
   * 購買股票
   */
  async buyStock(
    characterId: string,
    companyId: string,
    shares: number
  ): Promise<StockTransaction> {
    if (shares <= 0) {
      return { success: false, message: '購買股數必須大於0' };
    }

    const company = await this.getCompanyDetails(companyId);
    if (!company || !company.isActive) {
      return { success: false, message: '公司不存在或已停止交易' };
    }

    const totalCost = company.currentPrice * shares;
    const transactionFee = Math.max(totalCost * this.TRANSACTION_FEE_RATE, this.MIN_TRANSACTION_FEE);
    const totalAmount = totalCost + transactionFee;

    // 檢查銀行帳戶
    const bankAccount = await this.bankingService.getBankAccount(characterId);
    if (!bankAccount) {
      return { success: false, message: '需要先開設銀行帳戶' };
    }

    if (bankAccount.balance < totalAmount) {
      return {
        success: false,
        message: `資金不足。需要 ${totalAmount.toFixed(2)} 金幣（含手續費 ${transactionFee.toFixed(2)}）`
      };
    }

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // 扣除銀行帳戶餘額
        await prisma.bankAccount.update({
          where: { characterId },
          data: { balance: bankAccount.balance - totalAmount }
        });

        // 查找或創建投資組合
        let portfolio = await prisma.characterPortfolio.findUnique({
          where: {
            characterId_companyId: { characterId, companyId }
          }
        });

        if (portfolio) {
          // 更新現有持股
          const newTotalShares = portfolio.sharesOwned + shares;
          const newTotalInvested = portfolio.totalInvested + totalCost;
          const newAverageCost = newTotalInvested / newTotalShares;

          portfolio = await prisma.characterPortfolio.update({
            where: { id: portfolio.id },
            data: {
              sharesOwned: newTotalShares,
              averageCost: newAverageCost,
              totalInvested: newTotalInvested,
              currentValue: newTotalShares * company.currentPrice,
              unrealizedGainLoss: (newTotalShares * company.currentPrice) - newTotalInvested,
              lastTransactionAt: new Date()
            }
          });
        } else {
          // 創建新持股
          portfolio = await prisma.characterPortfolio.create({
            data: {
              characterId,
              companyId,
              sharesOwned: shares,
              averageCost: company.currentPrice,
              totalInvested: totalCost,
              currentValue: totalCost,
              unrealizedGainLoss: 0
            }
          });
        }

        // 記錄股票交易
        const transaction = await prisma.stockTransaction.create({
          data: {
            portfolioId: portfolio.id,
            transactionType: 'BUY',
            shares,
            pricePerShare: company.currentPrice,
            totalAmount: totalCost,
            fees: transactionFee,
            netAmount: totalAmount
          }
        });

        // 記錄銀行交易
        await prisma.bankTransaction.create({
          data: {
            bankAccountId: bankAccount.id,
            transactionType: 'INVESTMENT',
            amount: -totalAmount,
            balanceAfter: bankAccount.balance - totalAmount,
            description: `購買股票: ${company.tickerSymbol} ${shares}股`,
            referenceId: transaction.id,
            status: 'COMPLETED'
          }
        });

        // 更新股票成交量
        await this.updateTradingVolume(companyId, shares);

        return { transaction, portfolio };
      });

      this.logger.log(`[StockMarketService] 角色 ${characterId} 購買 ${company.tickerSymbol} ${shares}股，總計 ${totalAmount.toFixed(2)} 金幣`);

      return {
        success: true,
        message: `成功購買 ${company.tickerSymbol} ${shares}股`,
        transactionId: result.transaction.id,
        shares,
        totalCost: totalAmount,
        newPortfolioValue: result.portfolio.currentValue
      };

    } catch (error) {
      this.logger.error('[StockMarketService] 購買股票失敗:', error);
      return { success: false, message: '購買失敗，請稍後再試' };
    }
  }

  /**
   * 賣出股票
   */
  async sellStock(
    characterId: string,
    companyId: string,
    shares: number
  ): Promise<StockTransaction> {
    if (shares <= 0) {
      return { success: false, message: '賣出股數必須大於0' };
    }

    const company = await this.getCompanyDetails(companyId);
    if (!company || !company.isActive) {
      return { success: false, message: '公司不存在或已停止交易' };
    }

    // 檢查持股
    const portfolio = await this.prisma.characterPortfolio.findUnique({
      where: {
        characterId_companyId: { characterId, companyId }
      }
    });

    if (!portfolio || portfolio.sharesOwned < shares) {
      return {
        success: false,
        message: `持股不足。您目前持有 ${portfolio?.sharesOwned || 0} 股`
      };
    }

    const totalRevenue = company.currentPrice * shares;
    const transactionFee = Math.max(totalRevenue * this.TRANSACTION_FEE_RATE, this.MIN_TRANSACTION_FEE);
    const netAmount = totalRevenue - transactionFee;

    const bankAccount = await this.bankingService.getBankAccount(characterId);
    if (!bankAccount) {
      return { success: false, message: '銀行帳戶不存在' };
    }

    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // 增加銀行帳戶餘額
        await prisma.bankAccount.update({
          where: { characterId },
          data: { balance: bankAccount.balance + netAmount }
        });

        // 更新持股
        const newSharesOwned = portfolio.sharesOwned - shares;
        const soldCostBasis = (shares / portfolio.sharesOwned) * portfolio.totalInvested;
        const newTotalInvested = portfolio.totalInvested - soldCostBasis;

        let updatedPortfolio;
        if (newSharesOwned === 0) {
          // 完全賣出，保留記錄但清零持股
          updatedPortfolio = await prisma.characterPortfolio.update({
            where: { id: portfolio.id },
            data: {
              sharesOwned: 0,
              totalInvested: 0,
              currentValue: 0,
              unrealizedGainLoss: 0,
              lastTransactionAt: new Date()
            }
          });
        } else {
          // 部分賣出
          updatedPortfolio = await prisma.characterPortfolio.update({
            where: { id: portfolio.id },
            data: {
              sharesOwned: newSharesOwned,
              totalInvested: newTotalInvested,
              currentValue: newSharesOwned * company.currentPrice,
              unrealizedGainLoss: (newSharesOwned * company.currentPrice) - newTotalInvested,
              lastTransactionAt: new Date()
            }
          });
        }

        // 記錄股票交易
        const transaction = await prisma.stockTransaction.create({
          data: {
            portfolioId: portfolio.id,
            transactionType: 'SELL',
            shares,
            pricePerShare: company.currentPrice,
            totalAmount: totalRevenue,
            fees: transactionFee,
            netAmount
          }
        });

        // 記錄銀行交易
        await prisma.bankTransaction.create({
          data: {
            bankAccountId: bankAccount.id,
            transactionType: 'INVESTMENT',
            amount: netAmount,
            balanceAfter: bankAccount.balance + netAmount,
            description: `賣出股票: ${company.tickerSymbol} ${shares}股`,
            referenceId: transaction.id,
            status: 'COMPLETED'
          }
        });

        // 更新股票成交量
        await this.updateTradingVolume(companyId, shares);

        return { transaction, portfolio: updatedPortfolio };
      });

      const realizedGainLoss = netAmount - (shares / portfolio.sharesOwned) * portfolio.totalInvested;

      this.logger.log(`[StockMarketService] 角色 ${characterId} 賣出 ${company.tickerSymbol} ${shares}股，獲得 ${netAmount.toFixed(2)} 金幣`);

      return {
        success: true,
        message: `成功賣出 ${company.tickerSymbol} ${shares}股，${realizedGainLoss >= 0 ? '獲利' : '虧損'} ${Math.abs(realizedGainLoss).toFixed(2)} 金幣`,
        transactionId: result.transaction.id,
        shares,
        totalCost: netAmount,
        newPortfolioValue: result.portfolio.currentValue
      };

    } catch (error) {
      this.logger.error('[StockMarketService] 賣出股票失敗:', error);
      return { success: false, message: '賣出失敗，請稍後再試' };
    }
  }

  /**
   * 獲取角色投資組合
   */
  async getPortfolio(characterId: string): Promise<PortfolioSummary> {
    const portfolios = await this.prisma.characterPortfolio.findMany({
      where: {
        characterId,
        sharesOwned: { gt: 0 }
      },
      include: {
        company: true
      }
    });

    const positions: PortfolioPosition[] = [];
    let totalValue = 0;
    let totalInvested = 0;

    for (const portfolio of portfolios) {
      const currentValue = portfolio.sharesOwned * portfolio.company.currentPrice;
      const unrealizedGainLoss = currentValue - portfolio.totalInvested;
      const unrealizedGainLossPercent = portfolio.totalInvested > 0 
        ? (unrealizedGainLoss / portfolio.totalInvested) * 100 
        : 0;

      positions.push({
        companyId: portfolio.companyId,
        companyName: portfolio.company.name,
        tickerSymbol: portfolio.company.tickerSymbol,
        sharesOwned: portfolio.sharesOwned,
        averageCost: portfolio.averageCost,
        currentPrice: portfolio.company.currentPrice,
        currentValue,
        totalInvested: portfolio.totalInvested,
        unrealizedGainLoss,
        unrealizedGainLossPercent
      });

      totalValue += currentValue;
      totalInvested += portfolio.totalInvested;
    }

    const totalGainLoss = totalValue - totalInvested;
    const totalGainLossPercent = totalInvested > 0 ? (totalGainLoss / totalInvested) * 100 : 0;

    return {
      totalValue,
      totalInvested,
      totalGainLoss,
      totalGainLossPercent,
      positions
    };
  }

  /**
   * 獲取市場概覽
   */
  async getMarketOverview(): Promise<MarketOverview> {
    const companies = await this.getAllCompanies();
    
    const totalMarketCap = companies.reduce((sum, company) => sum + company.marketCap, 0);
    const avgPriceChange = companies.reduce((sum, company) => sum + company.priceChangePercent, 0) / companies.length;

    // 排序獲取漲跌幅和交易量排行
    const sortedByChange = [...companies].sort((a, b) => b.priceChangePercent - a.priceChangePercent);
    const sortedByVolume = [...companies].sort((a, b) => b.volume - a.volume);

    return {
      totalMarketCap,
      avgPriceChange,
      topGainers: sortedByChange.slice(0, 5),
      topLosers: sortedByChange.slice(-5).reverse(),
      mostActive: sortedByVolume.slice(0, 5)
    };
  }

  /**
   * 更新股價（模擬市場波動）
   */
  async updateStockPrices(): Promise<void> {
    const companies = await this.prisma.company.findMany({
      where: { isActive: true },
      include: {
        stockPrices: {
          orderBy: { timestamp: 'desc' },
          take: 1
        }
      }
    });

    for (const company of companies) {
      const lastPrice = company.stockPrices[0]?.price || company.currentPrice;
      
      // 基於公司類型和市場條件生成價格波動
      const volatility = this.calculateVolatility(company.sector as CompanySector);
      const priceChange = this.generatePriceChange(lastPrice, volatility);
      const newPrice = Math.max(0.01, lastPrice + priceChange); // 價格不能為負
      
      const priceChangePercent = lastPrice > 0 ? (priceChange / lastPrice) * 100 : 0;
      
      // 模擬交易量
      const baseVolume = Math.floor(Math.random() * 5000) + 1000;
      const volatilityVolume = Math.abs(priceChangePercent) > 2 ? baseVolume * 2 : baseVolume;
      
      // 更新公司當前價格
      await this.prisma.company.update({
        where: { id: company.id },
        data: {
          currentPrice: newPrice,
          marketCap: newPrice * 50000 // 假設發行股數為50,000股
        }
      });

      // 記錄價格歷史
      await this.prisma.stockPrice.create({
        data: {
          companyId: company.id,
          price: newPrice,
          volume: volatilityVolume,
          high: Math.max(newPrice, lastPrice),
          low: Math.min(newPrice, lastPrice),
          openPrice: lastPrice,
          closePrice: newPrice,
          priceChange,
          priceChangePercent
        }
      });

      // 更新所有持有該股票的投資組合當前價值
      await this.prisma.characterPortfolio.updateMany({
        where: { companyId: company.id },
        data: {
          currentValue: newPrice,
          unrealizedGainLoss: newPrice // 這裡需要計算實際的未實現損益
        }
      });
    }

    this.logger.log(`[StockMarketService] 已更新 ${companies.length} 家公司的股價`);
  }

  /**
   * 支付股息（每月執行）
   */
  async payDividends(): Promise<void> {
    const companies = await this.prisma.company.findMany({
      where: {
        isActive: true,
        dividendYield: { gt: 0 }
      },
      include: {
        portfolios: {
          where: { sharesOwned: { gt: 0 } },
          include: { character: true }
        }
      }
    });

    for (const company of companies) {
      const monthlyDividendPerShare = (company.currentPrice * company.dividendYield / 100) / 12;
      
      for (const portfolio of company.portfolios) {
        const dividendAmount = portfolio.sharesOwned * monthlyDividendPerShare;
        
        if (dividendAmount >= 0.01) { // 最低股息門檻
          // 支付股息到銀行帳戶
          const bankAccount = await this.bankingService.getBankAccount(portfolio.characterId);
          if (bankAccount) {
            await this.prisma.bankAccount.update({
              where: { id: bankAccount.id },
              data: { balance: bankAccount.balance + dividendAmount }
            });

            // 記錄股息交易
            await this.prisma.bankTransaction.create({
              data: {
                bankAccountId: bankAccount.id,
                transactionType: 'INVESTMENT',
                amount: dividendAmount,
                balanceAfter: bankAccount.balance + dividendAmount,
                description: `股息收入: ${company.tickerSymbol}`,
                status: 'COMPLETED'
              }
            });
          }
        }
      }

      // 記錄股息支付
      await this.prisma.dividendPayment.create({
        data: {
          companyId: company.id,
          dividendPerShare: monthlyDividendPerShare,
          exDividendDate: new Date(),
          paymentDate: new Date(),
          totalPayout: company.portfolios.reduce((sum, p) => sum + (p.sharesOwned * monthlyDividendPerShare), 0)
        }
      });
    }

    this.logger.log(`[StockMarketService] 已支付 ${companies.length} 家公司的股息`);
  }

  /**
   * 計算行業波動率
   */
  private calculateVolatility(sector: CompanySector): number {
    const volatilityMap = {
      [CompanySector.TECHNOLOGY]: 0.03,     // 3% 科技股波動較大
      [CompanySector.RESOURCES]: 0.025,     // 2.5% 資源股中等波動
      [CompanySector.TRANSPORT]: 0.02,      // 2% 運輸股中等波動
      [CompanySector.MANUFACTURING]: 0.015, // 1.5% 製造業較穩定
      [CompanySector.SERVICES]: 0.015,      // 1.5% 服務業較穩定
      [CompanySector.FINANCE]: 0.01         // 1% 金融股最穩定
    };

    return volatilityMap[sector] || 0.02;
  }

  /**
   * 生成價格變動
   */
  private generatePriceChange(currentPrice: number, volatility: number): number {
    // 使用正態分佈生成價格變動
    const randomFactor = (Math.random() - 0.5) * 2; // -1 到 1
    const marketTrend = Math.sin(Date.now() / (1000 * 60 * 60 * 24)) * 0.001; // 每日趨勢
    
    return currentPrice * (randomFactor * volatility + marketTrend);
  }

  /**
   * 更新交易量
   */
  private async updateTradingVolume(companyId: string, shares: number): Promise<void> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayPrice = await this.prisma.stockPrice.findFirst({
      where: {
        companyId,
        timestamp: { gte: today }
      },
      orderBy: { timestamp: 'desc' }
    });

    if (todayPrice) {
      await this.prisma.stockPrice.update({
        where: { id: todayPrice.id },
        data: { volume: todayPrice.volume + shares }
      });
    }
  }
}