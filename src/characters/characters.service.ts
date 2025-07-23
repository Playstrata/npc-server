import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto, AllocateStatsDto } from './dto/update-character.dto';
import { SkillsService, SkillType } from '../skills/skills.service';
import { CharacterClass, getClassData, isValidCharacterClass } from './character-classes.types';
import { MagicalStorageService } from './magical-storage.service';

@Injectable()
export class CharactersService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => SkillsService)) private skillsService: SkillsService,
    @Inject(forwardRef(() => MagicalStorageService)) private magicalStorageService: MagicalStorageService
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
        vitality: classData.baseStats.vitality,
        luck: classData.baseStats.luck,
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
      (allocateStatsDto.vitality || 0) +
      (allocateStatsDto.luck || 0);

    if (totalPointsToAllocate > character.availableStatPoints) {
      throw new BadRequestException('Not enough stat points available');
    }

    const updatedCharacter = await this.prisma.gameCharacter.update({
      where: { id },
      data: {
        strengthStat: character.strengthStat + (allocateStatsDto.strength || 0),
        dexterityStat: character.dexterityStat + (allocateStatsDto.dexterity || 0),
        intelligenceStat: character.intelligenceStat + (allocateStatsDto.intelligence || 0),
        vitalityStat: character.vitalityStat + (allocateStatsDto.vitality || 0),
        luckStat: character.luckStat + (allocateStatsDto.luck || 0),
        availableStatPoints: character.availableStatPoints - totalPointsToAllocate,
        // 體質影響最大HP
        maximumHp: allocateStatsDto.vitality 
          ? character.maximumHp + (allocateStatsDto.vitality * 5)
          : character.maximumHp,
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
      
      let newExp = character.experiencePoints + expGain;
      let newLevel = character.characterLevel;
      let newStatPoints = character.availableStatPoints;
      let newMaxHp = character.maximumHp;
      let newMaxMp = character.maximumMp;
      
      // 升級邏輯
      while (newExp >= character.experienceToNextLevel) {
        newExp -= character.experienceToNextLevel;
        newLevel += 1;
        newStatPoints += 5; // 每升級獲得5點屬性點
        
        // 升級時增加基礎數值
        const hpIncrease = 10 + Math.floor(character.vitalityStat * 0.5);
        const mpIncrease = 5 + Math.floor(character.intelligenceStat * 0.3);
        
        newMaxHp += hpIncrease;
        newMaxMp += mpIncrease;
      }
      
      // 計算下一級所需經驗值 (指數增長)
      const nextLevelExp = Math.floor(100 * Math.pow(1.2, newLevel - 1));
      
      return prisma.gameCharacter.update({
        where: { id },
        data: {
          experiencePoints: newExp,
          characterLevel: newLevel,
          availableStatPoints: newStatPoints,
          maximumHp: newMaxHp,
          maximumMp: newMaxMp,
          currentHp: newMaxHp, // 升級時回滿血
          currentMp: newMaxMp, // 升級時回滿魔
          experienceToNextLevel: nextLevelExp,
        },
        include: {
          gameUser: true,
        },
      });
    });
  }

  async heal(id: string, hpAmount: number = 0, mpAmount: number = 0) {
    const character = await this.findOne(id);
    
    return this.prisma.gameCharacter.update({
      where: { id },
      data: {
        currentHp: Math.min(character.currentHp + hpAmount, character.maximumHp),
        currentMp: Math.min(character.currentMp + mpAmount, character.maximumMp),
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
        currentHp: Math.max(character.currentHp - damage, 0),
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
    
    // 計算戰鬥屬性（模擬原本的計算屬性）
    const physicalAttack = Math.floor(character.strengthStat * 1.5 + character.characterLevel * 2);
    const magicalAttack = Math.floor(character.intelligenceStat * 1.5 + character.characterLevel * 2);
    const defense = Math.floor(character.vitalityStat * 1.2 + character.characterLevel * 1.5);
    const accuracy = Math.floor(character.dexterityStat * 0.8 + character.characterLevel);
    const evasion = Math.floor(character.dexterityStat * 0.6 + character.luckStat * 0.4);
    const criticalRate = Math.min(Math.floor(character.luckStat * 0.3 + character.dexterityStat * 0.1), 50);
    
    return {
      basic: {
        hp: character.currentHp,
        maxHp: character.maximumHp,
        mp: character.currentMp,
        maxMp: character.maximumMp,
        level: character.characterLevel,
        experience: character.experiencePoints,
        experienceToNextLevel: character.experienceToNextLevel,
        gold: character.goldAmount,
      },
      attributes: {
        strength: character.strengthStat,
        dexterity: character.dexterityStat,
        intelligence: character.intelligenceStat,
        vitality: character.vitalityStat,
        luck: character.luckStat,
        availableStatPoints: character.availableStatPoints,
      },
      combat: {
        physicalAttack,
        magicalAttack,
        defense,
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
    
    // 計算新的血量和魔力上限（基於體質和智力）
    const maxHp = 50 + (character.vitality * 10) + (newLevel * 5);
    const maxMp = 20 + (character.intelligence * 8) + (newLevel * 3);
    
    const updatedCharacter = await this.prisma.gameCharacter.update({
      where: { id: characterId },
      data: {
        experience: newExperience,
        level: newLevel,
        availableStatPoints: character.availableStatPoints + statsPointsGained,
        maximumHp: maxHp,
        maximumMp: maxMp,
        // 升級時回復血量和魔力
        ...(levelUp && {
          currentHp: maxHp,
          currentMp: maxMp,
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

    console.log(`[CharactersService] 角色 ${character.name} 獲得 ${experienceGained} 戰鬥經驗${levelUp ? `，升級到 ${newLevel} 級` : ''}`);

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