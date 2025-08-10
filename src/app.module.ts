import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller";
import { AppService } from "./app.service";
import { PrismaModule } from "./prisma/prisma.module";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { QuestsModule } from "./quests/quests.module";
import { NpcsModule } from "./npcs/npcs.module";
import { ItemsModule } from "./items/items.module";
import { GameModule } from "./game/game.module";
import { DeliveryModule } from "./delivery/delivery.module";
import { AIModule } from "./ai/ai.module";

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

    // NPC 核心模組
    AuthModule,
    UsersModule,
    QuestsModule,
    NpcsModule,
    ItemsModule,
    GameModule,
    DeliveryModule,
    AIModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
