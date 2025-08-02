import { Module, forwardRef } from "@nestjs/common";
import { EquipmentService } from "./equipment.service";
import { EquipmentController } from "./equipment.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { ItemsModule } from "../items/items.module";
import { InventoryModule } from "../inventory/inventory.module";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ItemsModule),
    forwardRef(() => InventoryModule),
  ],
  controllers: [EquipmentController],
  providers: [EquipmentService],
  exports: [EquipmentService],
})
export class EquipmentModule {}
