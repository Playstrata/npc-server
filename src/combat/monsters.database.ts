import { MonsterDefinition, MonsterType, MonsterTier } from "./monsters.types";

// 怪物資料庫
export const MONSTERS_DATABASE: Record<string, MonsterDefinition> = {
  // ========== 初級怪物 (1-5級) ==========

  "forest-slime": {
    id: "forest-slime",
    name: "森林史萊姆",
    description: "棲息在翠綠森林中的綠色史萊姆，性格溫和但會保護自己的領域",
    type: MonsterType.BEAST,
    tier: MonsterTier.WEAK,
    stats: {
      level: 2,
      health: 45,
      maxHealth: 45,
      mana: 0,
      maxMana: 0,
      physicalAttack: 8,
      magicalAttack: 0,
      physicalDefense: 3,
      magicalDefense: 1,
      speed: 0.8,
      criticalRate: 0.02,
      criticalDamage: 1.2,
      accuracy: 0.85,
      evasion: 0.1,
    },
    behavior: {
      aggroRange: 5.0,
      attackRange: 1.5,
      moveSpeed: 1.2,
      attackCooldown: 2.5,
      fleeThreshold: 0.15,
      isAggressive: false,
      canUseMagic: false,
      specialAbilities: ["ACID_SPIT"],
    },
    resistances: {
      physicalResistance: 0.1,
      magicalResistance: -0.2,
      fireResistance: -0.3,
      waterResistance: 0.5,
      earthResistance: 0.2,
      airResistance: 0.0,
      criticalResistance: 0.1,
    },
    rewards: {
      baseExperience: 25,
      experienceRange: { min: 20, max: 35 },
      combatSkillExperience: 15,
      goldReward: { min: 3, max: 8 },
      drops: [
        {
          itemId: "slime-gel",
          dropRate: 0.7,
          minQuantity: 1,
          maxQuantity: 2,
          quality: "COMMON",
          isGuaranteed: false,
        },
        {
          itemId: "small-health-potion",
          dropRate: 0.15,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "COMMON",
          isGuaranteed: false,
        },
      ],
    },
    spawnLocations: ["forest-clearing", "forest-path", "mushroom-grove"],
    spawnConditions: {
      timeOfDay: "ANY",
      playerLevelRange: { min: 1, max: 8 },
    },
    visualInfo: {
      spriteId: "slime-green",
      size: "SMALL",
      colorVariant: "green",
      animationSet: "slime-basic",
    },
  },

  "wild-rabbit": {
    id: "wild-rabbit",
    name: "野生兔子",
    description: "機靈的森林兔子，雖然看起來無害但被逼急了也會反擊",
    type: MonsterType.BEAST,
    tier: MonsterTier.WEAK,
    stats: {
      level: 1,
      health: 25,
      maxHealth: 25,
      mana: 0,
      maxMana: 0,
      physicalAttack: 5,
      magicalAttack: 0,
      physicalDefense: 1,
      magicalDefense: 2,
      speed: 1.5,
      criticalRate: 0.1,
      criticalDamage: 1.3,
      accuracy: 0.9,
      evasion: 0.25,
    },
    behavior: {
      aggroRange: 3.0,
      attackRange: 1.0,
      moveSpeed: 2.5,
      attackCooldown: 1.8,
      fleeThreshold: 0.5,
      isAggressive: false,
      canUseMagic: false,
      specialAbilities: ["QUICK_ESCAPE"],
    },
    resistances: {
      physicalResistance: -0.1,
      magicalResistance: 0.1,
      fireResistance: -0.2,
      waterResistance: 0.0,
      earthResistance: 0.1,
      airResistance: 0.2,
      criticalResistance: -0.1,
    },
    rewards: {
      baseExperience: 15,
      experienceRange: { min: 10, max: 20 },
      combatSkillExperience: 8,
      goldReward: { min: 1, max: 4 },
      drops: [
        {
          itemId: "rabbit-fur",
          dropRate: 0.8,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "COMMON",
          isGuaranteed: false,
        },
        {
          itemId: "rabbit-meat",
          dropRate: 0.6,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "COMMON",
          isGuaranteed: false,
        },
      ],
    },
    spawnLocations: ["forest-meadow", "village-outskirts", "grass-plains"],
    spawnConditions: {
      timeOfDay: "DAY",
      playerLevelRange: { min: 1, max: 5 },
    },
    visualInfo: {
      spriteId: "rabbit-brown",
      size: "SMALL",
      colorVariant: "brown",
      animationSet: "rabbit-basic",
    },
  },

  // ========== 中級怪物 (6-15級) ==========

  "gray-wolf": {
    id: "gray-wolf",
    name: "灰狼",
    description: "森林中的掠食者，群居動物，單獨遇到時相對安全",
    type: MonsterType.BEAST,
    tier: MonsterTier.NORMAL,
    stats: {
      level: 8,
      health: 120,
      maxHealth: 120,
      mana: 0,
      maxMana: 0,
      physicalAttack: 22,
      magicalAttack: 0,
      physicalDefense: 8,
      magicalDefense: 5,
      speed: 1.2,
      criticalRate: 0.15,
      criticalDamage: 1.5,
      accuracy: 0.88,
      evasion: 0.18,
    },
    behavior: {
      aggroRange: 8.0,
      attackRange: 2.0,
      moveSpeed: 3.0,
      attackCooldown: 2.0,
      fleeThreshold: 0.2,
      isAggressive: true,
      canUseMagic: false,
      specialAbilities: ["PACK_HOWL", "BITE_COMBO"],
    },
    resistances: {
      physicalResistance: 0.0,
      magicalResistance: -0.1,
      fireResistance: -0.1,
      waterResistance: 0.1,
      earthResistance: 0.0,
      airResistance: 0.0,
      criticalResistance: 0.0,
    },
    rewards: {
      baseExperience: 85,
      experienceRange: { min: 70, max: 105 },
      combatSkillExperience: 45,
      goldReward: { min: 12, max: 20 },
      drops: [
        {
          itemId: "wolf-pelt",
          dropRate: 0.75,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "COMMON",
          isGuaranteed: false,
        },
        {
          itemId: "wolf-fang",
          dropRate: 0.35,
          minQuantity: 1,
          maxQuantity: 2,
          quality: "UNCOMMON",
          isGuaranteed: false,
        },
        {
          itemId: "medium-health-potion",
          dropRate: 0.2,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "COMMON",
          isGuaranteed: false,
        },
      ],
    },
    spawnLocations: ["deep-forest", "mountain-path", "forest-cave"],
    spawnConditions: {
      timeOfDay: "ANY",
      playerLevelRange: { min: 5, max: 15 },
    },
    visualInfo: {
      spriteId: "wolf-gray",
      size: "MEDIUM",
      colorVariant: "gray",
      animationSet: "wolf-basic",
    },
  },

  "forest-goblin": {
    id: "forest-goblin",
    name: "森林哥布林",
    description: "狡猾的綠皮小怪，會使用簡單的武器和陷阱",
    type: MonsterType.HUMANOID,
    tier: MonsterTier.NORMAL,
    stats: {
      level: 10,
      health: 95,
      maxHealth: 95,
      mana: 20,
      maxMana: 20,
      physicalAttack: 28,
      magicalAttack: 5,
      physicalDefense: 12,
      magicalDefense: 8,
      speed: 1.4,
      criticalRate: 0.12,
      criticalDamage: 1.4,
      accuracy: 0.85,
      evasion: 0.22,
    },
    behavior: {
      aggroRange: 6.0,
      attackRange: 3.0,
      moveSpeed: 2.2,
      attackCooldown: 2.2,
      fleeThreshold: 0.25,
      isAggressive: true,
      canUseMagic: true,
      specialAbilities: ["THROWING_DAGGER", "CRUDE_MAGIC", "DIRTY_FIGHT"],
    },
    resistances: {
      physicalResistance: 0.05,
      magicalResistance: 0.1,
      fireResistance: 0.0,
      waterResistance: 0.0,
      earthResistance: 0.1,
      airResistance: 0.0,
      criticalResistance: -0.05,
    },
    rewards: {
      baseExperience: 110,
      experienceRange: { min: 90, max: 135 },
      combatSkillExperience: 60,
      goldReward: { min: 15, max: 28 },
      drops: [
        {
          itemId: "goblin-ear",
          dropRate: 0.9,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "COMMON",
          isGuaranteed: true,
        },
        {
          itemId: "crude-dagger",
          dropRate: 0.4,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "COMMON",
          isGuaranteed: false,
        },
        {
          itemId: "small-mana-potion",
          dropRate: 0.25,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "COMMON",
          isGuaranteed: false,
        },
      ],
    },
    spawnLocations: ["goblin-camp", "forest-ruins", "abandoned-mine"],
    spawnConditions: {
      timeOfDay: "ANY",
      playerLevelRange: { min: 7, max: 18 },
    },
    visualInfo: {
      spriteId: "goblin-forest",
      size: "SMALL",
      colorVariant: "green",
      animationSet: "goblin-basic",
    },
  },

  // ========== 高級怪物 (16-25級) ==========

  "iron-golem": {
    id: "iron-golem",
    name: "鐵魔像",
    description: "古代遺跡的守護者，由魔法驅動的鐵製構造體",
    type: MonsterType.ELEMENTAL,
    tier: MonsterTier.STRONG,
    stats: {
      level: 20,
      health: 350,
      maxHealth: 350,
      mana: 100,
      maxMana: 100,
      physicalAttack: 65,
      magicalAttack: 25,
      physicalDefense: 45,
      magicalDefense: 30,
      speed: 0.6,
      criticalRate: 0.05,
      criticalDamage: 2.0,
      accuracy: 0.75,
      evasion: 0.05,
    },
    behavior: {
      aggroRange: 10.0,
      attackRange: 2.5,
      moveSpeed: 1.0,
      attackCooldown: 3.5,
      fleeThreshold: 0.0,
      isAggressive: true,
      canUseMagic: true,
      specialAbilities: ["IRON_FIST", "MAGIC_BARRIER", "REPAIR_SELF"],
    },
    resistances: {
      physicalResistance: 0.4,
      magicalResistance: 0.2,
      fireResistance: 0.3,
      waterResistance: -0.2,
      earthResistance: 0.5,
      airResistance: 0.1,
      criticalResistance: 0.3,
    },
    rewards: {
      baseExperience: 280,
      experienceRange: { min: 250, max: 320 },
      combatSkillExperience: 150,
      goldReward: { min: 45, max: 75 },
      drops: [
        {
          itemId: "iron-ingot",
          dropRate: 0.8,
          minQuantity: 2,
          maxQuantity: 4,
          quality: "UNCOMMON",
          isGuaranteed: false,
        },
        {
          itemId: "magic-crystal",
          dropRate: 0.3,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "RARE",
          isGuaranteed: false,
        },
        {
          itemId: "golem-core",
          dropRate: 0.1,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "RARE",
          isGuaranteed: false,
        },
      ],
      specialRewards: {
        reputationGain: 5,
        luckBonus: 0.5,
      },
    },
    spawnLocations: ["ancient-ruins", "magic-laboratory", "crystal-cave"],
    spawnConditions: {
      timeOfDay: "ANY",
      playerLevelRange: { min: 15, max: 30 },
    },
    visualInfo: {
      spriteId: "golem-iron",
      size: "LARGE",
      colorVariant: "metallic",
      animationSet: "golem-heavy",
    },
  },

  // ========== 精英怪物 (26-35級) ==========

  "shadow-assassin": {
    id: "shadow-assassin",
    name: "暗影刺客",
    description: "來自暗影位面的刺客，擅長潛行和致命一擊",
    type: MonsterType.HUMANOID,
    tier: MonsterTier.ELITE,
    stats: {
      level: 28,
      health: 280,
      maxHealth: 280,
      mana: 150,
      maxMana: 150,
      physicalAttack: 85,
      magicalAttack: 40,
      physicalDefense: 25,
      magicalDefense: 35,
      speed: 2.2,
      criticalRate: 0.35,
      criticalDamage: 2.5,
      accuracy: 0.92,
      evasion: 0.4,
    },
    behavior: {
      aggroRange: 12.0,
      attackRange: 1.8,
      moveSpeed: 4.0,
      attackCooldown: 1.5,
      fleeThreshold: 0.15,
      isAggressive: true,
      canUseMagic: true,
      specialAbilities: [
        "SHADOW_STEP",
        "BACKSTAB",
        "POISON_BLADE",
        "INVISIBILITY",
      ],
    },
    resistances: {
      physicalResistance: 0.1,
      magicalResistance: 0.3,
      fireResistance: -0.2,
      waterResistance: 0.0,
      earthResistance: 0.0,
      airResistance: 0.2,
      criticalResistance: 0.0,
    },
    rewards: {
      baseExperience: 450,
      experienceRange: { min: 400, max: 520 },
      combatSkillExperience: 240,
      goldReward: { min: 80, max: 125 },
      drops: [
        {
          itemId: "shadow-essence",
          dropRate: 0.7,
          minQuantity: 1,
          maxQuantity: 2,
          quality: "RARE",
          isGuaranteed: false,
        },
        {
          itemId: "assassin-blade",
          dropRate: 0.25,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "RARE",
          isGuaranteed: false,
        },
        {
          itemId: "stealth-cloak",
          dropRate: 0.15,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "EPIC",
          isGuaranteed: false,
        },
      ],
      specialRewards: {
        reputationGain: 10,
        luckBonus: 1.0,
        skillBooks: ["advanced-stealth"],
      },
    },
    spawnLocations: ["shadow-realm", "dark-alley", "assassin-hideout"],
    spawnConditions: {
      timeOfDay: "NIGHT",
      playerLevelRange: { min: 22, max: 40 },
    },
    visualInfo: {
      spriteId: "assassin-shadow",
      size: "MEDIUM",
      colorVariant: "black",
      animationSet: "assassin-stealth",
    },
  },

  // ========== 首領怪物 (36-50級) ==========

  "ancient-dragon": {
    id: "ancient-dragon",
    name: "遠古巨龍",
    description: "傳說中的遠古巨龍，擁有毀天滅地的力量",
    type: MonsterType.DRAGON,
    tier: MonsterTier.BOSS,
    stats: {
      level: 45,
      health: 2500,
      maxHealth: 2500,
      mana: 800,
      maxMana: 800,
      physicalAttack: 180,
      magicalAttack: 220,
      physicalDefense: 120,
      magicalDefense: 150,
      speed: 1.0,
      criticalRate: 0.25,
      criticalDamage: 3.0,
      accuracy: 0.85,
      evasion: 0.15,
    },
    behavior: {
      aggroRange: 25.0,
      attackRange: 8.0,
      moveSpeed: 2.5,
      attackCooldown: 4.0,
      fleeThreshold: 0.0,
      isAggressive: true,
      canUseMagic: true,
      specialAbilities: [
        "DRAGON_BREATH",
        "TAIL_SWEEP",
        "WING_STORM",
        "ANCIENT_MAGIC",
        "DRAGON_RAGE",
        "SCALE_ARMOR",
      ],
    },
    resistances: {
      physicalResistance: 0.5,
      magicalResistance: 0.4,
      fireResistance: 0.8,
      waterResistance: 0.2,
      earthResistance: 0.3,
      airResistance: 0.6,
      criticalResistance: 0.4,
    },
    rewards: {
      baseExperience: 2500,
      experienceRange: { min: 2200, max: 2800 },
      combatSkillExperience: 1200,
      goldReward: { min: 500, max: 800 },
      drops: [
        {
          itemId: "dragon-scale",
          dropRate: 1.0,
          minQuantity: 5,
          maxQuantity: 10,
          quality: "LEGENDARY",
          isGuaranteed: true,
        },
        {
          itemId: "dragon-heart",
          dropRate: 0.8,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "LEGENDARY",
          isGuaranteed: false,
        },
        {
          itemId: "ancient-weapon",
          dropRate: 0.3,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "LEGENDARY",
          isGuaranteed: false,
        },
        {
          itemId: "dragon-treasure-chest",
          dropRate: 1.0,
          minQuantity: 1,
          maxQuantity: 1,
          quality: "LEGENDARY",
          isGuaranteed: true,
        },
      ],
      specialRewards: {
        reputationGain: 50,
        luckBonus: 5.0,
        skillBooks: ["dragon-slayer", "ancient-magic"],
      },
    },
    spawnLocations: ["dragon-lair", "ancient-mountain"],
    spawnConditions: {
      timeOfDay: "ANY",
      playerLevelRange: { min: 35, max: 60 },
      specialEvents: ["dragon-awakening"],
    },
    visualInfo: {
      spriteId: "dragon-ancient",
      size: "GIANT",
      colorVariant: "gold",
      animationSet: "dragon-legendary",
    },
  },
};

// 輔助函數：根據等級獲取適合的怪物
export function getMonstersForLevel(playerLevel: number): MonsterDefinition[] {
  return Object.values(MONSTERS_DATABASE).filter((monster) => {
    const conditions = monster.spawnConditions;
    if (!conditions?.playerLevelRange) return true;

    return (
      playerLevel >= conditions.playerLevelRange.min &&
      playerLevel <= conditions.playerLevelRange.max
    );
  });
}

// 輔助函數：根據地點獲取怪物
export function getMonstersForLocation(location: string): MonsterDefinition[] {
  return Object.values(MONSTERS_DATABASE).filter((monster) =>
    monster.spawnLocations.includes(location),
  );
}

// 輔助函數：根據類型獲取怪物
export function getMonstersByType(type: MonsterType): MonsterDefinition[] {
  return Object.values(MONSTERS_DATABASE).filter(
    (monster) => monster.type === type,
  );
}

// 輔助函數：獲取指定等級區間的怪物
export function getMonstersByTier(tier: MonsterTier): MonsterDefinition[] {
  return Object.values(MONSTERS_DATABASE).filter(
    (monster) => monster.tier === tier,
  );
}
