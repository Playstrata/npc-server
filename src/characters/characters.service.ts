import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto, AllocateStatsDto } from './dto/update-character.dto';
import { SkillsService, SkillType } from '../skills/skills.service';
import { CharacterClass, getClassData, isValidCharacterClass } from './character-classes.types';
import { MagicalStorageService } from './magical-storage.service';
import { LuckService, LuckEvent } from './luck.service';

@Injectable()
export class CharactersService {
  private readonly logger = new Logger(CharactersService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SkillsService)) private skillsService: SkillsService,
    @Inject(forwardRef(() => MagicalStorageService)) private magicalStorageService: MagicalStorageService,
    @Inject(forwardRef(() => LuckService)) private luckService: LuckService
  ) {}

  async create(userId: string, createCharacterDto: CreateCharacterDto) {
    // 檢查用戶是否已有角色
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { gameCharacter: true },
    });

    if (existingUser?.gameCharacter) {
      throw new BadRequestException('用戶已經有一個角色了，無法創建更多角色');
    }

    // 檢查角色名稱是否已存在
    const existingCharacter = await this.prisma.gameCharacter.findFirst({
      where: { characterName: createCharacterDto.name },
    });

    if (existingCharacter) {
      throw new BadRequestException('角色名稱已被使用，請選擇其他名稱');
    }

    // 所有新角色都從初心者開始，忽略傳入的職業參數
    const characterClass = CharacterClass.NOVICE;
    
    // 獲取初心者職業數據
    const classData = getClassData(characterClass);

    const newCharacter = await this.prisma.gameCharacter.create({
      data: {
        characterName: createCharacterDto.name,
        characterClass,
        userId,
        // 使用職業基礎屬性
        health: classData.baseStats.health,
        maxHealth: classData.baseStats.health,
        mana: classData.baseStats.mana,
        maxMana: classData.baseStats.mana,
        strength: classData.baseStats.strength,
        dexterity: classData.baseStats.dexterity,
        intelligence: classData.baseStats.intelligence,
        stamina: classData.baseStats.stamina,
        // luckPercentage 使用預設值 100.0
      },
      include: {
        user: true,
      },
    });

    // 初心者不會自動獲得魔法收納，需要轉職為法師後學習技能

    // 初心者沒有起始技能，需要通過學習和轉職獲得

    console.log(`[CharactersService] 創建 ${classData.name} 角色: ${createCharacterDto.name}`);

    return newCharacter;
  }

  async findByUser(userId: string) {
    return this.prisma.gameCharacter.findUnique({
      where: { userId },
      include: {
        user: true,
      },
    });
  }

  async canCreateCharacter(userId: string): Promise<boolean> {
    const existingCharacter = await this.prisma.gameCharacter.findUnique({
      where: { userId },
    });
    return !existingCharacter;
  }

  async findOne(id: string) {
    const character = await this.prisma.gameCharacter.findUnique({
      where: { id },
      include: {
        user: true,
      },
    });

    if (!character) {
      throw new NotFoundException(`Character with ID ${id} not found`);
    }

    return character;
  }

  async update(id: string, updateCharacterDto: UpdateCharacterDto) {
    await this.findOne(id); // 確保角色存在

    const updateData: any = {};
    
    if (updateCharacterDto.hp !== undefined) {
      updateData.currentHp = Math.max(0, updateCharacterDto.hp);
    }
    if (updateCharacterDto.mp !== undefined) {
      updateData.currentMp = Math.max(0, updateCharacterDto.mp);
    }
    if (updateCharacterDto.currentMap) {
      updateData.currentMapLocation = updateCharacterDto.currentMap;
    }
    if (updateCharacterDto.positionX !== undefined) {
      updateData.positionX = updateCharacterDto.positionX;
    }
    if (updateCharacterDto.positionY !== undefined) {
      updateData.positionY = updateCharacterDto.positionY;
    }

    updateData.lastSaveTimestamp = new Date();

    return this.prisma.gameCharacter.update({
      where: { id },
      data: updateData,
      include: {
        user: true,
      },
    });
  }

  async allocateStats(id: string, allocateStatsDto: AllocateStatsDto) {
    const character = await this.findOne(id);
    
    // 計算總共要分配的點數
    const totalPointsToAllocate = 
      (allocateStatsDto.strength || 0) +
      (allocateStatsDto.dexterity || 0) +
      (allocateStatsDto.intelligence || 0) +
      (allocateStatsDto.stamina || 0);
    // luck為隱藏屬性，不能直接分配

    if (totalPointsToAllocate > character.availableStatPoints) {
      throw new BadRequestException('Not enough stat points available');
    }

    const updatedCharacter = await this.prisma.gameCharacter.update({
      where: { id },
      data: {
        strength: character.strength + (allocateStatsDto.strength || 0),
        dexterity: character.dexterity + (allocateStatsDto.dexterity || 0),
        intelligence: character.intelligence + (allocateStatsDto.intelligence || 0),
        baseStamina: character.baseStamina + (allocateStatsDto.stamina || 0),
        // luckPercentage由LuckService管理，不在此處修改
        availableStatPoints: character.availableStatPoints - totalPointsToAllocate,
        // 耐力影響最大HP和負重能力
        maxHealth: allocateStatsDto.stamina 
          ? character.maxHealth + (allocateStatsDto.stamina * 5)
          : character.maxHealth,
      },
      include: {
        user: true,
      },
    });

    // 如果智力有提升且角色是法師，更新魔法收納容量
    if (allocateStatsDto.intelligence && updatedCharacter.characterClass === CharacterClass.MAGE) {
      await this.magicalStorageService.updateMagicalStorageCapacity(
        id, 
        updatedCharacter.intelligence
      );
    }

    return updatedCharacter;
  }

  async gainExperience(id: string, expGain: number) {
    return this.prisma.$transaction(async (prisma) => {
      const character = await prisma.gameCharacter.findUniqueOrThrow({
        where: { id },
      });
      
      let newExp = character.experience + expGain;
      let newLevel = character.level;
      let newStatPoints = character.availableStatPoints;
      let newMaxHp = character.maxHealth;
      let newMaxMp = character.maxMana;
      
      // 升級邏輯 - 簡化版本，每100經驗升一級
      const experiencePerLevel = 100;
      while (newExp >= experiencePerLevel) {
        newExp -= experiencePerLevel;
        newLevel += 1;
        newStatPoints += 5; // 每升級獲得5點屬性點
        
        // 升級時增加基礎數值
        const hpIncrease = 10 + Math.floor(character.baseStamina * 0.5);
        const mpIncrease = 5 + Math.floor(character.intelligence * 0.3);
        
        newMaxHp += hpIncrease;
        newMaxMp += mpIncrease;
      }
      
      // 計算下一級所需經驗值 (指數增長)
      const nextLevelExp = Math.floor(100 * Math.pow(1.2, newLevel - 1));
      
      return prisma.gameCharacter.update({
        where: { id },
        data: {
          experience: newExp,
          level: newLevel,
          availableStatPoints: newStatPoints,
          maxHealth: newMaxHp,
          maxMana: newMaxMp,
          health: newMaxHp, // 升級時回滿血
          mana: newMaxMp, // 升級時回滿魔
        },
        include: {
          user: true,
        },
      });
    });
  }

  async heal(id: string, hpAmount: number = 0, mpAmount: number = 0) {
    const character = await this.findOne(id);
    
    return this.prisma.gameCharacter.update({
      where: { id },
      data: {
        health: Math.min(character.health + hpAmount, character.maxHealth),
        mana: Math.min(character.mana + mpAmount, character.maxMana),
      },
      include: {
        user: true,
      },
    });
  }

  async takeDamage(id: string, damage: number) {
    const character = await this.findOne(id);
    
    return this.prisma.gameCharacter.update({
      where: { id },
      data: {
        health: Math.max(character.health - damage, 0),
      },
      include: {
        user: true,
      },
    });
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id); // 確保角色存在
    await this.prisma.gameCharacter.delete({
      where: { id },
    });
  }

  async getCharacterStats(id: string) {
    const character = await this.findOne(id);
    
    // 獲取職業數據
    const classData = getClassData(character.characterClass as CharacterClass);
    
    // 使用新的戰鬥數值計算系統（包含所有裝備槽位加成）
    // TODO: 實際裝備數據需要從 items 系統獲取
    const equipmentBonuses = {
      physicalAttack: 0,  // 武器 + 手套等可能有攻擊加成
      magicalAttack: 0,   // 武器 + 手套等可能有魔法攻擊加成
      physicalDefense: 0, // 所有防具的物理防禦加成總合
      magicalDefense: 0   // 所有防具的魔法防禦加成總合
    };
    
    // 各裝備槽位加成（需要從資料庫獲取實際裝備數據）:
    // - 頭部 (helmet): 主要防禦，少量攻擊
    // - 身體 (chest): 主要防禦
    // - 上衣 (shirt/套裝): 防禦 + 特殊效果
    // - 褲/裙 (pants/skirt): 防禦 + 移動加成
    // - 鞋 (shoes): 防禦 + 移動速度
    // - 手套 (gloves): 攻擊 + 防禦
    // - 武器 (weapon): 主要攻擊來源
    // - 盾牌 (shield): 主要防禦 + 格檔
    
    const physicalAttack = Math.floor(
      (character.strength * 1.5) + 
      (character.level * classData.growthRates.physicalAttackPerLevel) +
      equipmentBonuses.physicalAttack  // 所有裝備的物理攻擊加成
    );
    const magicalAttack = Math.floor(
      (character.intelligence * 1.5) + 
      (character.level * classData.growthRates.magicalAttackPerLevel) +
      equipmentBonuses.magicalAttack   // 所有裝備的魔法攻擊加成
    );
    const physicalDefense = Math.floor(
      (character.stamina * 1.2) + 
      (character.level * classData.growthRates.physicalDefensePerLevel) +
      equipmentBonuses.physicalDefense  // 所有防具的物理防禦加成
    );
    const magicalDefense = Math.floor(
      (character.intelligence * 0.8) + 
      (character.level * classData.growthRates.magicalDefensePerLevel) +
      equipmentBonuses.magicalDefense   // 所有防具的魔法防禦加成
    );
    
    // 其他數值計算
    const accuracy = Math.floor(character.dexterity * 0.8 + character.level);
    const evasion = Math.floor(character.dexterity * 0.6 + (character.luckPercentage * 0.4));
    const criticalRate = Math.min(Math.floor((character.luckPercentage - 50) * 0.3 + character.dexterity * 0.1), 50);
    
    return {
      basic: {
        hp: character.health,
        maxHp: character.maxHealth,
        mp: character.mana,
        maxMp: character.maxMana,
        level: character.level,
        experience: character.experience,
        gold: character.goldAmount,
      },
      attributes: {
        strength: character.strength,
        dexterity: character.dexterity,
        intelligence: character.intelligence,
        stamina: character.stamina,
        luckPercentage: character.luckPercentage, // 隱藏屬性，通常不顯示給玩家
        availableStatPoints: character.availableStatPoints,
      },
      combat: {
        physicalAttack,
        magicalAttack,
        physicalDefense,
        magicalDefense,
        accuracy,
        evasion,
        criticalRate,
      },
      position: {
        currentMap: character.currentMapLocation,
        x: character.positionX,
        y: character.positionY,
      },
    };
  }

  /**
   * 戰鬥獲得經驗（只能通過打怪獲得）
   * 這與其他技能的經驗系統分離
   */
  async gainCombatExperience(
    characterId: string, 
    experienceGained: number,
    monsterName?: string
  ): Promise<{
    character: any;
    levelUp: boolean;
    oldLevel: number;
    newLevel: number;
    statsPointsGained: number;
  }> {
    const character = await this.findOne(characterId);
    const oldLevel = character.level;
    const oldExperience = character.experience;
    const newExperience = oldExperience + experienceGained;
    
    // 計算新等級
    let newLevel = this.calculateLevelFromExperience(newExperience);
    const levelUp = newLevel > oldLevel;
    const levelsDifference = newLevel - oldLevel;
    
    // 每升一級獲得 5 個屬性點
    const statsPointsGained = levelUp ? levelsDifference * 5 : 0;
    
    // 計算新的血量和魔力上限（基於耐力和智力）
    const maxHp = 50 + (character.stamina * 10) + (newLevel * 5);
    const maxMp = 20 + (character.intelligence * 8) + (newLevel * 3);
    
    const updatedCharacter = await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        experience: newExperience,
        level: newLevel,
        availableStatPoints: character.availableStatPoints + statsPointsGained,
        maxHealth: maxHp,
        maxMana: maxMp,
        // 升級時回復血量和魔力
        ...(levelUp && {
          health: maxHp,
          mana: maxMp,
        }),
      },
      include: {
        user: true,
      },
    });

    // 同時提升戰鬥技能
    if (this.skillsService) {
      try {
        await this.skillsService.practiceSkill(
          character.userId,
          SkillType.COMBAT,
          `擊敗${monsterName || '怪物'}`,
          'normal'
        );
      } catch (error) {
        console.warn('[CharactersService] 更新戰鬥技能失敗:', error);
      }
    }

    // 觸發幸運事件
    try {
      // 戰鬥勝利增加幸運值
      await this.luckService.triggerLuckEvent(characterId, LuckEvent.COMBAT_VICTORY, `擊敗${monsterName || '怪物'}`);
      
      // 如果升級，額外增加幸運值
      if (levelUp) {
        await this.luckService.triggerLuckEvent(characterId, LuckEvent.LEVEL_UP, `升級到${newLevel}級`);
      }
    } catch (error) {
      this.logger.warn('[CharactersService] 觸發幸運事件失敗:', error);
    }

    this.logger.log(`[CharactersService] 角色 ${character.characterName} 獲得 ${experienceGained} 戰鬥經驗${levelUp ? `，升級到 ${newLevel} 級` : ''}`);

    return {
      character: updatedCharacter,
      levelUp,
      oldLevel,
      newLevel,
      statsPointsGained
    };
  }

  /**
   * 根據經驗值計算等級
   * 戰鬥等級採用不同的成長曲線
   */
  private calculateLevelFromExperience(experience: number): number {
    let level = 1;
    let requiredExp = 100; // 第一級需要 100 經驗
    let totalExp = 0;
    
    while (totalExp + requiredExp <= experience) {
      totalExp += requiredExp;
      level++;
      requiredExp = Math.floor(requiredExp * 1.2); // 每級所需經驗增加 20%
    }
    
    return Math.min(level, 100); // 最高等級 100
  }

  /**
   * 獲取下一級所需經驗
   */
  async getExperienceToNextLevel(characterId: string): Promise<{
    currentLevel: number;
    currentExperience: number;
    experienceToNextLevel: number;
    totalExpNeededForNextLevel: number;
  }> {
    const character = await this.findOne(characterId);
    const currentLevel = character.level;
    const currentExperience = character.experience;
    
    if (currentLevel >= 100) {
      return {
        currentLevel,
        currentExperience,
        experienceToNextLevel: 0,
        totalExpNeededForNextLevel: currentExperience
      };
    }
    
    // 計算當前等級總共需要的經驗
    let totalExpForCurrentLevel = 0;
    let requiredExp = 100;
    
    for (let i = 1; i < currentLevel; i++) {
      totalExpForCurrentLevel += requiredExp;
      requiredExp = Math.floor(requiredExp * 1.2);
    }
    
    // 下一級需要的經驗
    const expNeededForNextLevel = Math.floor(requiredExp);
    const totalExpNeededForNextLevel = totalExpForCurrentLevel + expNeededForNextLevel;
    const experienceToNextLevel = totalExpNeededForNextLevel - currentExperience;
    
    return {
      currentLevel,
      currentExperience,
      experienceToNextLevel,
      totalExpNeededForNextLevel
    };
  }
}