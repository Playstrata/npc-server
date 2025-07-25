/**
 * 弓箭手射程計算系統測試範例
 * 
 * 這個文件展示了如何使用新實現的弓箭手射程計算系統
 * 包含各種場景的測試案例
 */

import { ProjectileSystem, ArcherAttackParams } from './projectile.system';
import { CharacterClass } from '../characters/character-classes.types';

// 模擬測試函數
export function testArcherRangeSystem() {
  const projectileSystem = new ProjectileSystem();

  console.log('=== 弓箭手射程計算系統測試 ===\n');

  // 測試案例 1: 基礎弓箭手，短弓，近距離目標
  const testCase1: ArcherAttackParams = {
    characterClass: CharacterClass.ARCHER,
    dexterity: 15,
    level: 10,
    weaponType: 'weapon-short-bow',
    weaponQuality: 'COMMON',
    attackerPosition: { x: 0, y: 0 },
    targetPosition: { x: 150, y: 0 } // 150像素距離
  };

  const result1 = projectileSystem.calculateArcherRange(testCase1);
  console.log('測試案例 1 - 基礎弓箭手 + 短弓:');
  console.log(`  最大射程: ${Math.round(result1.maxRange)} 像素`);
  console.log(`  有效射程: ${Math.round(result1.effectiveRange)} 像素`);
  console.log(`  目標距離: ${Math.round(result1.distance)} 像素`);
  console.log(`  是否在射程內: ${result1.isInRange ? '是' : '否'}`);
  console.log(`  射程分類: ${result1.rangeCategory}`);
  console.log(`  精準度修正: ${(result1.accuracyModifier * 100).toFixed(1)}%`);
  console.log(`  傷害修正: ${(result1.damageModifier * 100).toFixed(1)}%\n`);

  // 測試案例 2: 高級弓箭手，長弓，極限距離
  const testCase2: ArcherAttackParams = {
    characterClass: CharacterClass.ARCHER,
    dexterity: 25,
    level: 30,
    weaponType: 'weapon-long-bow',
    weaponQuality: 'RARE',
    attackerPosition: { x: 0, y: 0 },
    targetPosition: { x: 400, y: 0 } // 400像素距離
  };

  const result2 = projectileSystem.calculateArcherRange(testCase2);
  console.log('測試案例 2 - 高級弓箭手 + 長弓 + 稀有品質:');
  console.log(`  最大射程: ${Math.round(result2.maxRange)} 像素`);
  console.log(`  有效射程: ${Math.round(result2.effectiveRange)} 像素`);
  console.log(`  目標距離: ${Math.round(result2.distance)} 像素`);
  console.log(`  是否在射程內: ${result2.isInRange ? '是' : '否'}`);
  console.log(`  射程分類: ${result2.rangeCategory}`);
  console.log(`  精準度修正: ${(result2.accuracyModifier * 100).toFixed(1)}%`);
  console.log(`  傷害修正: ${(result2.damageModifier * 100).toFixed(1)}%\n`);

  // 測試案例 3: 非弓箭手職業使用投擲武器
  const testCase3: ArcherAttackParams = {
    characterClass: CharacterClass.ROGUE,
    dexterity: 18,
    level: 15,
    weaponType: 'weapon-throwing-knife',
    weaponQuality: 'UNCOMMON',
    attackerPosition: { x: 0, y: 0 },
    targetPosition: { x: 60, y: 0 } // 60像素距離
  };

  const result3 = projectileSystem.calculateArcherRange(testCase3);
  console.log('測試案例 3 - 盜賊 + 飛刀:');
  console.log(`  最大射程: ${Math.round(result3.maxRange)} 像素`);
  console.log(`  有效射程: ${Math.round(result3.effectiveRange)} 像素`);
  console.log(`  目標距離: ${Math.round(result3.distance)} 像素`);
  console.log(`  是否在射程內: ${result3.isInRange ? '是' : '否'}`);
  console.log(`  射程分類: ${result3.rangeCategory}`);
  console.log(`  精準度修正: ${(result3.accuracyModifier * 100).toFixed(1)}%`);
  console.log(`  傷害修正: ${(result3.damageModifier * 100).toFixed(1)}%\n`);

  // 測試案例 4: 創建實際的弓箭投射物
  console.log('測試案例 4 - 創建弓箭投射物:');
  const archerAttack = projectileSystem.createArcherProjectile(
    testCase1,
    50, // 基礎傷害
    'monster_001',
    'MONSTER'
  );

  if (archerAttack.projectile) {
    console.log(`  投射物ID: ${archerAttack.projectile.id}`);
    console.log(`  投射物類型: ${archerAttack.projectile.type}`);
    console.log(`  調整後傷害: ${archerAttack.projectile.damage}`);
    console.log(`  飛行速度: ${archerAttack.projectile.speed} 像素/秒`);
    console.log(`  預計生存時間: ${archerAttack.projectile.lifespan}ms`);
  } else {
    console.log(`  創建失敗: ${archerAttack.error}`);
  }

  // 測試射程信息獲取
  console.log('\n測試案例 5 - 獲取武器射程信息:');
  const rangeInfo = projectileSystem.getArcherRangeInfo(
    CharacterClass.ARCHER,
    20,
    25,
    'weapon-hunting-bow',
    'EPIC'
  );

  console.log(`  武器名稱: ${rangeInfo.weaponName}`);
  console.log(`  最大射程: ${rangeInfo.maxRange} 像素`);
  console.log(`  有效射程: ${rangeInfo.effectiveRange} 像素`);

  console.log('\n=== 測試完成 ===');
}

// 射程計算公式說明
export const ARCHER_RANGE_FORMULA_EXPLANATION = `
弓箭手射程計算公式:

最大射程 = 基礎射程 + (敏捷 × 敏捷倍數) + (等級 × 2) + 職業加成 + 品質加成

其中:
- 基礎射程: 根據武器類型決定 (短弓180, 獵弓220, 長弓280, 弩弓200)
- 敏捷倍數: 根據武器類型決定 (短弓2.5, 獵弓3.0, 長弓3.5, 弩弓2.0)
- 職業加成: 弓箭手獲得30-40%額外射程加成
- 品質加成: 品質越高射程越遠 (普通1.0x, 稀有1.25x, 史詩1.4x, 傳奇1.6x)

有效射程 = 最大射程 × 0.8

射程分類:
- CLOSE: ≤ 有效射程 × 0.3 (精準度+10%)
- EFFECTIVE: ≤ 有效射程 (正常精準度和傷害)
- LONG: ≤ 最大射程 × 0.9 (精準度和傷害開始衰減)
- EXTREME: ≤ 最大射程 (大幅衰減)
- OUT_OF_RANGE: > 最大射程 (無法攻擊)

敏捷度對射程的影響:
- 每點敏捷提供2.5-3.5像素射程加成(根據武器類型)
- 敏捷度也影響投射物精準度(減小碰撞框)
- 弓箭手職業獲得額外射程和傷害加成
`;

// 使用範例的API調用
export const API_USAGE_EXAMPLES = `
弓箭手射程系統 API 使用範例:

1. 執行弓箭手攻擊:
POST /combat/realtime/archer/attack
{
  "targetPosition": { "x": 200, "y": 150 },
  "weaponType": "weapon-short-bow",
  "weaponQuality": "COMMON",
  "targetId": "monster_123",
  "targetType": "MONSTER"
}

2. 檢查射程:
POST /combat/realtime/archer/range-check
{
  "targetPosition": { "x": 300, "y": 200 },
  "weaponType": "weapon-long-bow",
  "weaponQuality": "RARE"
}

3. 獲取武器射程信息:
GET /combat/realtime/archer/range-info/weapon-hunting-bow

4. 測試射程計算:
POST /combat/realtime/test/archer-range
{
  "characterClass": "ARCHER",
  "dexterity": 20,
  "level": 15,
  "weaponType": "weapon-short-bow",
  "distance": 250
}
`;