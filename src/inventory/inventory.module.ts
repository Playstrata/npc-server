import { Module, forwardRef } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { InventoryController } from "./inventory.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { ItemsModule } from "../items/items.module";

@Module({
  imports: [PrismaModule, forwardRef(() => ItemsModule)],
  controllers: [InventoryController],
  providers: [InventoryService],
  exports: [InventoryService],
})
export class InventoryModule {}
