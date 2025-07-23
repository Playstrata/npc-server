// AI服務相關類型定義

import { NPCPersonality, NPCMood } from '../npcs/dialogue.service';
import { FriendshipLevel } from '../npcs/npcs.service';

// 社會階層
export enum SocialClass {
  NOBILITY = 'NOBILITY',           // 貴族 - 最高雅
  SCHOLAR = 'SCHOLAR',             // 學者 - 文化人
  MERCHANT = 'MERCHANT',           // 商人 - 實用主義
  ARTISAN = 'ARTISAN',             // 工匠 - 中產階級
  COMMONER = 'COMMONER',           // 平民 - 普通百姓
  ROGUE = 'ROGUE',                 // 地痞 - 街頭文化
  OUTLAW = 'OUTLAW'                // 亡命徒 - 最粗野
}

// 教育程度
export enum EducationLevel {
  UNIVERSITY = 'UNIVERSITY',        // 大學程度
  APPRENTICED = 'APPRENTICED',      // 學徒出身
  SELF_TAUGHT = 'SELF_TAUGHT',     // 自學成才
  BASIC = 'BASIC',                 // 基礎教育
  ILLITERATE = 'ILLITERATE'        // 文盲
}

// 文化背景
export enum CulturalBackground {
  REFINED = 'REFINED',             // 精緻文化
  URBAN = 'URBAN',                 // 都市文化
  RURAL = 'RURAL',                 // 鄉村文化
  STREET = 'STREET',               // 街頭文化
  CRIMINAL = 'CRIMINAL'            // 犯罪文化
}

// 談判策略
export enum NegotiationStrategy {
  FLATTERY = 'FLATTERY',          // 阿諛奉承
  LOGICAL = 'LOGICAL',            // 邏輯說服
  EMOTIONAL = 'EMOTIONAL',        // 情感訴求
  INTIMIDATION = 'INTIMIDATION',  // 威脅恐嚇
  HUMOR = 'HUMOR',               // 幽默化解
  FRIENDSHIP = 'FRIENDSHIP'       // 友情牌
}

// 內容分析結果
export interface ContentAnalysis {
  // 基本分析
  contentType: 'normal' | 'inappropriate' | 'eloquent' | 'crude' | 'nonsensical' | 'spam';
  
  // 語言風格分析
  languageStyle: {
    formality: number;        // 正式程度 0-10
    eloquence: number;        // 文雅程度 0-10
    aggression: number;       // 攻擊性 0-10
    humor: number;           // 幽默程度 0-10
    profanity: number;       // 粗俗程度 0-10
    intelligence: number;     // 智慧程度 0-10
  };
  
  // 談判元素識別
  negotiationElements: {
    strategies: NegotiationStrategy[];
    persuasionAttempt: boolean;
    priceRequest: boolean;
    discountRequest: boolean;
  };
  
  // 內容特徵
  contentFeatures: {
    isCoherent: boolean;      // 是否連貫有意義
    approximateLength: 'short' | 'normal' | 'long' | 'excessive';
    topics: string[];         // 討論的話題
    sentiment: 'positive' | 'negative' | 'neutral';
  };
}

// 容忍度計算
export interface ToleranceCalculation {
  baseTolerance: number;      // 基礎容忍度
  friendshipBonus: number;    // 友好度加成
  finalTolerance: number;     // 最終容忍度
  
  penaltyCalculation: {
    contentSeverity: number;        // 內容嚴重程度
    baseDeduction: number;          // 基礎扣除
    toleranceReduction: number;     // 容忍度減免
    finalDeduction: number;         // 最終扣除數值
  };
}

// 友好度影響計算
export interface FriendshipImpactCalculation {
  contentImpact: number;          // 基於內容的影響
  relationshipModifier: number;   // 關係狀態修正
  expectationPenalty: number;     // 期望落差懲罰
  toleranceCredit: number;        // 容忍度信用
  finalImpact: number;           // 最終影響
}

// NPC詳細檔案
export interface DetailedNPCProfile {
  id: string;
  name: string;
  socialClass: SocialClass;
  education: EducationLevel;
  culturalBackground: CulturalBackground;
  personality: NPCPersonality;
  currentMood: NPCMood;
  
  // 對話偏好
  dialoguePreferences: {
    preferredTopics: string[];        // 喜歡的話題
    tabooTopics: string[];           // 禁忌話題
    languagePreference: {
      formality: 'high' | 'medium' | 'low';
      complexity: 'simple' | 'moderate' | 'sophisticated';
    };
  };
  
  // 談判特點
  negotiationTraits: {
    baseStubborness: number;        // 基礎固執程度 0-10
    greedLevel: number;             // 貪婪程度 0-10
    emotionalInfluence: number;     // 情感影響敏感度 0-10
  };
  
  // 容忍度配置
  toleranceConfig: {
    inappropriateContent: number;   // 對不當內容的容忍度 0-10
    nonsensicalText: number;        // 對無意義文字的容忍度 0-10
    lengthTolerance: number;        // 對長文的容忍度 0-10
    spamTolerance: number;          // 對重複內容的容忍度 0-10
    hostilityTolerance: number;     // 對敵意的容忍度 0-10
  };
}

// AI回應生成上下文
export interface AIResponseContext {
  npcProfile: DetailedNPCProfile;
  
  relationshipContext: {
    friendshipLevel: FriendshipLevel;
    friendshipScore: number;
    conversationHistory: string[];      // 最近的對話歷史
    playerReputation: number;
  };
  
  situationalContext: {
    timeOfDay: string;
    location: string;
    weather: string;
    npcCurrentActivity: string;
  };
  
  playerMessage: string;                // 玩家的輸入
  contentAnalysis: ContentAnalysis;     // AI對內容的分析
}

// AI生成的回應
export interface AIGeneratedResponse {
  response: string;                     // 完全由AI生成的回覆
  emotionalTone: string;               // AI判斷的情感色調
  bodyLanguage?: string;               // 可選的肢體語言描述
  conversationDirection: 'continue' | 'deflect' | 'end'; // 對話走向
  responseStyle: 'polite' | 'firm' | 'annoyed' | 'disgusted' | 'friendly' | 'dismissive';
}

// 完整的對話結果
export interface DialogueResult {
  success: boolean;
  npcResponse: string;
  friendshipChange: number;
  friendshipDetails: {
    tolerance: ToleranceCalculation;
    impact: FriendshipImpactCalculation;
  };
  conversationContinued: boolean;
  aiResponse: AIGeneratedResponse;
}

// AI API響應格式
export interface AIAPIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

// 社會階層容忍度配置
export const SOCIAL_CLASS_TOLERANCE_CONFIG = {
  [SocialClass.NOBILITY]: {
    inappropriateContent: 0,
    nonsensicalText: 2,
    lengthTolerance: 7,
    spamTolerance: 1,
    hostilityTolerance: 0
  },
  [SocialClass.SCHOLAR]: {
    inappropriateContent: 1,
    nonsensicalText: 1,
    lengthTolerance: 9,
    spamTolerance: 2,
    hostilityTolerance: 2
  },
  [SocialClass.MERCHANT]: {
    inappropriateContent: 3,
    nonsensicalText: 4,
    lengthTolerance: 5,
    spamTolerance: 3,
    hostilityTolerance: 4
  },
  [SocialClass.ARTISAN]: {
    inappropriateContent: 4,
    nonsensicalText: 5,
    lengthTolerance: 6,
    spamTolerance: 4,
    hostilityTolerance: 5
  },
  [SocialClass.COMMONER]: {
    inappropriateContent: 5,
    nonsensicalText: 6,
    lengthTolerance: 5,
    spamTolerance: 5,
    hostilityTolerance: 6
  },
  [SocialClass.ROGUE]: {
    inappropriateContent: 8,
    nonsensicalText: 7,
    lengthTolerance: 4,
    spamTolerance: 7,
    hostilityTolerance: 8
  },
  [SocialClass.OUTLAW]: {
    inappropriateContent: 10,
    nonsensicalText: 8,
    lengthTolerance: 3,
    spamTolerance: 8,
    hostilityTolerance: 10
  }
};

// 中文名稱映射
export const SOCIAL_CLASS_NAMES = {
  [SocialClass.NOBILITY]: '貴族',
  [SocialClass.SCHOLAR]: '學者',
  [SocialClass.MERCHANT]: '商人',
  [SocialClass.ARTISAN]: '工匠',
  [SocialClass.COMMONER]: '平民',
  [SocialClass.ROGUE]: '地痞',
  [SocialClass.OUTLAW]: '亡命徒'
};

export const EDUCATION_LEVEL_NAMES = {
  [EducationLevel.UNIVERSITY]: '大學程度',
  [EducationLevel.APPRENTICED]: '學徒出身',
  [EducationLevel.SELF_TAUGHT]: '自學成才',
  [EducationLevel.BASIC]: '基礎教育',
  [EducationLevel.ILLITERATE]: '文盲'
};

export const CULTURAL_BACKGROUND_NAMES = {
  [CulturalBackground.REFINED]: '精緻文化',
  [CulturalBackground.URBAN]: '都市文化',
  [CulturalBackground.RURAL]: '鄉村文化',
  [CulturalBackground.STREET]: '街頭文化',
  [CulturalBackground.CRIMINAL]: '犯罪文化'
};