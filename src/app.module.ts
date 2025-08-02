import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { CharactersModule } from "./characters/characters.module";
import { QuestsModule } from "./quests/quests.module";
import { NpcsModule } from "./npcs/npcs.module";
import { ItemsModule } from "./items/items.module";
import { GameModule } from "./game/game.module";
// ChatModule moved to social-server
// import { ChatModule } from "./chat/chat.module";
import { SkillsModule } from "./skills/skills.module";
import { InventoryModule } from "./inventory/inventory.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { StaminaModule } from "./stamina/stamina.module";
import { EquipmentModule } from "./equipment/equipment.module";
import { CombatModule } from "./combat/combat.module";

@Module({
  imports: [
    // 環境變數配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ".env",
    }),

    // 定時任務模組
    ScheduleModule.forRoot(),

    // 資料庫連接
    PrismaModule,

    // 業務模組
    AuthModule,
    UsersModule,
    CharactersModule,
    QuestsModule,
    NpcsModule,
    ItemsModule,
    GameModule,
    // ChatModule, // Moved to social-server
    SkillsModule,
    InventoryModule,
    DeliveryModule,
    StaminaModule,
    EquipmentModule,
    CombatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
