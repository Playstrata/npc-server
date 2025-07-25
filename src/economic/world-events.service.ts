import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface WorldEventInfo {
  id: string;
  eventType: WorldEventType;
  title: string;
  description: string;
  severity: number;
  durationHours: number;
  globalImpact: boolean;
  occurredAt: Date;
  expiresAt: Date;
  stockImpacts: EventStockImpact[];
}

export interface EventStockImpact {
  companyId: string;
  companyName: string;
  tickerSymbol: string;
  impactPercentage: number;
  durationHours: number;
  impactType: ImpactType;
  appliedAt: Date;
  expiresAt: Date;
}

export interface EventTemplate {
  eventType: WorldEventType;
  title: string;
  description: string;
  severity: number;
  durationHours: number;
  globalImpact: boolean;
  sectorImpacts: SectorImpact[];
}

export interface SectorImpact {
  sector: string;
  impactPercentage: number;
  durationHours?: number;
  impactType: ImpactType;
}

export enum WorldEventType {
  DISASTER = 'DISASTER',           // 自然災害
  POLITICAL = 'POLITICAL',         // 政治事件
  INVASION = 'INVASION',           // 入侵戰爭
  DISCOVERY = 'DISCOVERY',         // 重大發現
  TRADE = 'TRADE',                 // 貿易協定
  ECONOMIC = 'ECONOMIC',           // 經濟政策
  TECHNOLOGICAL = 'TECHNOLOGICAL',  // 科技突破
  MAGICAL = 'MAGICAL'              // 魔法事件
}

export enum ImpactType {
  IMMEDIATE = 'IMMEDIATE',         // 立即影響
  GRADUAL = 'GRADUAL',            // 漸進影響
  DELAYED = 'DELAYED'             // 延遲影響
}

@Injectable()
export class WorldEventsService {
  private readonly logger = new Logger(WorldEventsService.name);

  // 預定義事件模板
  private readonly eventTemplates: EventTemplate[] = [
    // 災害事件
    {
      eventType: WorldEventType.DISASTER,
      title: '地底礦災',
      description: '主要礦區發生大規模坍塌，導致寶石和礦物供應中斷',
      severity: 4,
      durationHours: 72,
      globalImpact: false,
      sectorImpacts: [
        { sector: 'RESOURCES', impactPercentage: -15, impactType: ImpactType.IMMEDIATE },
        { sector: 'MANUFACTURING', impactPercentage: -8, impactType: ImpactType.GRADUAL }
      ]
    },
    {
      eventType: WorldEventType.DISASTER,
      title: '魔法風暴',
      description: '史無前例的魔法風暴席捲運輸路線，所有魔法傳送門暫時失效',
      severity: 5,
      durationHours: 48,
      globalImpact: true,
      sectorImpacts: [
        { sector: 'TRANSPORT', impactPercentage: -25, impactType: ImpactType.IMMEDIATE },
        { sector: 'TECHNOLOGY', impactPercentage: -12, impactType: ImpactType.IMMEDIATE },
        { sector: 'SERVICES', impactPercentage: -10, impactType: ImpactType.GRADUAL }
      ]
    },

    // 政治事件
    {
      eventType: WorldEventType.POLITICAL,
      title: '王國稅制改革',
      description: '政府宣布新的企業稅制改革，降低科技產業稅率',
      severity: 3,
      durationHours: 168, // 一週
      globalImpact: true,
      sectorImpacts: [
        { sector: 'TECHNOLOGY', impactPercentage: 12, impactType: ImpactType.GRADUAL },
        { sector: 'FINANCE', impactPercentage: 8, impactType: ImpactType.IMMEDIATE },
        { sector: 'MANUFACTURING', impactPercentage: -3, impactType: ImpactType.GRADUAL }
      ]
    },
    {
      eventType: WorldEventType.POLITICAL,
      title: '貿易制裁解除',
      description: '與鄰國的貿易制裁正式解除，邊境貿易全面恢復',
      severity: 2,
      durationHours: 72,
      globalImpact: false,
      sectorImpacts: [
        { sector: 'TRANSPORT', impactPercentage: 18, impactType: ImpactType.IMMEDIATE },
        { sector: 'SERVICES', impactPercentage: 10, impactType: ImpactType.GRADUAL }
      ]
    },

    // 入侵戰爭
    {
      eventType: WorldEventType.INVASION,
      title: '魔物大軍入侵',
      description: '邊境出現大規模魔物軍團，王國進入戰時狀態',
      severity: 5,
      durationHours: 120, // 5天
      globalImpact: true,
      sectorImpacts: [
        { sector: 'MANUFACTURING', impactPercentage: 20, impactType: ImpactType.IMMEDIATE }, // 武器需求
        { sector: 'TRANSPORT', impactPercentage: -20, impactType: ImpactType.IMMEDIATE },
        { sector: 'FINANCE', impactPercentage: -15, impactType: ImpactType.IMMEDIATE },
        { sector: 'SERVICES', impactPercentage: -12, impactType: ImpactType.GRADUAL }
      ]
    },

    // 重大發現
    {
      eventType: WorldEventType.DISCOVERY,
      title: '新礦脈發現',
      description: '勘探隊在遠古遺跡中發現巨大的稀有礦物礦脈',
      severity: 3,
      durationHours: 96,
      globalImpact: false,
      sectorImpacts: [
        { sector: 'RESOURCES', impactPercentage: 25, impactType: ImpactType.GRADUAL },
        { sector: 'TECHNOLOGY', impactPercentage: 8, impactType: ImpactType.DELAYED, durationHours: 168 }
      ]
    },
    {
      eventType: WorldEventType.DISCOVERY,
      title: '失落文明遺跡',
      description: '考古學家發現失落文明的魔法科技遺跡，可能改變現有技術',
      severity: 4,
      durationHours: 240, // 10天
      globalImpact: true,
      sectorImpacts: [
        { sector: 'TECHNOLOGY', impactPercentage: 30, impactType: ImpactType.DELAYED, durationHours: 72 },
        { sector: 'SERVICES', impactPercentage: 15, impactType: ImpactType.GRADUAL }
      ]
    },

    // 貿易協定
    {
      eventType: WorldEventType.TRADE,
      title: '多國貿易聯盟',
      description: '王國與三個盟國簽署自由貿易協定，取消關稅壁壘',
      severity: 3,
      durationHours: 336, // 兩週
      globalImpact: true,
      sectorImpacts: [
        { sector: 'TRANSPORT', impactPercentage: 22, impactType: ImpactType.GRADUAL },
        { sector: 'SERVICES', impactPercentage: 15, impactType: ImpactType.GRADUAL },
        { sector: 'MANUFACTURING', impactPercentage: 12, impactType: ImpactType.DELAYED, durationHours: 168 }
      ]
    },

    // 經濟政策
    {
      eventType: WorldEventType.ECONOMIC,
      title: '央行降息政策',
      description: '王國中央銀行宣布降息1%，刺激經濟成長',
      severity: 3,
      durationHours: 720, // 30天
      globalImpact: true,
      sectorImpacts: [
        { sector: 'FINANCE', impactPercentage: 15, impactType: ImpactType.IMMEDIATE },
        { sector: 'MANUFACTURING', impactPercentage: 10, impactType: ImpactType.GRADUAL },
        { sector: 'TECHNOLOGY', impactPercentage: 12, impactType: ImpactType.GRADUAL },
        { sector: 'SERVICES', impactPercentage: 8, impactType: ImpactType.GRADUAL }
      ]
    },
    {
      eventType: WorldEventType.ECONOMIC,
      title: '通膨警報',
      description: '物價指數創新高，央行考慮緊縮貨幣政策',
      severity: 4,
      durationHours: 168,
      globalImpact: true,
      sectorImpacts: [
        { sector: 'FINANCE', impactPercentage: -12, impactType: ImpactType.IMMEDIATE },
        { sector: 'SERVICES', impactPercentage: -8, impactType: ImpactType.GRADUAL },
        { sector: 'MANUFACTURING', impactPercentage: -6, impactType: ImpactType.GRADUAL }
      ]
    },

    // 科技突破
    {
      eventType: WorldEventType.TECHNOLOGICAL,
      title: '傳送門技術革新',
      description: '魔導科技公司開發出新一代傳送門技術，運輸效率大幅提升',
      severity: 4,
      durationHours: 240,
      globalImpact: true,
      sectorImpacts: [
        { sector: 'TECHNOLOGY', impactPercentage: 35, impactType: ImpactType.IMMEDIATE },
        { sector: 'TRANSPORT', impactPercentage: 28, impactType: ImpactType.GRADUAL },
        { sector: 'SERVICES', impactPercentage: 12, impactType: ImpactType.DELAYED, durationHours: 120 }
      ]
    },
    {
      eventType: WorldEventType.TECHNOLOGICAL,
      title: '自動化魔法工廠',
      description: '首座全自動化魔法驅動工廠正式投產，製造業面臨革命',
      severity: 3,
      durationHours: 168,
      globalImpact: false,
      sectorImpacts: [
        { sector: 'MANUFACTURING', impactPercentage: 25, impactType: ImpactType.GRADUAL },
        { sector: 'TECHNOLOGY', impactPercentage: 18, impactType: ImpactType.IMMEDIATE }
      ]
    },

    // 魔法事件
    {
      eventType: WorldEventType.MAGICAL,
      title: '魔力潮汐異常',
      description: '全球魔力潮汐出現異常波動，影響所有魔法相關產業',
      severity: 4,
      durationHours: 96,
      globalImpact: true,
      sectorImpacts: [
        { sector: 'TECHNOLOGY', impactPercentage: -18, impactType: ImpactType.IMMEDIATE },
        { sector: 'TRANSPORT', impactPercentage: -15, impactType: ImpactType.IMMEDIATE },
        { sector: 'SERVICES', impactPercentage: -10, impactType: ImpactType.GRADUAL }
      ]
    },
    {
      eventType: WorldEventType.MAGICAL,
      title: '魔法學院重大突破',
      description: '魔法學院發現新的魔法理論，可能徹底改變魔法應用',
      severity: 5,
      durationHours: 480, // 20天
      globalImpact: true,
      sectorImpacts: [
        { sector: 'SERVICES', impactPercentage: 40, impactType: ImpactType.GRADUAL },
        { sector: 'TECHNOLOGY', impactPercentage: 25, impactType: ImpactType.DELAYED, durationHours: 240 },
        { sector: 'TRANSPORT', impactPercentage: 15, impactType: ImpactType.DELAYED, durationHours: 360 }
      ]
    }
  ];

  constructor(private prisma: PrismaService) {}

  /**
   * 觸發隨機世界事件
   */
  async triggerRandomEvent(): Promise<WorldEventInfo | null> {
    // 檢查是否有正在進行的全球事件
    const activeGlobalEvents = await this.prisma.worldEvent.count({
      where: {
        globalImpact: true,
        expiresAt: { gt: new Date() }
      }
    });

    // 如果已有全球事件，降低觸發機率
    const triggerChance = activeGlobalEvents > 0 ? 0.1 : 0.3;
    if (Math.random() > triggerChance) {
      return null;
    }

    // 隨機選擇事件模板
    const template = this.eventTemplates[Math.floor(Math.random() * this.eventTemplates.length)];
    
    return await this.createEventFromTemplate(template);
  }

  /**
   * 從模板創建事件
   */
  async createEventFromTemplate(template: EventTemplate): Promise<WorldEventInfo> {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + template.durationHours * 60 * 60 * 1000);

    // 創建世界事件
    const worldEvent = await this.prisma.worldEvent.create({
      data: {
        eventType: template.eventType,
        title: template.title,
        description: template.description,
        severity: template.severity,
        durationHours: template.durationHours,
        globalImpact: template.globalImpact,
        occurredAt: now,
        expiresAt
      }
    });

    // 獲取所有公司並應用影響
    const companies = await this.prisma.company.findMany({
      where: { isActive: true }
    });

    const stockImpacts: EventStockImpact[] = [];

    for (const sectorImpact of template.sectorImpacts) {
      const affectedCompanies = companies.filter(c => c.sector === sectorImpact.sector);
      
      for (const company of affectedCompanies) {
        // 為每家公司添加一些隨機變動
        const baseImpact = sectorImpact.impactPercentage;
        const randomVariation = (Math.random() - 0.5) * 0.4; // ±20% 變動
        const finalImpact = baseImpact * (1 + randomVariation);

        const impactDuration = sectorImpact.durationHours || template.durationHours;
        const impactExpiresAt = new Date(now.getTime() + impactDuration * 60 * 60 * 1000);

        // 創建股票影響記錄
        const stockImpact = await this.prisma.eventStockImpact.create({
          data: {
            eventId: worldEvent.id,
            companyId: company.id,
            impactPercentage: finalImpact,
            durationHours: impactDuration,
            impactType: sectorImpact.impactType,
            appliedAt: sectorImpact.impactType === ImpactType.DELAYED 
              ? new Date(now.getTime() + 24 * 60 * 60 * 1000) // 延遲24小時
              : now,
            expiresAt: impactExpiresAt
          }
        });

        stockImpacts.push({
          companyId: company.id,
          companyName: company.name,
          tickerSymbol: company.tickerSymbol,
          impactPercentage: finalImpact,
          durationHours: impactDuration,
          impactType: sectorImpact.impactType,
          appliedAt: stockImpact.appliedAt,
          expiresAt: impactExpiresAt
        });

        // 如果是立即影響，立即應用到股價
        if (sectorImpact.impactType === ImpactType.IMMEDIATE) {
          await this.applyImmediateImpact(company.id, finalImpact);
        }
      }
    }

    this.logger.log(`[WorldEventsService] 觸發事件: ${template.title}，影響 ${stockImpacts.length} 家公司`);

    return {
      id: worldEvent.id,
      eventType: template.eventType,
      title: template.title,
      description: template.description,
      severity: template.severity,
      durationHours: template.durationHours,
      globalImpact: template.globalImpact,
      occurredAt: now,
      expiresAt,
      stockImpacts
    };
  }

  /**
   * 觸發特定類型的事件
   */
  async triggerSpecificEvent(eventType: WorldEventType): Promise<WorldEventInfo | null> {
    const templates = this.eventTemplates.filter(t => t.eventType === eventType);
    if (templates.length === 0) return null;

    const template = templates[Math.floor(Math.random() * templates.length)];
    return await this.createEventFromTemplate(template);
  }

  /**
   * 處理漸進式和延遲影響
   */
  async processOngoingImpacts(): Promise<void> {
    const now = new Date();

    // 處理需要開始的延遲影響
    const delayedImpacts = await this.prisma.eventStockImpact.findMany({
      where: {
        impactType: ImpactType.DELAYED,
        appliedAt: { lte: now },
        expiresAt: { gt: now }
      },
      include: { company: true }
    });

    for (const impact of delayedImpacts) {
      await this.applyImmediateImpact(impact.companyId, impact.impactPercentage);
      this.logger.log(`[WorldEventsService] 應用延遲影響: ${impact.company.tickerSymbol} ${impact.impactPercentage}%`);
    }

    // 處理漸進式影響
    const gradualImpacts = await this.prisma.eventStockImpact.findMany({
      where: {
        impactType: ImpactType.GRADUAL,
        appliedAt: { lte: now },
        expiresAt: { gt: now }
      },
      include: { company: true }
    });

    for (const impact of gradualImpacts) {
      // 計算每小時應用的影響比例
      const totalHours = impact.durationHours;
      const elapsedHours = Math.floor((now.getTime() - impact.appliedAt.getTime()) / (1000 * 60 * 60));
      const hourlyImpact = impact.impactPercentage / totalHours;
      
      // 只在每小時整點應用影響
      if (elapsedHours < totalHours && now.getMinutes() === 0) {
        await this.applyImmediateImpact(impact.companyId, hourlyImpact);
      }
    }

    // 清理過期的影響
    await this.prisma.eventStockImpact.deleteMany({
      where: { expiresAt: { lt: now } }
    });

    // 清理過期的事件
    await this.prisma.worldEvent.deleteMany({
      where: { expiresAt: { lt: now } }
    });
  }

  /**
   * 獲取當前活躍事件
   */
  async getActiveEvents(): Promise<WorldEventInfo[]> {
    const events = await this.prisma.worldEvent.findMany({
      where: { expiresAt: { gt: new Date() } },
      include: {
        stockImpacts: {
          include: { company: true }
        }
      },
      orderBy: { occurredAt: 'desc' }
    });

    return events.map(event => ({
      id: event.id,
      eventType: event.eventType as WorldEventType,
      title: event.title,
      description: event.description,
      severity: event.severity,
      durationHours: event.durationHours,
      globalImpact: event.globalImpact,
      occurredAt: event.occurredAt,
      expiresAt: event.expiresAt,
      stockImpacts: event.stockImpacts.map(impact => ({
        companyId: impact.companyId,
        companyName: impact.company.name,
        tickerSymbol: impact.company.tickerSymbol,
        impactPercentage: impact.impactPercentage,
        durationHours: impact.durationHours,
        impactType: impact.impactType as ImpactType,
        appliedAt: impact.appliedAt,
        expiresAt: impact.expiresAt
      }))
    }));
  }

  /**
   * 獲取事件歷史
   */
  async getEventHistory(limit = 20): Promise<WorldEventInfo[]> {
    const events = await this.prisma.worldEvent.findMany({
      include: {
        stockImpacts: {
          include: { company: true }
        }
      },
      orderBy: { occurredAt: 'desc' },
      take: limit
    });

    return events.map(event => ({
      id: event.id,
      eventType: event.eventType as WorldEventType,
      title: event.title,
      description: event.description,
      severity: event.severity,
      durationHours: event.durationHours,
      globalImpact: event.globalImpact,
      occurredAt: event.occurredAt,
      expiresAt: event.expiresAt,
      stockImpacts: event.stockImpacts.map(impact => ({
        companyId: impact.companyId,
        companyName: impact.company.name,
        tickerSymbol: impact.company.tickerSymbol,
        impactPercentage: impact.impactPercentage,
        durationHours: impact.durationHours,
        impactType: impact.impactType as ImpactType,
        appliedAt: impact.appliedAt,
        expiresAt: impact.expiresAt
      }))
    }));
  }

  /**
   * 應用立即影響到股價
   */
  private async applyImmediateImpact(companyId: string, impactPercentage: number): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId }
    });

    if (!company) return;

    const newPrice = company.currentPrice * (1 + impactPercentage / 100);
    const priceChange = newPrice - company.currentPrice;
    const priceChangePercent = (priceChange / company.currentPrice) * 100;

    // 更新公司股價
    await this.prisma.company.update({
      where: { id: companyId },
      data: {
        currentPrice: Math.max(0.01, newPrice), // 價格不能為負
        marketCap: newPrice * 50000 // 假設發行股數
      }
    });

    // 記錄價格變動
    await this.prisma.stockPrice.create({
      data: {
        companyId,
        price: newPrice,
        volume: Math.floor(Math.abs(impactPercentage) * 100), // 影響越大，交易量越大
        high: Math.max(newPrice, company.currentPrice),
        low: Math.min(newPrice, company.currentPrice),
        openPrice: company.currentPrice,
        closePrice: newPrice,
        priceChange,
        priceChangePercent
      }
    });

    // 更新投資組合的未實現損益
    await this.prisma.characterPortfolio.updateMany({
      where: { companyId },
      data: {
        currentValue: newPrice,
        unrealizedGainLoss: newPrice // 需要重新計算
      }
    });
  }

  /**
   * 獲取可用的事件模板（用於管理和測試）
   */
  getEventTemplates(): EventTemplate[] {
    return this.eventTemplates;
  }
}