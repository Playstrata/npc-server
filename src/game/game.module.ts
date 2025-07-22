import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [GameGateway],
  exports: [GameGateway],
})
export class GameModule {}