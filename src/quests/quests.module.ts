import { Module, forwardRef } from "@nestjs/common";
import { QuestsService } from "./quests.service";
import { QuestsController } from "./quests.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { NpcsModule } from "../npcs/npcs.module";

@Module({
  imports: [PrismaModule, forwardRef(() => NpcsModule)],
  controllers: [QuestsController],
  providers: [QuestsService],
  exports: [QuestsService],
})
export class QuestsModule {}
