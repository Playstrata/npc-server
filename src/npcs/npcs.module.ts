import { Module, forwardRef } from "@nestjs/common";
import { NpcsService } from "./npcs.service";
import { NpcsController } from "./npcs.controller";
import { ShopService } from "./shop.service";
import { ProfessionService } from "./profession.service";
import { DialogueService } from "./dialogue.service";
import { EnhancedDialogueService } from "./enhanced-dialogue.service";
import { EnhancedDialogueController } from "./enhanced-dialogue.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { QuestsModule } from "../quests/quests.module";
import { ItemsModule } from "../items/items.module";
import { AIModule } from "../ai/ai.module";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => QuestsModule),
    forwardRef(() => ItemsModule),
    AIModule,
  ],
  controllers: [NpcsController, EnhancedDialogueController],
  providers: [
    NpcsService,
    ShopService,
    ProfessionService,
    DialogueService,
    EnhancedDialogueService,
  ],
  exports: [
    NpcsService,
    ShopService,
    ProfessionService,
    DialogueService,
    EnhancedDialogueService,
  ],
})
export class NpcsModule {}
