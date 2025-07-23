import { Module, forwardRef } from '@nestjs/common';
import { CharactersController } from './characters.controller';
import { CharactersService } from './characters.service';
import { MagicalStorageService } from './magical-storage.service';
import { MagicalStorageController } from './magical-storage.controller';
import { JobChangeService } from './job-change.service';
import { JobChangeController } from './job-change.controller';
import { ItemsModule } from '../items/items.module';
import { SkillsModule } from '../skills/skills.module';

@Module({
  imports: [
    forwardRef(() => ItemsModule),
    forwardRef(() => SkillsModule)
  ],
  controllers: [CharactersController, MagicalStorageController, JobChangeController],
  providers: [CharactersService, MagicalStorageService, JobChangeService],
  exports: [CharactersService, MagicalStorageService, JobChangeService],
})
export class CharactersModule {}