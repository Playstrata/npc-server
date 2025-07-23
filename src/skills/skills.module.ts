import { Module, forwardRef } from '@nestjs/common';
import { SkillsService } from './skills.service';
import { SkillsController } from './skills.controller';
import { GatheringService } from './gathering.service';
import { CraftingService } from './crafting.service';
import { SkillDecayService } from './skill-decay.service';
import { SkillActivitiesController } from './skill-activities.controller';
import { SkillDecayController } from './skill-decay.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { NpcsModule } from '../npcs/npcs.module';

@Module({
  imports: [PrismaModule, forwardRef(() => NpcsModule)],
  controllers: [SkillsController, SkillActivitiesController, SkillDecayController],
  providers: [SkillsService, GatheringService, CraftingService, SkillDecayService],
  exports: [SkillsService, GatheringService, CraftingService, SkillDecayService],
})
export class SkillsModule {}