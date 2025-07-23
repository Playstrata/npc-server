import { Module } from '@nestjs/common';
import { StaminaService } from './stamina.service';
import { StaminaController } from './stamina.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [StaminaController],
  providers: [StaminaService],
  exports: [StaminaService],
})
export class StaminaModule {}