import { Module, forwardRef } from "@nestjs/common";
import { DeliveryService } from "./delivery.service";
import { DeliveryController } from "./delivery.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { ItemsModule } from "../items/items.module";

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => ItemsModule),
  ],
  controllers: [DeliveryController],
  providers: [DeliveryService],
  exports: [DeliveryService],
})
export class DeliveryModule {}
