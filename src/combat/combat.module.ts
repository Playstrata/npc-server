import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { SkillsModule } from "../skills/skills.module";
import { CharactersModule } from "../characters/characters.module";

// 舊的回合制戰鬥系統（保留向後兼容）
import { CombatService } from "./combat.service";
import { CombatEngine } from "./combat.engine";

// 新的即時戰鬥系統
import { RealtimeCombatEngine } from "./realtime-combat.engine";
import { ProjectileSystem } from "./projectile.system";
import { RealtimeCombatController } from "./realtime-combat.controller";

@Module({
  imports: [PrismaModule, SkillsModule, CharactersModule],
  controllers: [RealtimeCombatController],
  providers: [
    // 舊的回合制戰鬥系統
    CombatService,
    CombatEngine,

    // 新的即時戰鬥系統
    RealtimeCombatEngine,
    ProjectileSystem,
  ],
  exports: [
    // 導出服務供其他模組使用
    CombatService, // 回合制戰鬥（向後兼容）
    CombatEngine, // 回合制戰鬥引擎
    RealtimeCombatEngine, // 即時戰鬥引擎
    ProjectileSystem, // 投射物系統（包含弓箭手射程計算）
  ],
})
export class CombatModule {}
