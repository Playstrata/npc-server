import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { CharactersModule } from './characters/characters.module';
import { QuestsModule } from './quests/quests.module';
import { NpcsModule } from './npcs/npcs.module';
import { ItemsModule } from './items/items.module';
import { GameModule } from './game/game.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    // 環境變數配置
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    
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
    ChatModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}