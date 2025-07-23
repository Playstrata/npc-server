import { Injectable, Logger } from '@nestjs/common';
import { 
  ContentAnalysis, 
  AIResponseContext, 
  AIGeneratedResponse,
  SocialClass,
  EducationLevel,
  CulturalBackground,
  ToleranceCalculation,
  FriendshipImpactCalculation,
  SOCIAL_CLASS_TOLERANCE_CONFIG,
  NegotiationStrategy
} from './ai.types';

@Injectable()
export class AIService {
  private readonly logger = new Logger(AIService.name);

  /**
   * 分析玩家輸入內容
   */
  async analyzePlayerMessage(playerMessage: string): Promise<ContentAnalysis> {
    try {
      // 這裡將整合實際的AI API調用
      // 暫時使用規則基礎的分析作為fallback
      return this.analyzeContentWithRules(playerMessage);
    } catch (error) {
      this.logger.error('AI內容分析失敗，使用規則基礎分析', error);
      return this.analyzeContentWithRules(playerMessage);
    }
  }

  /**
   * 生成AI回應
   */
  async generateNPCResponse(context: AIResponseContext): Promise<AIGeneratedResponse> {
    try {
      const prompt = this.buildAIPrompt(context);
      
      // 這裡將整合實際的AI API調用
      // 暫時使用規則基礎生成作為fallback
      return this.generateResponseWithRules(context);
    } catch (error) {
      this.logger.error('AI回應生成失敗，使用規則基礎生成', error);
      return this.generateResponseWithRules(context);
    }
  }

  /**
   * 計算容忍度
   */
  calculateTolerance(
    npcProfile: any,
    friendshipScore: number,
    contentAnalysis: ContentAnalysis
  ): ToleranceCalculation {
    // 1. 基礎容忍度（根據NPC社會階層）
    const socialClassTolerance = SOCIAL_CLASS_TOLERANCE_CONFIG[npcProfile.socialClass] || 
                                SOCIAL_CLASS_TOLERANCE_CONFIG[SocialClass.COMMONER];
    
    const baseTolerance = this.calculateBaseTolerance(
      socialClassTolerance,
      contentAnalysis.contentType,
      npcProfile.personality
    );

    // 2. 友好度加成（非線性增長）
    const friendshipBonus = Math.log(Math.max(friendshipScore + 1, 1)) * 1.5;

    // 3. 最終容忍度
    const finalTolerance = Math.min(baseTolerance + friendshipBonus, 10);

    // 4. 計算懲罰
    const contentSeverity = this.calculateContentSeverity(contentAnalysis);
    const baseDeduction = contentSeverity * 2;

    // 容忍度減免（容忍度越高，懲罰越輕，但不會完全免除）
    const toleranceReduction = baseDeduction * (finalTolerance / 10) * 0.7;
    const finalDeduction = Math.max(baseDeduction - toleranceReduction, baseDeduction * 0.1);

    return {
      baseTolerance,
      friendshipBonus,
      finalTolerance,
      penaltyCalculation: {
        contentSeverity,
        baseDeduction,
        toleranceReduction,
        finalDeduction
      }
    };
  }

  /**
   * 計算友好度影響
   */
  calculateFriendshipImpact(
    contentAnalysis: ContentAnalysis,
    currentFriendship: number,
    npcProfile: any,
    toleranceCalculation: ToleranceCalculation
  ): FriendshipImpactCalculation {
    // 1. 基礎內容影響
    let contentImpact = 0;
    
    switch (contentAnalysis.contentType) {
      case 'inappropriate':
        contentImpact = -toleranceCalculation.penaltyCalculation.finalDeduction;
        break;
      case 'eloquent':
        contentImpact = this.getEloquenceBonus(npcProfile.socialClass);
        break;
      case 'crude':
        contentImpact = this.getCrudeImpact(npcProfile.socialClass);
        break;
      case 'nonsensical':
        contentImpact = -Math.min(2, toleranceCalculation.penaltyCalculation.finalDeduction);
        break;
      default:
        contentImpact = 0;
    }

    // 2. 關係狀態修正
    const relationshipModifier = currentFriendship > 50 ? 1.2 : 1.0;
    if (contentImpact > 0) {
      contentImpact *= relationshipModifier;
    }

    // 3. 期望落差懲罰（好朋友做不當行為的額外失望）
    let expectationPenalty = 0;
    if (contentImpact < 0 && currentFriendship > 70) {
      expectationPenalty = Math.abs(contentImpact) * 0.2;
    }

    // 4. 容忍度信用
    const toleranceCredit = toleranceCalculation.penaltyCalculation.toleranceReduction * 0.1;

    const finalImpact = contentImpact - expectationPenalty + toleranceCredit;

    return {
      contentImpact,
      relationshipModifier,
      expectationPenalty,
      toleranceCredit,
      finalImpact
    };
  }

  /**
   * 規則基礎的內容分析（作為AI的fallback）
   */
  private analyzeContentWithRules(message: string): ContentAnalysis {
    const lowerMessage = message.toLowerCase();
    
    // 檢測粗俗內容
    const profanityWords = ['幹', '靠', '媽的', '操', '屌', '婊'];
    const profanityCount = profanityWords.filter(word => lowerMessage.includes(word)).length;
    
    // 檢測威脅性內容
    const threateningWords = ['殺', '死', '揍', '打', '滾'];
    const aggressionCount = threateningWords.filter(word => lowerMessage.includes(word)).length;
    
    // 檢測文雅用詞
    const eloquentWords = ['請', '謝謝', '不好意思', '恭敬', '尊敬'];
    const eloquenceCount = eloquentWords.filter(word => lowerMessage.includes(word)).length;
    
    // 檢測談判元素
    const negotiationWords = ['便宜', '折扣', '降價', '優惠'];
    const hasNegotiation = negotiationWords.some(word => lowerMessage.includes(word));

    // 長度分析
    let lengthCategory: 'short' | 'normal' | 'long' | 'excessive';
    if (message.length < 10) lengthCategory = 'short';
    else if (message.length < 50) lengthCategory = 'normal';
    else if (message.length < 200) lengthCategory = 'long';
    else lengthCategory = 'excessive';

    // 決定內容類型
    let contentType: ContentAnalysis['contentType'] = 'normal';
    if (profanityCount > 0 || aggressionCount > 2) contentType = 'inappropriate';
    else if (eloquenceCount > 0) contentType = 'eloquent';
    else if (profanityCount > 0 || aggressionCount > 0) contentType = 'crude';

    return {
      contentType,
      languageStyle: {
        formality: Math.max(0, 5 - profanityCount + eloquenceCount),
        eloquence: eloquenceCount * 2,
        aggression: aggressionCount * 2,
        humor: lowerMessage.includes('哈') || lowerMessage.includes('笑') ? 3 : 0,
        profanity: Math.min(10, profanityCount * 2),
        intelligence: eloquenceCount > 0 ? 7 : 5
      },
      negotiationElements: {
        strategies: hasNegotiation ? [NegotiationStrategy.LOGICAL] : [],
        persuasionAttempt: hasNegotiation,
        priceRequest: lowerMessage.includes('價格') || lowerMessage.includes('多少錢'),
        discountRequest: lowerMessage.includes('便宜') || lowerMessage.includes('折扣')
      },
      contentFeatures: {
        isCoherent: message.length > 2,
        approximateLength: lengthCategory,
        topics: this.extractTopics(message),
        sentiment: profanityCount > 0 ? 'negative' : eloquenceCount > 0 ? 'positive' : 'neutral'
      }
    };
  }

  /**
   * 規則基礎的回應生成（作為AI的fallback）
   */
  private generateResponseWithRules(context: AIResponseContext): AIGeneratedResponse {
    const { npcProfile, contentAnalysis, relationshipContext } = context;
    
    let response = '';
    let emotionalTone = 'neutral';
    let responseStyle: AIGeneratedResponse['responseStyle'] = 'polite';
    let conversationDirection: AIGeneratedResponse['conversationDirection'] = 'continue';

    // 根據社會階層和內容生成回應
    if (contentAnalysis.contentType === 'inappropriate') {
      response = this.generateInappropriateResponse(npcProfile.socialClass, relationshipContext.friendshipLevel);
      emotionalTone = 'disapproving';
      responseStyle = npcProfile.socialClass === SocialClass.ROGUE ? 'amused' : 'annoyed';
    } else if (contentAnalysis.contentType === 'eloquent') {
      response = this.generateEloquentResponse(npcProfile.socialClass, relationshipContext.friendshipLevel);
      emotionalTone = 'pleased';
      responseStyle = 'friendly';
    } else {
      response = this.generateNormalResponse(npcProfile, relationshipContext);
      emotionalTone = 'neutral';
      responseStyle = 'polite';
    }

    return {
      response,
      emotionalTone,
      responseStyle,
      conversationDirection
    };
  }

  /**
   * 建構AI提示詞
   */
  private buildAIPrompt(context: AIResponseContext): string {
    const { npcProfile, relationshipContext, situationalContext, playerMessage, contentAnalysis } = context;

    return `你是 ${npcProfile.name}，一個${this.getSocialClassName(npcProfile.socialClass)}階層的${this.getEducationName(npcProfile.education)}程度角色。

角色背景：
- 社會階層: ${this.getSocialClassName(npcProfile.socialClass)}
- 教育程度: ${this.getEducationName(npcProfile.education)}
- 文化背景: ${this.getCultureName(npcProfile.culturalBackground)}

性格特徵：
- 友善度: ${npcProfile.personality.traits.friendliness}/10
- 好奇心: ${npcProfile.personality.traits.curiosity}/10
- 樂於助人: ${npcProfile.personality.traits.helpfulness}/10
- 健談程度: ${npcProfile.personality.traits.chattiness}/10
- 當前心情: ${npcProfile.currentMood.currentMood}

與玩家的關係：
- 友好等級: ${relationshipContext.friendshipLevel}
- 友好分數: ${relationshipContext.friendshipScore}

當前情境：
- 時間: ${situationalContext.timeOfDay}
- 地點: ${situationalContext.location}
- 天氣: ${situationalContext.weather}
- 正在做: ${situationalContext.npcCurrentActivity}

玩家剛剛說："${playerMessage}"

內容分析：
- 內容類型: ${contentAnalysis.contentType}
- 正式程度: ${contentAnalysis.languageStyle.formality}/10
- 文雅程度: ${contentAnalysis.languageStyle.eloquence}/10
- 粗俗程度: ${contentAnalysis.languageStyle.profanity}/10
- 攻擊性: ${contentAnalysis.languageStyle.aggression}/10

請根據你的性格、社會背景、教育程度、與玩家的關係，生成一個完全原創的自然回應。回應要：
1. 完全符合你的社會階層說話方式
2. 反映你對這種內容的真實情感反應
3. 考慮你們的友好關係（好朋友更容忍但仍會有反應）
4. 體現你的當前心情和情境
5. 不使用任何模板，完全原創

只返回你的對話內容，不要任何額外說明。`;
  }

  // 輔助方法
  private calculateBaseTolerance(socialClassConfig: any, contentType: string, personality: any): number {
    let base = 5; // 預設值
    
    switch (contentType) {
      case 'inappropriate':
        base = socialClassConfig.inappropriateContent;
        break;
      case 'nonsensical':
        base = socialClassConfig.nonsensicalText;
        break;
      default:
        base = 5;
    }
    
    // 性格調整
    base += (personality.traits.patience - 5) * 0.5;
    base += (personality.traits.friendliness - 5) * 0.3;
    
    return Math.max(0, Math.min(10, base));
  }

  private calculateContentSeverity(contentAnalysis: ContentAnalysis): number {
    let severity = 0;
    
    severity += contentAnalysis.languageStyle.profanity * 0.8;
    severity += contentAnalysis.languageStyle.aggression * 0.9;
    
    if (contentAnalysis.contentType === 'inappropriate') severity += 3;
    if (contentAnalysis.contentType === 'nonsensical') severity += 1;
    
    return Math.min(10, severity);
  }

  private getEloquenceBonus(socialClass: SocialClass): number {
    const bonuses = {
      [SocialClass.NOBILITY]: 3,
      [SocialClass.SCHOLAR]: 4,
      [SocialClass.MERCHANT]: 2,
      [SocialClass.ARTISAN]: 2,
      [SocialClass.COMMONER]: 1,
      [SocialClass.ROGUE]: -1,
      [SocialClass.OUTLAW]: -2
    };
    return bonuses[socialClass] || 1;
  }

  private getCrudeImpact(socialClass: SocialClass): number {
    const impacts = {
      [SocialClass.NOBILITY]: -3,
      [SocialClass.SCHOLAR]: -2,
      [SocialClass.MERCHANT]: -1,
      [SocialClass.ARTISAN]: 0,
      [SocialClass.COMMONER]: 0,
      [SocialClass.ROGUE]: +2,
      [SocialClass.OUTLAW]: +3
    };
    return impacts[socialClass] || 0;
  }

  private extractTopics(message: string): string[] {
    const topics = [];
    const topicKeywords = {
      '武器': ['劍', '刀', '弓', '箭'],
      '商業': ['買', '賣', '價格', '金錢'],
      '技能': ['學習', '技能', '教學'],
      '天氣': ['晴天', '下雨', '天氣']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      if (keywords.some(keyword => message.includes(keyword))) {
        topics.push(topic);
      }
    }

    return topics;
  }

  private generateInappropriateResponse(socialClass: SocialClass, friendshipLevel: string): string {
    // 這只是fallback，實際應該由AI生成
    const responses = {
      [SocialClass.NOBILITY]: "這種言論實在不雅...",
      [SocialClass.SCHOLAR]: "請保持對話的文明程度。",
      [SocialClass.ROGUE]: "哈！我喜歡你這樣的痞子！",
      [SocialClass.OUTLAW]: "這才像話嘛！"
    };
    return responses[socialClass] || "請注意你的言辭。";
  }

  private generateEloquentResponse(socialClass: SocialClass, friendshipLevel: string): string {
    const responses = {
      [SocialClass.NOBILITY]: "您的談吐真是優雅。",
      [SocialClass.SCHOLAR]: "和有教養的人交談總是愉快的。",
      [SocialClass.ROGUE]: "你說話還挺文縐縐的嘛。"
    };
    return responses[socialClass] || "謝謝您的禮貌。";
  }

  private generateNormalResponse(npcProfile: any, relationshipContext: any): string {
    return "我在聽，請繼續說。";
  }

  private getSocialClassName(socialClass: SocialClass): string {
    const names = {
      [SocialClass.NOBILITY]: '貴族',
      [SocialClass.SCHOLAR]: '學者',
      [SocialClass.MERCHANT]: '商人',
      [SocialClass.ARTISAN]: '工匠',
      [SocialClass.COMMONER]: '平民',
      [SocialClass.ROGUE]: '地痞',
      [SocialClass.OUTLAW]: '亡命徒'
    };
    return names[socialClass] || '平民';
  }

  private getEducationName(education: EducationLevel): string {
    const names = {
      [EducationLevel.UNIVERSITY]: '大學',
      [EducationLevel.APPRENTICED]: '學徒',
      [EducationLevel.SELF_TAUGHT]: '自學',
      [EducationLevel.BASIC]: '基礎教育',
      [EducationLevel.ILLITERATE]: '文盲'
    };
    return names[education] || '基礎教育';
  }

  private getCultureName(culture: CulturalBackground): string {
    const names = {
      [CulturalBackground.REFINED]: '精緻文化',
      [CulturalBackground.URBAN]: '都市文化',
      [CulturalBackground.RURAL]: '鄉村文化',
      [CulturalBackground.STREET]: '街頭文化',
      [CulturalBackground.CRIMINAL]: '犯罪文化'
    };
    return names[culture] || '鄉村文化';
  }
}