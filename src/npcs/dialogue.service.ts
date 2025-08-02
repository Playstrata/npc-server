import { Injectable, Logger } from "@nestjs/common";
import { NPCType, NPCProfession, FriendshipLevel } from "./npcs.service";

// NPC 性格特徵
export interface NPCPersonality {
  traits: {
    friendliness: number; // 友善度 (1-10)
    curiosity: number; // 好奇心 (1-10)
    helpfulness: number; // 樂於助人 (1-10)
    chattiness: number; // 健談程度 (1-10)
    greediness: number; // 貪婪程度 (1-10)
    trustfulness: number; // 信任度 (1-10)
    pride: number; // 自豪感 (1-10)
    patience: number; // 耐心程度 (1-10)
  };
  quirks: string[]; // 個人習慣/特色
  fears: string[]; // 恐懼/顧忌
  interests: string[]; // 興趣愛好
  speechPatterns: {
    formality: "casual" | "formal" | "rustic"; // 說話方式
    accent: string; // 口音/方言
    catchphrases: string[]; // 口頭禪
    vocabulary: "simple" | "complex" | "professional"; // 詞彙複雜度
  };
}

// NPC 當前狀態
export interface NPCMood {
  currentMood:
    | "happy"
    | "neutral"
    | "sad"
    | "angry"
    | "excited"
    | "worried"
    | "tired";
  energy: number; // 精力值 (0-100)
  stress: number; // 壓力值 (0-100)
  satisfaction: number; // 工作滿意度 (0-100)
  recentEvents: Array<{
    type: "success" | "failure" | "interaction" | "discovery";
    description: string;
    impact: number; // 對情緒的影響 (-5 to +5)
    timestamp: Date;
  }>;
}

// 對話上下文
export interface DialogueContext {
  timeOfDay: "dawn" | "morning" | "noon" | "afternoon" | "evening" | "night";
  weather: "sunny" | "cloudy" | "rainy" | "stormy" | "snowy";
  season: "spring" | "summer" | "autumn" | "winter";
  location: string;
  playerLevel: number;
  friendshipLevel: FriendshipLevel;
  friendshipScore: number;
  recentPlayerActions: string[]; // 玩家最近的行為
  npcWorkStatus: "working" | "resting" | "busy" | "free";
  hasQuests: boolean;
  hasShop: boolean;
  canTeach: boolean;
}

// 生成的對話
export interface GeneratedDialogue {
  greeting: string;
  mainContent: string;
  availableResponses: Array<{
    id: string;
    text: string;
    type: "friendly" | "business" | "quest" | "learning" | "goodbye";
    requiresFriendship?: FriendshipLevel;
    action?: string;
  }>;
  mood: string;
  personalityShown: string[]; // 展現出的性格特徵
}

@Injectable()
export class DialogueService {
  private readonly logger = new Logger(DialogueService.name);

  /**
   * 生成動態對話
   */
  generateDialogue(
    npcId: string,
    npcType: NPCType,
    npcProfession: NPCProfession,
    personality: NPCPersonality,
    currentMood: NPCMood,
    context: DialogueContext,
  ): GeneratedDialogue {
    // 生成問候語
    const greeting = this.generateGreeting(personality, currentMood, context);

    // 生成主要對話內容
    const mainContent = this.generateMainContent(
      npcType,
      npcProfession,
      personality,
      currentMood,
      context,
    );

    // 生成可用回應選項
    const availableResponses = this.generateResponseOptions(
      npcType,
      personality,
      context,
    );

    // 分析展現的性格特徵
    const personalityShown = this.analyzePersonalityShown(
      personality,
      currentMood,
    );

    return {
      greeting,
      mainContent,
      availableResponses,
      mood: currentMood.currentMood,
      personalityShown,
    };
  }

  /**
   * 生成問候語
   */
  private generateGreeting(
    personality: NPCPersonality,
    currentMood: NPCMood,
    context: DialogueContext,
  ): string {
    const greetings: string[] = [];
    const timeGreeting = this.getTimeGreeting(context.timeOfDay);

    // 基於友善度調整問候語
    if (personality.traits.friendliness >= 8) {
      greetings.push(`${timeGreeting}！很高興見到你`);
      greetings.push(`哈囉！今天過得怎麼樣？`);
    } else if (personality.traits.friendliness >= 5) {
      greetings.push(`${timeGreeting}`);
      greetings.push(`你好`);
    } else {
      greetings.push(`嗯`);
      greetings.push(`什麼事？`);
    }

    // 基於情緒調整
    if (
      currentMood.currentMood === "happy" ||
      currentMood.currentMood === "excited"
    ) {
      greetings.push(`${timeGreeting}！今天真是美好的一天！`);
    } else if (currentMood.currentMood === "tired") {
      greetings.push(`${timeGreeting}...有點累了`);
    } else if (currentMood.currentMood === "angry") {
      greetings.push(`${timeGreeting}。希望你不是來添麻煩的`);
    }

    // 基於友誼等級調整
    if (context.friendshipLevel === FriendshipLevel.BEST_FRIEND) {
      greetings.push(`我的好朋友！${timeGreeting}！`);
    } else if (context.friendshipLevel === FriendshipLevel.ENEMY) {
      greetings.push(`是你啊...`);
    }

    return this.selectRandomWithWeight(greetings, personality, currentMood);
  }

  /**
   * 生成主要對話內容
   */
  private generateMainContent(
    npcType: NPCType,
    npcProfession: NPCProfession,
    personality: NPCPersonality,
    currentMood: NPCMood,
    context: DialogueContext,
  ): string {
    const contentParts: string[] = [];

    // 基於職業的專業話題
    const professionalContent = this.generateProfessionalContent(
      npcProfession,
      personality,
      currentMood,
      context,
    );
    if (professionalContent) contentParts.push(professionalContent);

    // 基於心情的內容
    const moodContent = this.generateMoodBasedContent(currentMood, personality);
    if (moodContent) contentParts.push(moodContent);

    // 基於天氣的評論
    if (personality.traits.chattiness >= 6) {
      const weatherComment = this.generateWeatherComment(
        context.weather,
        personality,
      );
      if (weatherComment) contentParts.push(weatherComment);
    }

    // 基於玩家關係的內容
    const relationshipContent = this.generateRelationshipContent(
      context.friendshipLevel,
      context.friendshipScore,
      personality,
    );
    if (relationshipContent) contentParts.push(relationshipContent);

    // 基於最近事件的內容
    const eventContent = this.generateRecentEventContent(
      currentMood.recentEvents,
      personality,
    );
    if (eventContent) contentParts.push(eventContent);

    return (
      contentParts.join(" ") ||
      this.getDefaultContent(npcProfession, personality)
    );
  }

  /**
   * 生成職業相關內容
   */
  private generateProfessionalContent(
    profession: NPCProfession,
    personality: NPCPersonality,
    currentMood: NPCMood,
    context: DialogueContext,
  ): string {
    const contents: string[] = [];

    switch (profession) {
      case NPCProfession.MINER:
        if (personality.traits.pride >= 7) {
          contents.push("我在這個礦坑工作了很多年，沒人比我更了解這裡的礦脈");
        }
        if (currentMood.energy < 30) {
          contents.push("今天挖礦特別累，這些礦石越來越難找了");
        } else {
          contents.push("今天運氣不錯，挖到了一些不錯的礦石");
        }
        if (context.weather === "rainy") {
          contents.push("下雨天最適合在礦坑裡工作，外面太濕了");
        }
        break;

      case NPCProfession.CRAFTER:
        if (personality.traits.pride >= 6) {
          contents.push("我的手藝在這個村子裡是數一數二的");
        }
        if (currentMood.satisfaction >= 70) {
          contents.push("最近完成了幾件很滿意的作品");
        }
        if (personality.traits.helpfulness >= 7) {
          contents.push("如果你需要什麼特別的東西，我可以試著為你製作");
        }
        break;

      case NPCProfession.WOODCUTTER:
        if (context.season === "autumn") {
          contents.push("秋天是砍伐木材的最佳時機，樹木正在準備過冬");
        }
        if (personality.traits.friendliness >= 6) {
          contents.push("森林裡總是很安靜，有時候很想和人聊聊天");
        }
        break;

      case NPCProfession.SCHOLAR:
        if (personality.traits.curiosity >= 8) {
          contents.push("我一直在研究古老的文獻，發現了一些有趣的東西");
        }
        if (personality.traits.chattiness >= 7) {
          contents.push("知識應該被分享，你想聽聽我最近的發現嗎？");
        }
        break;
    }

    return this.selectRandomWithWeight(contents, personality, currentMood);
  }

  /**
   * 基於心情生成內容
   */
  private generateMoodBasedContent(
    currentMood: NPCMood,
    personality: NPCPersonality,
  ): string {
    const contents: string[] = [];

    switch (currentMood.currentMood) {
      case "happy":
        if (personality.traits.chattiness >= 6) {
          contents.push("今天心情特別好！");
          contents.push("最近發生了一些不錯的事情");
        }
        break;

      case "tired":
        contents.push("最近工作有點累");
        if (personality.traits.chattiness >= 5) {
          contents.push("感覺需要好好休息一下");
        }
        break;

      case "worried":
        if (personality.traits.trustfulness >= 6) {
          contents.push("最近有些事情讓我擔心");
        }
        break;

      case "angry":
        if (personality.traits.patience <= 4) {
          contents.push("今天遇到了一些煩人的事");
        }
        break;
    }

    return this.selectRandomWithWeight(contents, personality, currentMood);
  }

  /**
   * 生成天氣評論
   */
  private generateWeatherComment(
    weather: string,
    personality: NPCPersonality,
  ): string {
    const comments: string[] = [];

    switch (weather) {
      case "sunny":
        comments.push("今天天氣真不錯");
        comments.push("陽光明媚的日子讓人心情愉快");
        break;
      case "rainy":
        if (personality.traits.patience >= 6) {
          comments.push("雨天有雨天的美好");
        } else {
          comments.push("這雨真是討厭");
        }
        break;
      case "stormy":
        comments.push("外面的風暴聲真大");
        break;
    }

    return comments[Math.floor(Math.random() * comments.length)] || "";
  }

  /**
   * 基於關係生成內容
   */
  private generateRelationshipContent(
    friendshipLevel: FriendshipLevel,
    friendshipScore: number,
    personality: NPCPersonality,
  ): string {
    const contents: string[] = [];

    if (friendshipLevel === FriendshipLevel.BEST_FRIEND) {
      contents.push("很高興我們成為了好朋友");
      if (personality.traits.trustfulness >= 7) {
        contents.push("我可以完全信任你");
      }
    } else if (friendshipLevel === FriendshipLevel.CLOSE_FRIEND) {
      contents.push("你是個值得信賴的人");
    } else if (friendshipLevel === FriendshipLevel.FRIENDLY) {
      contents.push("很高興認識你");
    } else if (
      friendshipLevel === FriendshipLevel.NEUTRAL &&
      personality.traits.curiosity >= 6
    ) {
      contents.push("我對你還不太了解，但願意多認識你");
    } else if (friendshipLevel === FriendshipLevel.UNFRIENDLY) {
      if (personality.traits.patience >= 5) {
        contents.push("也許我們可以重新開始");
      } else {
        contents.push("我們之間似乎有些誤會");
      }
    }

    return this.selectRandomWithWeight(contents, personality, null);
  }

  /**
   * 基於最近事件生成內容
   */
  private generateRecentEventContent(
    recentEvents: NPCMood["recentEvents"],
    personality: NPCPersonality,
  ): string {
    if (recentEvents.length === 0 || personality.traits.chattiness < 5)
      return "";

    const recentEvent = recentEvents[0]; // 最近的事件
    const contents: string[] = [];

    switch (recentEvent.type) {
      case "success":
        if (personality.traits.pride >= 6) {
          contents.push(`剛才${recentEvent.description}，感覺很有成就感`);
        } else {
          contents.push(`最近${recentEvent.description}，運氣還不錯`);
        }
        break;
      case "failure":
        if (personality.traits.patience >= 6) {
          contents.push(`雖然${recentEvent.description}，但我會繼續努力`);
        } else {
          contents.push(`${recentEvent.description}，真是令人沮喪`);
        }
        break;
    }

    return this.selectRandomWithWeight(contents, personality, null);
  }

  /**
   * 生成回應選項
   */
  private generateResponseOptions(
    npcType: NPCType,
    personality: NPCPersonality,
    context: DialogueContext,
  ): GeneratedDialogue["availableResponses"] {
    const responses: GeneratedDialogue["availableResponses"] = [];

    // 基礎對話選項
    if (personality.traits.chattiness >= 5) {
      responses.push({
        id: "chat",
        text: "聊聊天吧",
        type: "friendly",
      });
    }

    // 商業相關選項
    if (context.hasShop) {
      responses.push({
        id: "shop",
        text: "我想看看你的商品",
        type: "business",
        action: "open_shop",
      });
    }

    // 任務相關選項
    if (context.hasQuests) {
      responses.push({
        id: "quest",
        text: "有什麼我可以幫忙的嗎？",
        type: "quest",
        action: "show_quests",
      });
    }

    // 學習相關選項
    if (context.canTeach && npcType === NPCType.TRAINER) {
      responses.push({
        id: "learn",
        text: "你可以教我一些技能嗎？",
        type: "learning",
        action: "show_skills",
        requiresFriendship: FriendshipLevel.FRIENDLY,
      });
    }

    // 特殊友誼選項
    if (context.friendshipLevel === FriendshipLevel.CLOSE_FRIEND) {
      responses.push({
        id: "special",
        text: "最近過得怎麼樣？",
        type: "friendly",
        requiresFriendship: FriendshipLevel.CLOSE_FRIEND,
      });
    }

    // 告別選項
    responses.push({
      id: "goodbye",
      text: this.generateGoodbyeText(personality),
      type: "goodbye",
      action: "end_conversation",
    });

    return responses;
  }

  /**
   * 生成告別文本
   */
  private generateGoodbyeText(personality: NPCPersonality): string {
    if (personality.traits.friendliness >= 7) {
      const friendlyGoodbyes = [
        "回頭見！",
        "祝你有美好的一天！",
        "期待下次見面！",
      ];
      return friendlyGoodbyes[
        Math.floor(Math.random() * friendlyGoodbyes.length)
      ];
    } else if (personality.traits.friendliness >= 4) {
      return "再見";
    } else {
      return "嗯";
    }
  }

  /**
   * 分析展現的性格特徵
   */
  private analyzePersonalityShown(
    personality: NPCPersonality,
    currentMood: NPCMood,
  ): string[] {
    const traits: string[] = [];

    if (personality.traits.friendliness >= 7) traits.push("友善");
    if (personality.traits.chattiness >= 7) traits.push("健談");
    if (personality.traits.helpfulness >= 7) traits.push("樂於助人");
    if (personality.traits.pride >= 7) traits.push("自豪");
    if (personality.traits.curiosity >= 7) traits.push("好奇");

    if (currentMood.currentMood === "happy") traits.push("愉快");
    if (currentMood.currentMood === "tired") traits.push("疲憊");

    return traits;
  }

  /**
   * 根據權重選擇文本
   */
  private selectRandomWithWeight(
    options: string[],
    personality: NPCPersonality,
    currentMood: NPCMood | null,
  ): string {
    if (options.length === 0) return "";

    // 簡單隨機選擇，實際可以根據性格特徵調整權重
    return options[Math.floor(Math.random() * options.length)];
  }

  /**
   * 獲取時間問候語
   */
  private getTimeGreeting(timeOfDay: string): string {
    const greetings = {
      dawn: "早安",
      morning: "早上好",
      noon: "午安",
      afternoon: "下午好",
      evening: "晚上好",
      night: "夜深了",
    };

    return greetings[timeOfDay] || "你好";
  }

  /**
   * 獲取預設內容
   */
  private getDefaultContent(
    profession: NPCProfession,
    personality: NPCPersonality,
  ): string {
    if (personality.traits.chattiness <= 3) {
      return "..."; // 不愛說話的人
    }

    const defaults = {
      [NPCProfession.MINER]: "我在這裡挖礦工作",
      [NPCProfession.CRAFTER]: "我是個工匠",
      [NPCProfession.WOODCUTTER]: "我負責砍伐木材",
      [NPCProfession.SCHOLAR]: "我在研究各種知識",
      [NPCProfession.FARMER]: "我在這裡務農",
      [NPCProfession.FISHER]: "我在河邊釣魚",
      [NPCProfession.HUNTER]: "我是個獵人",
      [NPCProfession.HEALER]: "我可以治療傷患",
    };

    return defaults[profession] || "我在這裡工作";
  }
}
