import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCharacterDto } from './dto/create-character.dto';
import { UpdateCharacterDto, AllocateStatsDto } from './dto/update-character.dto';

@Injectable()
export class CharactersService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.gameCharacter.create({
      data: {
        characterName: createCharacterDto.name,
        userId,
      },
      include: {
        user: true,
      },
    });
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

    return this.prisma.gameCharacter.update({
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
}